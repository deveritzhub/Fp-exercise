import { demoSettings, isDemoEmail } from '../lib/demo';
import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { z } from 'zod';
import { config } from '../config';
import * as auth from '../auth/service';
import * as mfa from '../auth/mfa';
import * as oauth from '../auth/oauth';
import * as passkeys from '../auth/passkeys';
import { authPool } from '../db';
import { rateLimit, requireUser, SESSION_COOKIE, type AppEnv } from '../middleware';
import { parse } from '../lib/validate';
import { HttpError, notFound } from '../lib/errors';
import { provisionSelfAccount, selfSignupKinds } from '../lib/signup';

export const authRoutes = new Hono<AppEnv>();

function setSession(c: Context<AppEnv>, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: config.sessionTtlHours * 3600,
  });
}

const minute = 60_000;

authRoutes.post('/login', rateLimit('login', 10, 15 * minute), async (c) => {
  const b = parse(z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) }), await c.req.json());
  // Demo accounts switched off on this environment (DEMO_ACCOUNTS=off).
  if (isDemoEmail(b.email) && !demoSettings().enabled) throw new HttpError(403, 'demo_disabled');
  const r = await auth.login(b.email, b.password, c.req.header('user-agent'));
  if ('mfaToken' in r) return c.json({ mfaRequired: true, mfaToken: r.mfaToken });
  setSession(c, r.token);
  return c.json({ user: await auth.loadUser(r.userId) });
});

const code = z.string().trim().min(6).max(20);

authRoutes.post('/login/mfa', rateLimit('login-mfa', 10, 15 * minute), async (c) => {
  const b = parse(z.object({ mfaToken: z.string().min(20).max(100), code }), await c.req.json());
  const r = await mfa.loginWithCode(b.mfaToken, b.code, c.req.header('user-agent'));
  setSession(c, r.token);
  return c.json({ user: await auth.loadUser(r.userId), recoveryCodesLeft: r.recoveryCodesLeft });
});

authRoutes.post('/mfa/setup', rateLimit('mfa-setup', 10, 15 * minute), async (c) => {
  const user = requireUser(c);
  return c.json(await mfa.startSetup(user.id));
});

authRoutes.post('/mfa/enable', rateLimit('mfa-enable', 10, 15 * minute), async (c) => {
  const user = requireUser(c);
  const b = parse(z.object({ code }), await c.req.json());
  return c.json({ recoveryCodes: await mfa.enable(user.id, b.code) });
});

authRoutes.post('/mfa/disable', rateLimit('mfa-disable', 10, 15 * minute), async (c) => {
  const user = requireUser(c);
  const b = parse(z.object({ password: z.string().max(200), code }), await c.req.json());
  await mfa.disable(user.id, b.password, b.code, c.get('token'));
  return c.json({ ok: true });
});

authRoutes.get('/mfa/status', async (c) => {
  const user = requireUser(c);
  return c.json({ enabled: user.mfaEnabled, recoveryCodesLeft: user.mfaEnabled ? await mfa.recoveryCodesLeft(user.id) : 0 });
});

authRoutes.post('/mfa/recovery-codes', rateLimit('mfa-codes', 10, 15 * minute), async (c) => {
  const user = requireUser(c);
  const b = parse(z.object({ code }), await c.req.json());
  return c.json({ recoveryCodes: await mfa.regenerateRecoveryCodes(user.id, b.code) });
});

authRoutes.post('/logout', async (c) => {
  const token = c.get('token');
  if (token) await auth.logout(token);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

authRoutes.get('/me', (c) => c.json({ user: c.get('user') }));

authRoutes.post('/password/forgot', rateLimit('forgot', 5, 15 * minute), async (c) => {
  const b = parse(z.object({ email: z.string().trim().email().max(254) }), await c.req.json());
  await auth.requestPasswordReset(b.email);
  return c.json({ ok: true });
});

authRoutes.post('/password/reset', rateLimit('reset', 10, 15 * minute), async (c) => {
  const b = parse(z.object({ token: z.string().min(20).max(100), password: z.string().max(200) }), await c.req.json());
  await auth.resetPassword(b.token, b.password);
  return c.json({ ok: true });
});

authRoutes.post('/password/change', rateLimit('change', 10, 15 * minute), async (c) => {
  const user = requireUser(c);
  const b = parse(z.object({ current: z.string().max(200), next: z.string().max(200) }), await c.req.json());
  await auth.changePassword(user.id, b.current, b.next);
  return c.json({ ok: true });
});

authRoutes.post('/verify-email', rateLimit('verify', 20, 15 * minute), async (c) => {
  const b = parse(z.object({ token: z.string().min(20).max(100) }), await c.req.json());
  await auth.verifyEmail(b.token);
  return c.json({ ok: true });
});

authRoutes.post('/verify-email/resend', rateLimit('verify-resend', 3, 15 * minute), async (c) => {
  const user = requireUser(c);
  await auth.sendVerification(user.id);
  return c.json({ ok: true });
});

authRoutes.get('/invite/:token', rateLimit('invite', 30, 15 * minute), async (c) => {
  const inv = await auth.getInvite(c.req.param('token'));
  if (!inv) throw notFound('invalid_token');
  return c.json(inv);
});

authRoutes.post('/invite/accept', rateLimit('invite-accept', 10, 15 * minute), async (c) => {
  const b = parse(z.object({ token: z.string().min(20).max(100), password: z.string().max(200).optional() }), await c.req.json());
  const r = await auth.acceptInvite(b.token, b.password, c.req.header('user-agent'));
  if ('mfaToken' in r) return c.json({ mfaRequired: true, mfaToken: r.mfaToken });
  setSession(c, r.token);
  return c.json({ user: await auth.loadUser(r.userId) });
});

/** Which sign-up and login options this server offers (the login and sign-up pages adapt to it). */
authRoutes.get('/options', (c) =>
  c.json({ signup: selfSignupKinds(), google: oauth.providerConfigured('google'), apple: oauth.providerConfigured('apple'), passkeys: true }),
);

/** Self-signup for a personal trainer (coach) or someone training for themselves. */
authRoutes.post('/signup', rateLimit('signup', 5, 60 * minute), async (c) => {
  const b = parse(
    z.object({
      kind: z.enum(['coach', 'personal']),
      fullName: z.string().trim().min(2).max(160),
      businessName: z.string().trim().min(2).max(160).optional(),
      email: z.string().trim().email().max(254),
      password: z.string().max(200),
      locale: z.enum(['nl', 'en']).default('nl'),
      acceptTerms: z.literal(true),
    }),
    await c.req.json(),
  );
  if (!selfSignupKinds().includes(b.kind)) throw new HttpError(403, 'signup_closed');
  const userId = await auth.createPasswordUser({ email: b.email, password: b.password, fullName: b.fullName, locale: b.locale });
  await provisionSelfAccount(userId, b.kind, { fullName: b.fullName, businessName: b.businessName });
  await auth.sendVerification(userId);
  await auth.authAudit(userId, 'signup', { kind: b.kind });
  const token = await auth.createSession(userId, c.req.header('user-agent'));
  setSession(c, token);
  return c.json({ user: await auth.loadUser(userId) }, 201);
});

// ---------------------------------------------------------------------------------------------
// Google and Apple
// ---------------------------------------------------------------------------------------------

const OAUTH_COOKIE = 'fp_oauth';
const safePath = (p: string | null | undefined) => (p && p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') ? p : null);

authRoutes.get('/oauth/:provider/start', rateLimit('oauth-start', 30, 15 * minute), async (c) => {
  const p = c.req.param('provider');
  if (!oauth.isProvider(p)) throw notFound();
  const intent = parse(z.enum(['login', 'signup', 'link']).default('login'), c.req.query('intent') ?? undefined);
  const kind = intent === 'signup' ? parse(z.enum(['coach', 'personal']), c.req.query('kind')) : undefined;
  if (kind && !selfSignupKinds().includes(kind)) throw new HttpError(403, 'signup_closed');
  const user = c.get('user');
  if (intent === 'link' && !user) throw new HttpError(401, 'unauthenticated');
  const { url, browser } = await oauth.startOAuth(p, { intent, kind, userId: intent === 'link' ? user!.id : undefined, next: safePath(c.req.query('next')) });
  // Binds the login to this browser. Apple returns with a cross-site POST, which needs SameSite=None.
  setCookie(c, OAUTH_COOKIE, browser, { httpOnly: true, secure: config.isProd, sameSite: config.isProd ? 'None' : 'Lax', path: '/api/auth/oauth', maxAge: 600 });
  return c.redirect(url, 302);
});

async function oauthCallback(c: Context<AppEnv>, p: oauth.Provider, f: Record<string, string | undefined>) {
  const browser = getCookie(c, OAUTH_COOKIE);
  deleteCookie(c, OAUTH_COOKIE, { path: '/api/auth/oauth' });
  const accountPath = async (userId: string) => ((await auth.loadUser(userId))?.memberships.length ? '/app/account' : '/p/account');
  const linking = !!c.get('user');
  const fail = async (code: string) =>
    c.redirect(linking ? `${await accountPath(c.get('user')!.id)}?fout=${encodeURIComponent(code)}` : `/login?fout=${encodeURIComponent(code)}`, 302);
  if (f.error || !f.state || !f.code) return fail(f.error === 'access_denied' || f.error === 'user_cancelled_authorize' ? 'social_cancelled' : 'social_login_failed');
  try {
    const r = await oauth.finishOAuth(p, {
      state: f.state,
      code: f.code,
      browser,
      appleUser: f.user ?? null,
      userAgent: c.req.header('user-agent'),
      createAccount: async (claims, kind) => {
        const fullName = (claims.name || claims.email!.split('@')[0]).slice(0, 160);
        const id = (
          await authPool.query(
            'INSERT INTO users(email, full_name, locale, email_verified_at) VALUES ($1,$2,$3, now()) RETURNING id',
            [claims.email, fullName, 'nl'],
          )
        ).rows[0].id as string;
        await provisionSelfAccount(id, kind, { fullName });
        await auth.authAudit(id, 'signup', { kind, method: p });
        return id;
      },
    });
    if (r.kind === 'linked') return c.redirect(`${await accountPath(r.userId)}?gekoppeld=${p}`, 302);
    if (r.kind === 'mfa') return c.redirect(`/login#mfa=${encodeURIComponent(r.mfaToken)}`, 302);
    setSession(c, r.token);
    const u = await auth.loadUser(r.userId);
    const home = r.isNew && u?.patient ? '/p/held/nieuw' : u?.memberships.length ? '/app' : u?.patient ? '/p' : '/login';
    return c.redirect(safePath(r.next) ?? home, 302);
  } catch (e) {
    return fail(e instanceof HttpError ? e.code : 'social_login_failed');
  }
}

authRoutes.get('/oauth/:provider/callback', async (c) => {
  const p = c.req.param('provider');
  if (!oauth.isProvider(p)) throw notFound();
  return oauthCallback(c, p, c.req.query());
});

// Apple returns with response_mode=form_post.
authRoutes.post('/oauth/:provider/callback', async (c) => {
  const p = c.req.param('provider');
  if (!oauth.isProvider(p)) throw notFound();
  const form = await c.req.parseBody();
  const f = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v : undefined]));
  return oauthCallback(c, p, f);
});

// ---------------------------------------------------------------------------------------------
// Passkeys
// ---------------------------------------------------------------------------------------------

const webauthnResponse = z.object({ id: z.string().min(1).max(1400), rawId: z.string().max(1400), type: z.literal('public-key'), response: z.record(z.string(), z.unknown()) }).passthrough();

authRoutes.post('/passkeys/login/options', rateLimit('passkey-options', 30, 15 * minute), async (c) => c.json(await passkeys.loginOptions()));

authRoutes.post('/passkeys/login', rateLimit('passkey-login', 20, 15 * minute), async (c) => {
  const b = parse(z.object({ handle: z.string().min(20).max(100), response: webauthnResponse }), await c.req.json());
  const r = await passkeys.login(b.handle, b.response as never, c.req.header('user-agent'));
  setSession(c, r.token);
  return c.json({ user: await auth.loadUser(r.userId) });
});

authRoutes.post('/passkeys/register/options', rateLimit('passkey-register', 20, 15 * minute), async (c) => {
  const user = requireUser(c);
  return c.json(await passkeys.registrationOptions(user));
});

authRoutes.post('/passkeys/register', rateLimit('passkey-register', 20, 15 * minute), async (c) => {
  const user = requireUser(c);
  const b = parse(z.object({ handle: z.string().min(20).max(100), response: webauthnResponse, name: z.string().trim().max(60).default('Passkey') }), await c.req.json());
  await passkeys.register(user.id, b.handle, b.response as never, b.name || 'Passkey');
  return c.json({ ok: true }, 201);
});

/** The account page: which login methods this user has. */
authRoutes.get('/login-methods', async (c) => {
  const user = requireUser(c);
  const pw = (await authPool.query('SELECT password_hash IS NOT NULL AS has FROM users WHERE id = $1', [user.id])).rows[0]?.has ?? false;
  return c.json({
    hasPassword: pw,
    providers: oauth.configuredProviders(),
    identities: await oauth.listIdentities(user.id),
    passkeys: await passkeys.list(user.id),
  });
});

authRoutes.delete('/identities/:provider', async (c) => {
  const user = requireUser(c);
  const p = c.req.param('provider');
  if (!oauth.isProvider(p)) throw notFound();
  await oauth.unlinkIdentity(user.id, p);
  return c.json({ ok: true });
});

authRoutes.delete('/passkeys/:id', async (c) => {
  const user = requireUser(c);
  await passkeys.remove(user.id, c.req.param('id').slice(0, 1400));
  return c.json({ ok: true });
});
