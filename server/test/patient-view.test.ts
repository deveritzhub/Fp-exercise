import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

describe('game or plain view', () => {
  it('is unchosen at first, set by the patient or by their therapist, and closed to another practice', async () => {
    const P = await login('patientA');
    expect((await P.get('/patient/view')).body).toEqual({ simple: null });
    expect((await P.put('/patient/view', { simple: 'yes' })).status).toBe(400);
    expect((await P.put('/patient/view', { simple: true })).body).toEqual({ simple: true });
    const T = await login('therapistA');
    expect((await T.get(`/patients/${s.patients.emma}/view`)).body).toEqual({ simple: true });
    expect((await T.put(`/patients/${s.patients.emma}/view`, { simple: false })).status).toBe(200);
    expect((await P.get('/patient/view')).body).toEqual({ simple: false });
    const B = await login('therapistB');
    expect((await B.get(`/patients/${s.patients.emma}/view`)).status).toBe(404);
    expect((await B.put(`/patients/${s.patients.emma}/view`, { simple: true })).status).toBe(404);
    expect((await P.get('/patient/view')).body).toEqual({ simple: false });
  });
});
