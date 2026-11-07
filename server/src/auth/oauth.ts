import crypto from 'node:crypto';
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { authPool } from '../db';
import { config } from '../config';
import { randomToken, sha256 } from '../lib/crypto';
import { HttpError, badRequest } from '../lib/errors';
import { authAudit, createSession, issueToken } from './service';

/**
 * Log in with Google or Apple (OpenID Connect, authorization-code flow).
 * - state (single use, stored hashed) + a cookie bound to this browser: no login CSRF.
 * - nonce in the ID token, and PKCE for Google.
 * - The ID token is verified against the provider's published keys (issuer, audience, expiry).
 * - Only e-mail addresses the provider has verified are used.
 * - An existing account is never taken over by e-mail alone: linking happens from the account page,
 *   while logged in.
 * A provider is only offered when its keys are configured (see docs/LOGIN_METHODS.md).
 */
export type Provider = 'google' | 'apple';
export type Intent = 'login' | 'signup' | 'link';
export type Claims = { sub: string; email: string | null; emailVerified: boolean; name: string | null };

type ProviderDef = {
  issuer: string[];
  authorizeUrl: string;
  tokenUrl: string;
  keys: () => JWTVerifyGetKey;
  clientId: () => string;
  clientSecret: () => Promise<string>;
  configured: () => boolean;
  scope: string;
  pkce: boolean;
  formPost: boolean;
};

const env = (k: string) => process.env[k]?.trim() ?? '';
const remote = new Map<string, JWTVerifyGetKey>();
const jwks = (url: string) => () => {
  if (!remote.has(url)) remote.set(url, createRemoteJWKSet(new URL(url)));
  return remote.get(url)!;
};

const PROVIDERS: Record<Provider, ProviderDef> = {
  google: {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    keys: jwks('https://www.googleapis.com/oauth2/v3/certs'),
    clientId: () => env('GOOGLE_CLIENT_ID'),
    clientSecret: async () => env('GOOGLE_CLIENT_SECRET'),
    configured: () => !!env('GOOGLE_CLIENT_ID') && !!env('GOOGLE_CLIENT_SECRET'),
    scope: 'openid email profile',
    pkce: true,
    formPost: false,
  },
  apple: {
    issuer: ['https://appleid.apple.com'],
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    keys: jwks('https://appleid.apple.com/auth/keys'),
    clientId: () => env('APPLE_CLIENT_ID'),
    // Apple's client secret is a short-lived JWT signed with the private key from the developer account.
    clientSecret: async () => {
      const key = await importPKCS8(env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n'), 'ES256');
      return new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: env('APPLE_KEY_ID') })
        .setIssuer(env('APPLE_TEAM_ID'))
        .setSubject(env('APPLE_CLIENT_ID'))
        .setAudience('https://appleid.apple.com')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(key);
    },
    configured: () => ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'].every((k) => !!env(k)),
    scope: 'name email',
    pkce: false,
    formPost: true,
  },
};

/** Test seam: replace the network parts (token endpoint, keys) of a provider. */
export const oauthTestHooks: { exchange?: (p: Provider, code: string, verifier: string | null) => Promise<string>; keys?: JWTVerifyGetKey; configured?: Provider[] } = {};

export const providerConfigured = (p: Provider) => oauthTestHooks.configured?.includes(p) ?? PROVIDERS[p].configured();
export const configuredProviders = () => (['google', 'apple'] as const).filter(providerConfigured);
export const isProvider = (p: string): p is Provider => p === 'google' || p === 'apple';
export const redirectUri = (p: Provider) => `${config.appOrigin}/api/auth/oauth/${p}/callback`;

const b64url = (b: Buffer) => b.toString('base64url');

/** Step 1: where to send the browser. Returns the URL and the value for the browser-binding cookie. */
export async function startOAuth(p: Provider, opts: { intent: Intent; kind?: 'coach' | 'personal'; userId?: string; next?: string | null }) {
  if (!providerConfigured(p)) throw new HttpError(404, 'provider_not_configured');
  const def = PROVIDERS[p];
  const state = randomToken();
  const nonce = randomToken();
  const browser = randomToken();
  const verifier = def.pkce ? randomToken(48) : null;
  await authPool.query(
    `INSERT INTO auth_challenges(purpose, key_hash, user_id, data, expires_at) VALUES ('oauth', $1, $2, $3, now() + interval '10 minutes')`,
    [sha256(state), opts.userId ?? null, { provider: p, nonce, verifier, intent: opts.intent, kind: opts.kind ?? null, next: opts.next ?? null, browser: sha256(browser) }],
  );
  const u = new URL(def.authorizeUrl);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', def.clientId() || 'test-client');
  u.searchParams.set('redirect_uri', redirectUri(p));
  u.searchParams.set('scope', def.scope);
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  if (def.formPost) u.searchParams.set('response_mode', 'form_post');
  if (p === 'google') u.searchParams.set('prompt', 'select_account');
  if (verifier) {
    u.searchParams.set('code_challenge', b64url(crypto.createHash('sha256').update(verifier).digest()));
    u.searchParams.set('code_challenge_method', 'S256');
  }
  return { url: u.toString(), browser };
}

async function exchangeCode(p: Provider, code: string, verifier: string | null): Promise<string> {
  if (oauthTestHooks.exchange) return oauthTestHooks.exchange(p, code, verifier);
  const def = PROVIDERS[p];
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(p), client_id: def.clientId(), client_secret: await def.clientSecret() });
  if (verifier) body.set('code_verifier', verifier);
  const res = await fetch(def.tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body });
  if (!res.ok) throw new HttpError(400, 'social_login_failed');
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new HttpError(400, 'social_login_failed');
  return json.id_token;
}

export async function verifyIdToken(p: Provider, idToken: string, nonce: string): Promise<Claims> {
  const def = PROVIDERS[p];
  try {
    const { payload } = await jwtVerify(idToken, oauthTestHooks.keys ?? def.keys(), {
      issuer: def.issuer,
      audience: def.clientId() || 'test-client',
      clockTolerance: 60,
    });
    if (payload.nonce !== nonce) throw new Error('nonce');
    const verified = payload.email_verified === true || payload.email_verified === 'true';
    return {
      sub: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      emailVerified: verified,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  } catch {
    throw new HttpError(400, 'social_login_failed');
  }
}

export type CallbackResult =
  | { kind: 'session'; token: string; userId: string; isNew: boolean; next: string | null }
  | { kind: 'mfa'; mfaToken: string }
  | { kind: 'linked'; userId: string };

/**
 * Step 2: the provider sent the browser back. Verifies everything and decides: log in, create the
 * account (sign-up), or link to the logged-in user.
 */
export async function finishOAuth(
  p: Provider,
  q: { state: string; code: string; browser: string | undefined; appleUser?: string | null; userAgent?: string; createAccount: (claims: Claims, kind: 'coach' | 'personal') => Promise<string> },
): Promise<CallbackResult> {
  const row = (
    await authPool.query(
      `DELETE FROM auth_challenges WHERE key_hash = $1 AND purpose = 'oauth' AND expires_at > now() RETURNING user_id, data`,
      [sha256(q.state)],
    )
  ).rows[0];
  if (!row || row.data.provider !== p) throw badRequest('social_login_expired');
  if (!q.browser || sha256(q.browser) !== row.data.browser) throw badRequest('social_login_expired');
  const claims = await verifyIdToken(p, await exchangeCode(p, q.code, row.data.verifier), row.data.nonce);
  // Apple sends the name only once, as form data next to the code.
  if (!claims.name && q.appleUser) {
    try {
      const n = JSON.parse(q.appleUser)?.name;
      claims.name = [n?.firstName, n?.lastName].filter(Boolean).join(' ').trim() || null;
    } catch {
      /* ignore */
    }
  }
  const intent = row.data.intent as Intent;
  const existing = (
    await authPool.query(
      `SELECT i.user_id, u.disabled_at, u.mfa_enabled, u.locked_until FROM user_identities i JOIN users u ON u.id = i.user_id WHERE i.provider = $1 AND i.subject = $2`,
      [p, claims.sub],
    )
  ).rows[0];

  if (intent === 'link') {
    if (!row.user_id) throw badRequest('social_login_expired');
    if (existing && existing.user_id !== row.user_id) throw new HttpError(409, 'social_in_use');
    if (!existing) {
      try {
        await authPool.query('INSERT INTO user_identities(user_id, provider, subject, email) VALUES ($1,$2,$3,$4)', [row.user_id, p, claims.sub, claims.email]);
      } catch (e) {
        if ((e as { code?: string }).code === '23505') throw new HttpError(409, 'social_already_linked');
        throw e;
      }
    }
    await authAudit(row.user_id, 'identity_linked', { provider: p });
    return { kind: 'linked', userId: row.user_id };
  }

  let userId: string | null = existing?.user_id ?? null;
  let isNew = false;
  if (existing) {
    if (existing.disabled_at) throw new HttpError(401, 'invalid_credentials');
    if (existing.locked_until && new Date(existing.locked_until) > new Date()) throw new HttpError(429, 'account_locked');
  } else {
    if (!claims.email || !claims.emailVerified) throw badRequest('social_email_unverified');
    const taken = (await authPool.query('SELECT 1 FROM users WHERE email = $1', [claims.email])).rowCount;
    // Never take over an existing account by e-mail: the owner links it themselves (Account page).
    if (taken) throw new HttpError(409, 'social_link_required');
    if (intent !== 'signup' || !row.data.kind) throw new HttpError(404, 'social_no_account');
    userId = await q.createAccount(claims, row.data.kind);
    await authPool.query('INSERT INTO user_identities(user_id, provider, subject, email) VALUES ($1,$2,$3,$4)', [userId, p, claims.sub, claims.email]);
    isNew = true;
  }
  await authPool.query('UPDATE user_identities SET last_used_at = now() WHERE provider = $1 AND subject = $2', [p, claims.sub]);
  if (existing?.mfa_enabled) return { kind: 'mfa', mfaToken: await issueToken(userId!, 'mfa_login', 0, 10) };
  const token = await createSession(userId!, q.userAgent);
  await authAudit(userId!, 'login', { method: p });
  return { kind: 'session', token, userId: userId!, isNew, next: row.data.next ?? null };
}

/** Removing a login method must never lock someone out. */
export async function unlinkIdentity(userId: string, p: Provider) {
  const u = (
    await authPool.query(
      `SELECT password_hash IS NOT NULL AS has_pw,
              (SELECT count(*) FROM user_identities WHERE user_id = $1)::int AS ids,
              (SELECT count(*) FROM webauthn_credentials WHERE user_id = $1)::int AS keys
         FROM users WHERE id = $1`,
      [userId],
    )
  ).rows[0];
  if (!u.has_pw && u.ids + u.keys <= 1) throw new HttpError(409, 'last_login_method');
  const r = await authPool.query('DELETE FROM user_identities WHERE user_id = $1 AND provider = $2', [userId, p]);
  if (!r.rowCount) throw new HttpError(404, 'not_found');
  await authAudit(userId, 'identity_unlinked', { provider: p });
}

export async function listIdentities(userId: string) {
  return (await authPool.query('SELECT provider, email, created_at, last_used_at FROM user_identities WHERE user_id = $1 ORDER BY provider', [userId])).rows.map((r) => ({
    provider: r.provider as Provider,
    email: r.email as string | null,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
}
