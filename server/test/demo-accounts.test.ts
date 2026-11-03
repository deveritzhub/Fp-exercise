import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Client, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { DEMO_PASSWORD, DEMO_USERS } from '../db/seed';
import { DEMO_EMAILS, isDemoEmail } from '../src/lib/demo';
import { applyDemoSettings } from '../db/demo-accounts';

const tryLogin = async (email: string, password: string) => new Client().post('/auth/login', { email, password });

beforeAll(async () => {
  await seedDb();
});
afterEach(async () => {
  delete process.env.DEMO_ACCOUNTS;
  delete process.env.DEMO_PASSWORD;
  resetRateLimits();
});

describe('demo accounts can be closed on a hosted environment', () => {
  it('knows exactly the seeded demo accounts', () => {
    expect([...DEMO_EMAILS].sort()).toEqual(Object.values(DEMO_USERS).map((u) => u.email).sort());
    expect(isDemoEmail(' Patient@Praktijk-A.test ')).toBe(true);
    expect(isDemoEmail('someone@fpflow.nl')).toBe(false);
  });

  it('DEMO_ACCOUNTS=off refuses demo logins; the public page then hides the password', async () => {
    process.env.DEMO_ACCOUNTS = 'off';
    expect((await tryLogin('patient@praktijk-a.test', DEMO_PASSWORD)).body.error).toBe('demo_disabled');
    expect((await new Client().get('/public/demo')).body).toMatchObject({ accounts: false, publicPassword: false });
    delete process.env.DEMO_ACCOUNTS;
    expect((await tryLogin('patient@praktijk-a.test', DEMO_PASSWORD)).status).toBe(200);
    expect((await new Client().get('/public/demo')).body).toMatchObject({ accounts: true, publicPassword: true });
  });

  it('an own DEMO_PASSWORD replaces the public one, and the site stops showing it', async () => {
    process.env.DEMO_PASSWORD = 'Eigen-demo-wachtwoord-42';
    await applyDemoSettings(process.env.DATABASE_OWNER_URL!);
    expect((await tryLogin('therapeut@praktijk-a.test', DEMO_PASSWORD)).status).toBe(401);
    expect((await tryLogin('therapeut@praktijk-a.test', 'Eigen-demo-wachtwoord-42')).status).toBe(200);
    expect((await new Client().get('/public/demo')).body).toMatchObject({ accounts: true, publicPassword: false });
    // Back to the seed password for the other tests.
    delete process.env.DEMO_PASSWORD;
    await seedDb();
  });
});

describe('test version banner', () => {
  it('is on with DEMO_MODE=1 or TEST_VERSION=1', async () => {
    const before = { d: process.env.DEMO_MODE, t: process.env.TEST_VERSION };
    delete process.env.DEMO_MODE;
    delete process.env.TEST_VERSION;
    expect((await new Client().get('/public/demo')).body.testVersion).toBe(false);
    process.env.TEST_VERSION = '1';
    expect((await new Client().get('/public/demo')).body.testVersion).toBe(true);
    if (before.d === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = before.d;
    if (before.t === undefined) delete process.env.TEST_VERSION; else process.env.TEST_VERSION = before.t;
  });
});
