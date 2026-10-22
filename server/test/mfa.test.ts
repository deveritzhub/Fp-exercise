import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client, login, seedDb, type Seed } from './helpers';
import { DEMO_PASSWORD, DEMO_USERS } from '../db/seed';
import { authPool } from '../src/db';
import { resetRateLimits } from '../src/lib/rateLimit';
import { base32Decode, base32Encode, timeStep, totp, verifyTotp } from '../src/auth/totp';

let s: Seed;
// Each authenticator code is single use, so the tests move the clock forward one 30 s step per code.
const realNow = Date.now.bind(Date);
let offset = 0;
const nextCode = (secret: string) => {
  offset += 30_000;
  return totp(secret, timeStep(realNow() + offset));
};

beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
  vi.spyOn(Date, 'now').mockImplementation(() => realNow() + offset);
});
afterAll(() => vi.restoreAllMocks());

describe('TOTP (RFC 6238)', () => {
  it('matches the RFC test vector and round-trips base32', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(secret).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(totp(secret, Math.floor(59 / 30), 8)).toBe('94287082');
    expect(totp(secret, Math.floor(1111111109 / 30), 8)).toBe('07081804');
    expect(base32Decode(secret).toString()).toBe('12345678901234567890');
  });

  it('accepts ±1 step of drift and refuses steps already used', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    const now = 1_700_000_000_000;
    const step = timeStep(now);
    expect(verifyTotp(secret, totp(secret, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(secret, totp(secret, step - 2), null, now)).toBeNull();
    expect(verifyTotp(secret, totp(secret, step), step, now)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', null, now)).toBeNull();
  });
});

describe('two-factor authentication', () => {
  let secret = '';
  let recovery: string[] = [];

  it('sets up MFA: QR code, confirmation with a valid code, recovery codes', async () => {
    const c = await login('ownerA');
    const setup = await c.post('/auth/mfa/setup');
    expect(setup.status).toBe(200);
    expect(setup.body.qrSvg).toContain('<svg');
    expect(setup.body.uri).toMatch(/^otpauth:\/\/totp\/FP%20Exercise/);
    secret = setup.body.secret;
    expect((await c.post('/auth/mfa/enable', { code: '000000' })).body.error).toBe('invalid_code');
    const en = await c.post('/auth/mfa/enable', { code: nextCode(secret) });
    expect(en.status).toBe(200);
    recovery = en.body.recoveryCodes;
    expect(recovery).toHaveLength(10);
    expect((await c.get('/auth/me')).body.user.mfaEnabled).toBe(true);
    expect((await c.post('/auth/mfa/setup')).status).toBe(409);
  });

  it('the runtime database role cannot read MFA secrets or recovery codes', async () => {
    const { Client: PgClient } = await import('pg');
    const db = new PgClient({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    await expect(db.query('SELECT mfa_secret FROM users LIMIT 1')).rejects.toThrow(/permission denied/);
    await expect(db.query('SELECT * FROM mfa_recovery_codes LIMIT 1')).rejects.toThrow(/permission denied/);
    await db.end();
  });

  it('login needs the second step; wrong and replayed codes are refused', async () => {
    const c = new Client();
    const r = await c.post('/auth/login', { email: DEMO_USERS.ownerA.email, password: DEMO_PASSWORD });
    expect(r.status).toBe(200);
    expect(r.body.mfaRequired).toBe(true);
    expect(r.body.user).toBeUndefined();
    expect(c.cookie).toBe('');
    expect((await c.get('/patients')).status).toBe(401);

    expect((await c.post('/auth/login/mfa', { mfaToken: r.body.mfaToken, code: '123456' })).body.error).toBe('invalid_code');
    const code = nextCode(secret);
    const ok = await c.post('/auth/login/mfa', { mfaToken: r.body.mfaToken, code });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe(DEMO_USERS.ownerA.email);
    expect((await c.get('/patients')).status).toBe(200);
    // The MFA token is single use, and so is the code.
    expect((await c.post('/auth/login/mfa', { mfaToken: r.body.mfaToken, code })).status).toBe(401);
    const c2 = new Client();
    const r2 = await c2.post('/auth/login', { email: DEMO_USERS.ownerA.email, password: DEMO_PASSWORD });
    expect((await c2.post('/auth/login/mfa', { mfaToken: r2.body.mfaToken, code })).body.error).toBe('invalid_code');
  });

  it('a recovery code works exactly once', async () => {
    const c = new Client();
    const r = await c.post('/auth/login', { email: DEMO_USERS.ownerA.email, password: DEMO_PASSWORD });
    const ok = await c.post('/auth/login/mfa', { mfaToken: r.body.mfaToken, code: recovery[0].toUpperCase() });
    expect(ok.status).toBe(200);
    expect(ok.body.recoveryCodesLeft).toBe(9);
    const c2 = new Client();
    const r2 = await c2.post('/auth/login', { email: DEMO_USERS.ownerA.email, password: DEMO_PASSWORD });
    expect((await c2.post('/auth/login/mfa', { mfaToken: r2.body.mfaToken, code: recovery[0] })).status).toBe(401);
  });

  it('wrong codes count towards the account lockout', async () => {
    resetRateLimits();
    await authPool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE email = $1', [DEMO_USERS.ownerA.email]);
    const c = new Client();
    for (let i = 0; i < 8; i++) {
      const r = await c.post('/auth/login', { email: DEMO_USERS.ownerA.email, password: DEMO_PASSWORD });
      await c.post('/auth/login/mfa', { mfaToken: r.body.mfaToken, code: '999999' });
      resetRateLimits();
    }
    expect((await c.post('/auth/login', { email: DEMO_USERS.ownerA.email, password: DEMO_PASSWORD })).status).toBe(429);
    await authPool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE email = $1', [DEMO_USERS.ownerA.email]);
  });

  async function loginOwnerA() {
    const c = new Client();
    const r = await c.post('/auth/login', { email: DEMO_USERS.ownerA.email, password: DEMO_PASSWORD });
    await c.post('/auth/login/mfa', { mfaToken: r.body.mfaToken, code: nextCode(secret) });
    return c;
  }

  it('a practice can require MFA: staff without it are blocked until they set it up', async () => {
    const therapist = await login('therapistA');
    expect((await therapist.patch('/practice', { name: 'X', defaultLocale: 'nl', requireMfa: true })).status).toBe(403);
    // Turning it on yourself requires your own MFA first.
    const owner = await loginOwnerA();
    const info = (await owner.get('/practice')).body;
    expect((await owner.patch('/practice', { name: info.name, city: info.city, defaultLocale: 'nl', requireMfa: true })).status).toBe(200);

    const me = (await therapist.get('/auth/me')).body.user;
    expect(me.mfaRequired).toBe(true);
    const blocked = await therapist.get('/patients');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toBe('mfa_required');
    // Patients of the practice are not affected.
    expect((await (await login('patientA')).get('/patient/home')).status).toBe(200);
    // Practice B is not affected.
    expect((await (await login('therapistB')).get('/patients')).status).toBe(200);

    const setup = await therapist.post('/auth/mfa/setup');
    expect((await therapist.post('/auth/mfa/enable', { code: nextCode(setup.body.secret) })).status).toBe(200);
    expect((await therapist.get('/patients')).status).toBe(200);
    // While the practice requires it, MFA cannot be switched off.
    const off = await therapist.post('/auth/mfa/disable', { password: DEMO_PASSWORD, code: nextCode(setup.body.secret) });
    expect(off.body.error).toBe('mfa_required_by_practice');

    const members = (await owner.get('/practice/members')).body.items;
    expect(members.find((m: any) => m.email === DEMO_USERS.therapistA.email).mfaEnabled).toBe(true);
  });

  it('owner can reset a colleague who lost their phone; not across practices, not themselves', async () => {
    resetRateLimits();
    const owner = await loginOwnerA();
    const ownerB = await login('ownerB');
    expect((await ownerB.post(`/practice/members/${s.users.therapistA}/mfa-reset`)).status).toBe(404);
    expect((await owner.post(`/practice/members/${s.users.ownerA}/mfa-reset`)).body.error).toBe('cannot_reset_own_mfa');
    const therapist = new Client();
    const r = await therapist.post('/auth/login', { email: DEMO_USERS.therapistA.email, password: DEMO_PASSWORD });
    expect(r.body.mfaRequired).toBe(true);
    expect((await owner.post(`/practice/members/${s.users.therapistA}/mfa-reset`)).status).toBe(200);
    const again = await login('therapistA');
    expect((await again.get('/auth/me')).body.user.mfaRequired).toBe(true);
    const { Client: PgClient } = await import('pg');
    const db = new PgClient({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    const audit = await db.query(`SELECT 1 FROM audit_log WHERE action = 'mfa_reset' AND entity_id = $1`, [s.users.therapistA]);
    await db.end();
    expect(audit.rowCount).toBe(1);
  });

  it('switching MFA off needs password and code, and signs out other devices', async () => {
    resetRateLimits();
    const owner = await loginOwnerA();
    const info = (await owner.get('/practice')).body;
    await owner.patch('/practice', { name: info.name, city: info.city, defaultLocale: 'nl', requireMfa: false });
    const other = await loginOwnerA();
    expect((await owner.post('/auth/mfa/disable', { password: 'wrong-password-1', code: nextCode(secret) })).status).toBe(401);
    expect((await owner.post('/auth/mfa/disable', { password: DEMO_PASSWORD, code: nextCode(secret) })).status).toBe(200);
    expect((await owner.get('/auth/me')).body.user.mfaEnabled).toBe(false);
    expect((await other.get('/auth/me')).body.user).toBeNull();
    const plain = await login('ownerA');
    expect((await plain.get('/patients')).status).toBe(200);
  });
});
