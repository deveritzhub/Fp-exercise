import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
});

describe('patient history', () => {
  it('says which part each workout belongs to, so Kracht and Mobiliteit show their own', async () => {
    const r = await (await login('patientA')).get('/patient/history');
    expect(r.status).toBe(200);
    expect(r.body.sessions.length).toBeGreaterThan(0);
    for (const s of r.body.sessions) expect(['revalidatie', 'kracht', 'mobiliteit']).toContain(s.module);
  });
});
