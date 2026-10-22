import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { z } from 'zod';
import { config } from '../config';
import * as auth from '../auth/service';
import * as mfa from '../auth/mfa';
import { rateLimit, requireUser, SESSION_COOKIE, type AppEnv } from '../middleware';
import { parse } from '../lib/validate';
import { notFound } from '../lib/errors';

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
