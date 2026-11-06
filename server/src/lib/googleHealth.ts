import crypto from 'node:crypto';
import { config } from '../config';
import { STEPS } from '../../../shared/patientLogs';

/**
 * Google Health is the steps source a web app can actually call in 2026.
 * Fitbit's own web API is turned off; Apple Health and Health Connect have no browser API.
 * A Fitbit, Pixel Watch or phone that shows steps in Google Health syncs through this OAuth.
 * What is not wired: a native HealthKit or Health Connect bridge, Strava, and Garmin.
 */
export const HEALTH_SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const IDENTITY_URL = 'https://health.googleapis.com/v4/users/me/identity';
const DAILY_URL = 'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp';

export type HealthFetch = (url: string, init?: RequestInit) => Promise<Response>;

const env = (k: string) => process.env[k]?.trim() ?? '';

export const healthClientId = () => env('GOOGLE_HEALTH_CLIENT_ID') || env('GOOGLE_CLIENT_ID');
export const healthClientSecret = () => env('GOOGLE_HEALTH_CLIENT_SECRET') || env('GOOGLE_CLIENT_SECRET');
export const healthConfigured = () => !!(healthClientId() && healthClientSecret());
export const healthRedirectUri = () => `${config.appOrigin}/api/patient/logs/steps/google/callback`;

export function tokenKey(): Buffer {
  const raw = env('FITNESS_TOKEN_KEY');
  if (raw) {
    const buf = Buffer.from(raw, 'base64url');
    if (buf.length !== 32) throw new Error('FITNESS_TOKEN_KEY must be 32 bytes of base64url');
    return buf;
  }
  if (config.isProd) throw new Error('FITNESS_TOKEN_KEY is required in production');
  return crypto.createHash('sha256').update('fp-dev-fitness-token-key').digest();
}

export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}

export function openSeal(payload: string): string {
  const buf = Buffer.from(payload, 'base64url');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', tokenKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

export function pkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function authorizeUrl(state: string, challenge: string) {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: healthClientId(),
    redirect_uri: healthRedirectUri(),
    scope: HEALTH_SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
  });
  return `${AUTH_URL}?${q}`;
}

export type HealthTokens = { accessToken: string; refreshToken: string | null; expiresAt: Date; scope: string };

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function exchangeCode(code: string, verifier: string, fetchImpl: HealthFetch = fetch): Promise<HealthTokens> {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: healthClientId(),
      client_secret: healthClientSecret(),
      redirect_uri: healthRedirectUri(),
    }),
  });
  const body = await readJson(res);
  if (!res.ok || !body.access_token) throw new Error('health_token_exchange_failed');
  return {
    accessToken: String(body.access_token),
    refreshToken: body.refresh_token ? String(body.refresh_token) : null,
    expiresAt: new Date(Date.now() + Number(body.expires_in ?? 3600) * 1000),
    scope: String(body.scope ?? HEALTH_SCOPE),
  };
}

export async function refreshAccess(refreshToken: string, fetchImpl: HealthFetch = fetch): Promise<HealthTokens> {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: healthClientId(),
      client_secret: healthClientSecret(),
    }),
  });
  const body = await readJson(res);
  if (!res.ok || !body.access_token) throw new Error('health_refresh_failed');
  return {
    accessToken: String(body.access_token),
    refreshToken: body.refresh_token ? String(body.refresh_token) : refreshToken,
    expiresAt: new Date(Date.now() + Number(body.expires_in ?? 3600) * 1000),
    scope: String(body.scope ?? HEALTH_SCOPE),
  };
}

export async function revokeToken(token: string, fetchImpl: HealthFetch = fetch) {
  await fetchImpl(REVOKE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}

export type IdentityResult = { healthUserId: string } | { notLinked: true; linkUrl: string | null };

export async function readIdentity(accessToken: string, fetchImpl: HealthFetch = fetch): Promise<IdentityResult> {
  const res = await fetchImpl(IDENTITY_URL, { headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' } });
  const body = await readJson(res);
  if (res.ok && body.healthUserId) return { healthUserId: String(body.healthUserId) };
  const reason = body?.error?.details?.find?.((d: { reason?: string }) => d.reason)?.reason;
  if (res.status === 400 && reason === 'ACCOUNT_NOT_LINKED') {
    const link = body?.error?.details?.find?.((d: { metadata?: { redirect_uri?: string } }) => d.metadata?.redirect_uri)?.metadata?.redirect_uri ?? null;
    return { notLinked: true, linkUrl: link };
  }
  throw new Error('health_identity_failed');
}

type Civil = { date?: { year?: number; month?: number; day?: number } };

export function parseDailyRollup(body: unknown): { day: string; steps: number }[] {
  const points = (body as { rollupDataPoints?: unknown })?.rollupDataPoints;
  if (!Array.isArray(points)) return [];
  const out: { day: string; steps: number }[] = [];
  for (const p of points) {
    const date = (p as { civilStartTime?: Civil })?.civilStartTime?.date;
    const raw = (p as { steps?: { countSum?: string | number } })?.steps?.countSum;
    if (!date?.year || !date.month || !date.day) continue;
    const steps = Math.round(Number(raw));
    if (!Number.isFinite(steps) || steps < 0 || steps > STEPS.maxSteps) continue;
    const day = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
    out.push({ day, steps });
  }
  return out;
}

/** Closed-open civil range covering `days` calendar days ending today (inclusive). */
export function rollupBody(today: string, days: number) {
  const [y, m, d] = today.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  start.setDate(start.getDate() - (days - 1));
  const end = new Date(y, m - 1, d);
  end.setDate(end.getDate() + 1);
  const civil = (dt: Date, endOfDay = false) => ({
    date: { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() },
    time: endOfDay ? { hours: 0, minutes: 0, seconds: 0, nanos: 0 } : { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
  });
  return { range: { start: civil(start), end: civil(end) }, windowSizeDays: 1 };
}

export async function fetchDailySteps(accessToken: string, today: string, fetchImpl: HealthFetch = fetch) {
  const res = await fetchImpl(DAILY_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(rollupBody(today, STEPS.syncDays)),
  });
  const body = await readJson(res);
  if (res.status === 401) throw new Error('health_unauthorized');
  if (!res.ok) throw new Error('health_steps_failed');
  return parseDailyRollup(body);
}
