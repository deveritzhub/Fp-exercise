import { describe, it, expect, beforeAll } from 'vitest';
import { Client, login, seedDb, app } from './helpers';
import { DEMO_PASSWORD } from '../db/seed';
import { authPool } from '../src/db';
import { resetRateLimits } from '../src/lib/rateLimit';

beforeAll(async () => {
  await seedDb();
  resetRateLimits();
});

describe('authentication', () => {
  it('logs in with valid credentials and returns the session user', async () => {
    const c = await login('therapistA');
    const me = await c.get('/auth/me');
    expect(me.body.user.email).toBe('therapeut@praktijk-a.test');
    expect(me.body.user.memberships[0].role).toBe('therapist');
    expect(me.body.user.patient).toBeNull();
    expect(c.cookie).toMatch(/^fp_session=/);
  });

  it('rejects wrong passwords with a generic error', async () => {
    const c = new Client();
    const r1 = await c.post('/auth/login', { email: 'therapeut@praktijk-a.test', password: 'wrong-password-1' });
    const r2 = await c.post('/auth/login', { email: 'nobody@nowhere.test', password: 'wrong-password-1' });
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
    expect(r1.body.error).toBe(r2.body.error); // no account enumeration
  });

  it('sets an httpOnly SameSite cookie', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-requested-with': 'fp' },
      body: JSON.stringify({ email: 'eigenaar@praktijk-a.test', password: DEMO_PASSWORD }),
    });
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('requires the CSRF header on state-changing requests', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'eigenaar@praktijk-a.test', password: DEMO_PASSWORD }),
    });
    expect(res.status).toBe(403);
    const cross = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-requested-with': 'fp', origin: 'https://evil.example' },
      body: JSON.stringify({ email: 'eigenaar@praktijk-a.test', password: DEMO_PASSWORD }),
    });
    expect(cross.status).toBe(403);
  });

  it('logout invalidates the session server-side', async () => {
    const c = await login('therapistA');
    const cookie = c.cookie;
    await c.post('/auth/logout');
    const replay = new Client();
    replay.cookie = cookie;
    expect((await replay.get('/auth/me')).body.user).toBeNull();
    expect((await replay.get('/patients')).status).toBe(401);
  });

  it('password reset: same response for unknown email, token is single use, old sessions revoked', async () => {
    const anon = new Client();
    expect((await anon.post('/auth/password/forgot', { email: 'unknown@x.test' })).status).toBe(200);
    const existing = await login('patientB');
    await anon.post('/auth/password/forgot', { email: 'patient@praktijk-b.test' });
    const mail = (await authPool.query(`SELECT body FROM mail_outbox WHERE to_email = 'patient@praktijk-b.test' ORDER BY created_at DESC LIMIT 1`)).rows[0];
    const token = /token=([\w-]+)/.exec(mail.body)![1];
    expect((await anon.post('/auth/password/reset', { token, password: 'short' })).body.error).toBe('password_too_short');
    expect((await anon.post('/auth/password/reset', { token, password: 'Nieuw-wachtwoord-22' })).status).toBe(200);
    expect((await anon.post('/auth/password/reset', { token, password: 'Nieuw-wachtwoord-33' })).status).toBe(400);
    expect((await existing.get('/auth/me')).body.user).toBeNull();
    const again = new Client();
    expect((await again.post('/auth/login', { email: 'patient@praktijk-b.test', password: 'Nieuw-wachtwoord-22' })).status).toBe(200);
  });

  it('locks the account after repeated failures', async () => {
    resetRateLimits();
    const c = new Client();
    for (let i = 0; i < 8; i++) await c.post('/auth/login', { email: 'therapeut@praktijk-b.test', password: 'wrong-pass-123' });
    const r = await c.post('/auth/login', { email: 'therapeut@praktijk-b.test', password: DEMO_PASSWORD });
    expect(r.status).toBe(429);
    await authPool.query(`UPDATE users SET locked_until = NULL, failed_logins = 0 WHERE email = 'therapeut@praktijk-b.test'`);
    resetRateLimits();
  });

  it('rate-limits login attempts per client', async () => {
    resetRateLimits();
    const c = new Client();
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await c.post('/auth/login', { email: 'x@y.test', password: 'whatever-123' })).status;
    expect(last).toBe(429);
    resetRateLimits();
  });

  it('unknown API routes return a JSON 404', async () => {
    const res = await app.request('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('sets security headers', async () => {
    const res = await app.request('/api/health');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('idle timeout (staff)', () => {
  const age = async (c: Client, minutes: number) => {
    const token = c.cookie!.split(';')[0].split('=')[1];
    const { createHash } = await import('node:crypto');
    await authPool.query(`UPDATE auth_sessions SET last_seen_at = now() - make_interval(mins => $2) WHERE token_hash = $1`, [
      createHash('sha256').update(token).digest('hex'),
      minutes,
    ]);
  };

  it('ends a staff session after 30 minutes without activity', async () => {
    const c = await login('therapistA');
    expect((await c.get('/auth/me')).body.user.idleMinutes).toBe(30);
    await age(c, 29);
    expect((await c.get('/auth/me')).body.user).not.toBeNull();
    await age(c, 31);
    expect((await c.get('/auth/me')).body.user).toBeNull();
    expect((await c.get('/dashboard')).status).toBe(401);
  });

  it('background polling does not keep a staff session alive', async () => {
    const c2 = await login('therapistA');
    await age(c2, 25);
    expect((await c2.get('/me/notifications', { 'x-fp-background': '1' })).status).toBe(200);
    await c2.get('/me/notifications', { 'x-fp-background': '1' });
    const token = c2.cookie!.split(';')[0].split('=')[1];
    const { createHash } = await import('node:crypto');
    const { rows } = await authPool.query(`SELECT extract(epoch FROM now() - last_seen_at) / 60 AS idle FROM auth_sessions WHERE token_hash = $1`, [createHash('sha256').update(token).digest('hex')]);
    expect(Number(rows[0].idle)).toBeGreaterThan(24);
    await c2.get('/auth/me');
    const after = await authPool.query(`SELECT extract(epoch FROM now() - last_seen_at) / 60 AS idle FROM auth_sessions WHERE token_hash = $1`, [createHash('sha256').update(token).digest('hex')]);
    expect(Number(after.rows[0].idle)).toBeLessThan(1);
  });

  it('patients have no idle limit (the app on their own phone)', async () => {
    const c = await login('patientA');
    expect((await c.get('/auth/me')).body.user.idleMinutes).toBeNull();
    await age(c, 600);
    expect((await c.get('/auth/me')).body.user).not.toBeNull();
  });
});
