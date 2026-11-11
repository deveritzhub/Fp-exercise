import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { Client, login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { STRENGTH_TRANSITION } from '../../shared/strength';

/**
 * A brand-new practice (created by the platform admin) adds the FP library itself and its own
 * patient logs strength training. Nothing of it is visible to another practice.
 */
const PASSWORD = 'Eigen-wachtwoord-2026';
const tokenOf = (url: string) => new URL(url, 'http://x').pathname.split('/').pop()!;

async function accept(url: string) {
  const c = new Client();
  const r = await c.post('/auth/invite/accept', { token: tokenOf(url), password: PASSWORD });
  expect(r.status).toBe(200);
  return c;
}

beforeAll(async () => {
  await seedDb();
  resetRateLimits();
});

describe('own practice with the FP library and strength logging', () => {
  it('works end to end and stays inside the practice', async () => {
    const admin = await login('admin');
    const created = await admin.post('/admin/practices', { name: 'Eigen training', slug: 'eigen-training', ownerName: 'Test Eigenaar', ownerEmail: 'eigenaar@eigen-training.test' });
    expect(created.status).toBe(201);
    // MFA is covered elsewhere; switch the requirement off here to reach the staff APIs.
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    await db.query(`UPDATE practices SET settings = settings - 'requireMfa' WHERE id = $1`, [created.body.id]);
    await db.end();

    const owner = await accept(created.body.inviteUrl);
    owner.practiceId = created.body.id;
    const before = (await owner.get('/programs/templates')).body.items.length;

    const imp = await owner.post('/practice/library-import/fp');
    expect(imp.status).toBe(200);
    expect(imp.body.templates).toBeGreaterThan(0);
    const again = await owner.post('/practice/library-import/fp');
    expect(again.body.created).toBe(0); // updates, no duplicates
    expect((await owner.get('/programs/templates')).body.items.length).toBeGreaterThan(before);

    // The patient: the owner themselves, with a second e-mail address.
    const pt = await owner.post('/patients', { firstName: 'Test', lastName: 'Sporter', email: 'sporter@eigen-training.test', locale: 'nl' });
    expect(pt.status).toBe(201);
    const inv = await owner.post(`/patients/${pt.body.id}/invite`);
    const patient = await accept(inv.body.inviteUrl);

    for (let i = 0; i < STRENGTH_TRANSITION.length; i++) expect((await owner.put(`/patients/${pt.body.id}/transition/${i}`)).status).toBe(200);
    expect((await owner.post(`/patients/${pt.body.id}/strength-clearance`)).status).toBe(200);

    const home = (await patient.get('/patient/modes')).body;
    const tpl = home.templates.find((t: { module: string }) => t.module === 'kracht');
    expect(tpl).toBeTruthy();
    const started = await patient.post('/patient/programs/start', { templateId: tpl.id });
    expect(started.status).toBe(201);
    const sess = (await patient.post('/patient/sessions', { programId: started.body.id })).body;
    const item = (await patient.get(`/patient/programs/${started.body.id}`)).body.items[0];
    expect((await patient.post(`/patient/sessions/${sess.id}/sets`, { programItemId: item.id, setNo: 1, weightKg: 50, reps: 8, rpe: 7 })).status).toBe(200);
    expect((await patient.get('/patient/strength')).body.exercises.length).toBeGreaterThan(0);

    // Another practice sees none of it.
    const other = await login('therapistA');
    expect((await other.get(`/patients/${pt.body.id}`)).status).toBe(404);
    expect((await other.get(`/programs/${started.body.id}`)).status).toBe(404);
  });

  it('only owners and admins may add the FP library', async () => {
    expect((await (await login('therapistA')).post('/practice/library-import/fp')).status).toBe(403);
  });
});
