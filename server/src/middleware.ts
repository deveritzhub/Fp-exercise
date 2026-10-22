import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { config } from './config';
import { resolveSession, type SessionUser } from './auth/service';
import { HttpError } from './lib/errors';
import { hit } from './lib/rateLimit';

export const SESSION_COOKIE = 'fp_session';

export type AppEnv = {
  Variables: {
    user: SessionUser | null;
    token: string | null;
  };
};

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE) ?? null;
  c.set('token', token);
  c.set('user', token ? await resolveSession(token) : null);
  await next();
};

/**
 * CSRF defence: session cookie is SameSite=Lax, and every state-changing request must carry the
 * custom header `X-Requested-With: fp` (cannot be sent cross-site without a CORS preflight, which
 * this API never approves) and, when present, an Origin equal to APP_ORIGIN.
 */
export const csrfMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('origin');
    if (origin && origin !== config.appOrigin && origin !== new URL(c.req.url).origin) {
      throw new HttpError(403, 'bad_origin');
    }
    if (c.req.header('x-requested-with') !== 'fp') throw new HttpError(403, 'csrf');
  }
  await next();
};

export function clientIp(c: Context) {
  // Only trust X-Forwarded-For behind a known proxy (set TRUST_PROXY=1 in that case).
  if (process.env.TRUST_PROXY === '1') {
    const xff = c.req.header('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
  }
  const info = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return info?.socket?.remoteAddress ?? 'unknown';
}

export const rateLimit =
  (name: string, limit: number, windowMs: number): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    if (process.env.DISABLE_RATE_LIMIT === '1') return next();
    const r = hit(`${name}:${clientIp(c)}`, limit, windowMs);
    if (!r.ok) {
      c.header('Retry-After', String(r.retryAfter));
      throw new HttpError(429, 'rate_limited');
    }
    await next();
  };

export function requireUser(c: Context<AppEnv>): SessionUser {
  const u = c.get('user');
  if (!u) throw new HttpError(401, 'unauthenticated');
  return u;
}

/** Resolves the practice the professional is acting in (X-Practice-Id header or first membership). */
export function requireStaff(c: Context<AppEnv>, roles?: Array<'owner' | 'admin' | 'therapist'>) {
  const user = requireUser(c);
  const wanted = c.req.header('x-practice-id');
  const m = wanted ? user.memberships.find((x) => x.practiceId === wanted) : user.memberships[0];
  if (!m) throw new HttpError(403, 'forbidden');
  if (roles && !roles.includes(m.role)) throw new HttpError(403, 'forbidden');
  return { user, practiceId: m.practiceId, role: m.role, practiceName: m.practiceName };
}

export function requirePatient(c: Context<AppEnv>) {
  const user = requireUser(c);
  if (!user.patient) throw new HttpError(403, 'forbidden');
  return { user, patient: user.patient };
}

export function requirePlatformAdmin(c: Context<AppEnv>) {
  const user = requireUser(c);
  if (!user.isPlatformAdmin) throw new HttpError(403, 'forbidden');
  return user;
}
