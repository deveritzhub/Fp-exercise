import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { Client, login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { oauthTestHooks } from '../src/auth/oauth';

/**
 * Google/Apple login with a fake provider: we sign ID tokens with our own test key and replace the
 * token endpoint. Everything else (state, browser cookie, nonce, issuer/audience checks, linking
 * rules) runs for real.
 */
let sign: (claims: Record<string, unknown>, opts?: { iss?: string; aud?: string }) => Promise<string>;
let pending: Record<string, unknown> = {};

beforeAll(async () => {
  await seedDb();
  resetRateLimits();
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256' };
  oauthTestHooks.keys = createLocalJWKSet({ keys: [jwk] });
  oauthTestHooks.configured = ['google', 'apple'];
  sign = (claims, opts = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(opts.iss ?? 'https://accounts.google.com')
      .setAudience(opts.aud ?? 'test-client')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  // The "token endpoint": returns an ID token for the claims the test set up, with the nonce from the authorize URL.
  oauthTestHooks.exchange = async () => sign(pending);
});
afterAll(() => {
  delete oauthTestHooks.keys;
  delete oauthTestHooks.configured;
  delete oauthTestHooks.exchange;
});

/** Runs the whole redirect dance in the test client. Returns where the browser ends up. */
async function flow(client: Client, query: string, claims: Record<string, unknown>, opts: { keepCookie?: boolean; provider?: 'google' | 'apple' } = {}) {
  const provider = opts.provider ?? 'google';
  const session = client.cookie;
  const start = await client.get(`/auth/oauth/${provider}/start?${query}`);
  client.cookie = session; // the test client would otherwise keep only the last cookie it saw
  expect(start.status).toBe(302);
  const to = new URL(start.headers.get('location')!);
  const browser = /fp_oauth=([^;]+)/.exec(start.headers.get('set-cookie') ?? '')?.[1];
  pending = { nonce: to.searchParams.get('nonce'), ...claims };
  const cookie = [client.cookie, opts.keepCookie === false ? '' : `fp_oauth=${browser}`].filter(Boolean).join('; ');
  const res = await client.raw('GET', `/auth/oauth/${provider}/callback?state=${to.searchParams.get('state')}&code=abc`, { cookie });
  return { status: res.status, location: res.headers.get('location') ?? '', authorize: to, setCookie: res.headers.get('set-cookie') ?? '' };
}

describe('login with Google or Apple', () => {
  it('offers configured providers and passkeys; uses state, nonce and PKCE', async () => {
    const o = (await new Client().get('/auth/options')).body;
    expect(o).toMatchObject({ google: true, apple: true, passkeys: true });
    const start = await new Client().get('/auth/oauth/google/start?intent=login');
    const u = new URL(start.headers.get('location')!);
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    for (const k of ['state', 'nonce', 'code_challenge']) expect(u.searchParams.get(k)?.length).toBeGreaterThan(20);
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('redirect_uri')).toMatch(/\/api\/auth\/oauth\/google\/callback$/);
    const apple = new URL((await new Client().get('/auth/oauth/apple/start?intent=login')).headers.get('location')!);
    expect(apple.searchParams.get('response_mode')).toBe('form_post');
  });

  it('signs up a personal account with a verified Google address, then logs in again', async () => {
    const c = new Client();
    const r = await flow(c, 'intent=signup&kind=personal', { sub: 'g-100', email: 'nieuw@gmail.test', email_verified: true, name: 'Nina Nieuw' });
    expect(r.location).toBe('/p/held/nieuw');
    c.cookie = /fp_session=[^;]+/.exec(r.setCookie)![0];
    const me = (await c.get('/auth/me')).body.user;
    expect(me).toMatchObject({ email: 'nieuw@gmail.test', fullName: 'Nina Nieuw', emailVerified: true });
    expect(me.patient.kind).toBe('personal');
    // Next time: plain login.
    const again = await flow(new Client(), 'intent=login', { sub: 'g-100', email: 'nieuw@gmail.test', email_verified: true });
    expect(again.location).toBe('/p');
    // The account has Google as login method and no password.
    const methods = (await c.get('/auth/login-methods')).body;
    expect(methods.hasPassword).toBe(false);
    expect(methods.identities).toEqual([expect.objectContaining({ provider: 'google', email: 'nieuw@gmail.test' })]);
    // Removing the only login method is refused.
    expect((await c.del('/auth/identities/google')).body.error).toBe('last_login_method');
  });

  it('never takes over an existing account by e-mail; linking happens while logged in', async () => {
    const r = await flow(new Client(), 'intent=login', { sub: 'g-200', email: 'patient@praktijk-a.test', email_verified: true });
    expect(r.location).toBe('/login?fout=social_link_required');
    const s = await flow(new Client(), 'intent=signup&kind=personal', { sub: 'g-200', email: 'patient@praktijk-a.test', email_verified: true });
    expect(s.location).toBe('/login?fout=social_link_required');

    const emma = await login('patientA');
    const linked = await flow(emma, 'intent=link', { sub: 'g-200', email: 'emma@gmail.test', email_verified: true });
    expect(linked.location).toBe('/p/account?gekoppeld=google');
    expect(await flow(new Client(), 'intent=login', { sub: 'g-200', email: 'emma@gmail.test', email_verified: true })).toMatchObject({ location: '/p' });
    // The same Google account cannot be linked to someone else.
    const noah = await login('patientB');
    expect((await flow(noah, 'intent=link', { sub: 'g-200', email: 'emma@gmail.test', email_verified: true })).location).toContain('fout=social_in_use');
    // Emma has a password, so she may unlink.
    expect((await emma.del('/auth/identities/google')).status).toBe(200);
  });

  it('staff with two-step verification still need their code', async () => {
    const owner = await login('ownerA');
    // Turn MFA on in the database directly (the MFA flow itself has its own tests).
    const pg = (await import('pg')).default;
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    await db.query(`UPDATE users SET mfa_enabled = true WHERE email = 'eigenaar@praktijk-a.test'`);
    try {
      await flow(owner, 'intent=link', { sub: 'g-300', email: 'owner@gmail.test', email_verified: true });
      const r = await flow(new Client(), 'intent=login', { sub: 'g-300', email: 'owner@gmail.test', email_verified: true });
      expect(r.location).toMatch(/^\/login#mfa=[\w-]{20,}$/);
      expect(r.setCookie).not.toMatch(/fp_session=/);
    } finally {
      await db.query(`UPDATE users SET mfa_enabled = false WHERE email = 'eigenaar@praktijk-a.test'`);
      await db.end();
    }
  });

  it('refuses forged, replayed or foreign logins', async () => {
    // Unverified e-mail.
    expect((await flow(new Client(), 'intent=signup&kind=personal', { sub: 'g-400', email: 'x@gmail.test', email_verified: false })).location).toBe('/login?fout=social_email_unverified');
    // Started in another browser (no binding cookie): login CSRF.
    expect((await flow(new Client(), 'intent=login', { sub: 'g-100', email: 'nieuw@gmail.test', email_verified: true }, { keepCookie: false })).location).toBe('/login?fout=social_login_expired');
    // Wrong nonce.
    const c = new Client();
    const start = await c.get('/auth/oauth/google/start?intent=login');
    const to = new URL(start.headers.get('location')!);
    const browser = /fp_oauth=([^;]+)/.exec(start.headers.get('set-cookie') ?? '')?.[1];
    pending = { nonce: 'other', sub: 'g-100', email: 'nieuw@gmail.test', email_verified: true };
    const bad = await c.raw('GET', `/auth/oauth/google/callback?state=${to.searchParams.get('state')}&code=abc`, { cookie: `fp_oauth=${browser}` });
    expect(bad.headers.get('location')).toBe('/login?fout=social_login_failed');
    // Replay of the same state.
    const replay = await c.raw('GET', `/auth/oauth/google/callback?state=${to.searchParams.get('state')}&code=abc`, { cookie: `fp_oauth=${browser}` });
    expect(replay.headers.get('location')).toBe('/login?fout=social_login_expired');
    // Token from another issuer.
    oauthTestHooks.exchange = async () => sign(pending, { iss: 'https://evil.example' });
    expect((await flow(new Client(), 'intent=login', { sub: 'g-100', email: 'nieuw@gmail.test', email_verified: true })).location).toBe('/login?fout=social_login_failed');
    oauthTestHooks.exchange = async () => sign(pending, { aud: 'someone-else' });
    expect((await flow(new Client(), 'intent=login', { sub: 'g-100', email: 'nieuw@gmail.test', email_verified: true })).location).toBe('/login?fout=social_login_failed');
    oauthTestHooks.exchange = async () => sign(pending);
    // Unknown account on login: suggest signing up.
    expect((await flow(new Client(), 'intent=login', { sub: 'g-999', email: 'nobody@gmail.test', email_verified: true })).location).toBe('/login?fout=social_no_account');
    // Cancelled at the provider.
    const cancel = await new Client().raw('GET', '/auth/oauth/google/callback?error=access_denied&state=x');
    expect(cancel.headers.get('location')).toBe('/login?fout=social_cancelled');
  });

  it('Apple returns with a form POST, including the name on first sign-up', async () => {
    const c = new Client();
    const start = await c.get('/auth/oauth/apple/start?intent=signup&kind=personal');
    const to = new URL(start.headers.get('location')!);
    const browser = /fp_oauth=([^;]+)/.exec(start.headers.get('set-cookie') ?? '')?.[1];
    oauthTestHooks.exchange = async () => sign({ nonce: to.searchParams.get('nonce'), sub: 'a-1', email: 'relay@privaterelay.appleid.com', email_verified: 'true' }, { iss: 'https://appleid.apple.com' });
    const body = new URLSearchParams({ state: to.searchParams.get('state')!, code: 'xyz', user: JSON.stringify({ name: { firstName: 'Appie', lastName: 'Appel' } }) });
    const res = await c.raw('POST', '/auth/oauth/apple/callback', { cookie: `fp_oauth=${browser}`, origin: 'https://appleid.apple.com', 'content-type': 'application/x-www-form-urlencoded' }, body.toString());
    expect(res.headers.get('location')).toBe('/p/held/nieuw');
    oauthTestHooks.exchange = async () => sign(pending);
    // Any other cross-site POST is still refused.
    const forged = await new Client().raw('POST', '/auth/oauth/google/callback', { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, 'state=x&code=y');
    expect(forged.status).toBe(403);
  });
});

describe('passkeys (server side)', () => {
  it('needs a login to register, gives login options to anyone, and refuses unknown or stale answers', async () => {
    expect((await new Client().post('/auth/passkeys/register/options')).status).toBe(401);
    const emma = await login('patientA');
    const reg = (await emma.post('/auth/passkeys/register/options')).body;
    expect(reg.options.rp).toMatchObject({ name: 'FP Flow' });
    expect(reg.options.authenticatorSelection).toMatchObject({ residentKey: 'required', userVerification: 'required' });
    const opts = (await new Client().post('/auth/passkeys/login/options')).body;
    expect(opts.options.challenge.length).toBeGreaterThan(20);
    const fake = { id: 'A'.repeat(43), rawId: 'A'.repeat(43), type: 'public-key', response: { clientDataJSON: 'x', authenticatorData: 'x', signature: 'x' }, clientExtensionResults: {} };
    expect((await new Client().post('/auth/passkeys/login', { handle: opts.handle, response: fake })).body.error).toBe('passkey_unknown');
    // The challenge was used up.
    expect((await new Client().post('/auth/passkeys/login', { handle: opts.handle, response: fake })).body.error).toBe('passkey_expired');
    expect((await emma.get('/auth/login-methods')).body).toMatchObject({ hasPassword: true, passkeys: [] });
  });
});
