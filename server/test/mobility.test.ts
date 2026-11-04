import { describe, it, expect, beforeAll, vi } from 'vitest';
import pg from 'pg';
import { Client, login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
let A: Client, B: Client, patientA: Client, patientB: Client, anon: Client;

beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
  [A, B, patientA, patientB] = await Promise.all([login('therapistA'), login('therapistB'), login('patientA'), login('patientB')]);
  anon = new Client();
});

describe('mobility self-tests: privacy and validation', () => {
  it('the patient logs results; others never see or delete them', async () => {
    const r = await patientA.post('/patient/mobility-tests', { test: 'knee_to_wall', values: [{ side: 'left', cm: 9.3 }, { side: 'right', cm: 11 }] });
    expect(r.status).toBe(201);
    // Stored to the half centimetre, one per side and day.
    expect(r.body.results.map((x: any) => [x.side, x.cm]).sort()).toEqual([['left', 9.5], ['right', 11]]);
    const again = await patientA.post('/patient/mobility-tests', { test: 'knee_to_wall', values: [{ side: 'left', cm: 10 }] });
    expect(again.body.results.filter((x: any) => x.side === 'left')).toHaveLength(1);
    const id = again.body.results[0].id as string;

    expect((await patientB.get('/patient/mobility-tests')).body.results).toEqual([]);
    expect((await patientB.del(`/patient/mobility-tests/${id}`)).status).toBe(404);
    expect((await anon.get('/patient/mobility-tests')).status).toBe(401);
    // Another practice cannot even ask.
    expect((await B.get(`/patients/${s.patients.emma}/mobility-tests`)).status).toBe(404);
    // Staff cannot write the patient's own measurements.
    expect((await A.post('/patient/mobility-tests', { test: 'knee_to_wall', values: [{ side: 'left', cm: 5 }] })).status).toBeGreaterThanOrEqual(400);
  });

  it('own practice staff see results only while the patient shares mobility', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    try {
      await db.query(`UPDATE patient_module_consents SET revoked_at = now(), revoked_by = granted_by WHERE patient_id = $1 AND module = 'mobiliteit' AND revoked_at IS NULL`, [s.patients.emma]);
      const hidden = await A.get(`/patients/${s.patients.emma}/mobility-tests`);
      expect(hidden.body).toEqual({ results: [], sharedByPatient: false });
      await db.query(`INSERT INTO patient_module_consents(patient_id, practice_id, module, granted_by) SELECT id, practice_id, 'mobiliteit', user_id FROM patients WHERE id = $1`, [s.patients.emma]);
      const shown = await A.get(`/patients/${s.patients.emma}/mobility-tests`);
      expect(shown.body.sharedByPatient).toBe(true);
      expect(shown.body.results.length).toBeGreaterThan(0);
      // Taking the consent back hides the results again (row-level security, not only the API).
      await db.query(`UPDATE patient_module_consents SET revoked_at = now(), revoked_by = granted_by WHERE patient_id = $1 AND module = 'mobiliteit' AND revoked_at IS NULL`, [s.patients.emma]);
      expect((await A.get(`/patients/${s.patients.emma}/mobility-tests`)).body.results).toEqual([]);
    } finally {
      await db.end();
    }
  });

  it('rejects impossible values and wrong sides', async () => {
    expect((await patientA.post('/patient/mobility-tests', { test: 'knee_to_wall', values: [{ side: 'left', cm: 60 }] })).status).toBe(400);
    expect((await patientA.post('/patient/mobility-tests', { test: 'fingertip_floor', values: [{ side: 'left', cm: 5 }] })).status).toBe(400);
    expect((await patientA.post('/patient/mobility-tests', { test: 'knee_to_wall', values: [{ side: 'left', cm: 5 }, { side: 'left', cm: 6 }] })).status).toBe(400);
    expect((await patientA.post('/patient/mobility-tests', { test: 'made_up', values: [{ side: 'none', cm: 5 }] })).status).toBe(400);
  });

  it('measuring earns hero XP once per two weeks and opens the Mobility skill', async () => {
    const hero = await patientA.get('/patient/hero');
    expect(hero.status).toBe(200);
    const mob = hero.body.skills.find((x: any) => x.key === 'mobility');
    expect(mob.locked).toBe(false);
  });
});

describe('asking a patient to measure', () => {
  it('own practice can ask (a notification with a link), another practice cannot', async () => {
    expect((await B.post(`/patients/${s.patients.emma}/mobility-tests/request`, {})).status).toBe(404);
    const r = await A.post(`/patients/${s.patients.emma}/mobility-tests/request`, { note: 'Graag voor onze afspraak.' });
    expect(r.body).toEqual({ ok: true, delivered: true });
    const home = await patientA.get('/patient/home');
    const n = home.body.notifications.find((x: any) => x.title === 'Meet je mobiliteit');
    expect(n.link).toBe('/p/mobiliteit/meten');
    expect(n.body).toBe('Graag voor onze afspraak.');
    // Patients cannot send it to themselves or others.
    expect((await patientA.post(`/patients/${s.patients.emma}/mobility-tests/request`, {})).status).toBeGreaterThanOrEqual(400);
  });
});

describe('client error reports', () => {
  it('logs one scrubbed line without user data', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = await anon.post('/public/client-error', {
      kind: 'render',
      message: 'TypeError: cannot read x of emma@example.com 123456',
      path: '/app/patienten/3f2b8c1e-1111-4222-8333-444455556666?tab=kracht',
    });
    expect(r.status).toBe(202);
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[client-error]'))!;
    spy.mockRestore();
    expect(line).toContain('/app/patienten/:id');
    expect(line).not.toContain('tab=kracht');
    expect(line).not.toContain('emma@example.com');
    expect(line).not.toContain('123456');
    expect((await anon.post('/public/client-error', { kind: 'bad', message: 'x', path: '/' })).status).toBe(400);
  });
});
