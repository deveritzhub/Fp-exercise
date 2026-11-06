import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { STRENGTH_TRANSITION } from '../../shared/strength';

/**
 * FP app update (W01–W16): red flags, modes and consent per module, strength log, 1RM screening,
 * export and deletion requests. Synthetic data only; module templates are set up directly in the
 * test database because they normally come from the library import.
 */
let s: Seed;
let strengthTemplate: string;
let emmaId: string;

async function owner<T>(fn: (db: pg.Client) => Promise<T>) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

beforeAll(async () => {
  s = await seedDb();
  emmaId = s.patients.emma;
  strengthTemplate = await owner(async (db) => {
    await db.query(`UPDATE programs SET red_flags = '["Plotselinge knap of scheur","Toenemende zwelling"]' WHERE id = $1`, [s.programs.emma]);
    await db.query(`UPDATE exercises SET tags = array_append(tags, '1rm') WHERE id = $1`, [s.exercises.box_squat]);
    const t = await db.query(
      `INSERT INTO programs(practice_id, is_template, title, description, patient_instructions, status, module, red_flags, created_by)
       VALUES ($1, true, 'Kracht basis — test', 'intern', 'Rustig opbouwen', 'active', 'kracht', '["Pijn op de borst"]', $2) RETURNING id`,
      [s.practices.A, s.users.therapistA],
    );
    await db.query(
      `INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, reps, rest_s, days, notes)
       VALUES ($1,$2,$3,0,3,8,120,'{1,2,3,4,5,6,7}','5-8 herhalingen · RPE 8')`,
      [t.rows[0].id, s.practices.A, s.exercises.box_squat],
    );
    return t.rows[0].id as string;
  });
});
beforeEach(() => resetRateLimits());

describe('red flag (W11)', () => {
  it('stops the programme, notifies the therapist and only staff of the practice can handle it', async () => {
    const patient = await login('patientA');
    const prog = (await patient.get(`/patient/programs/${s.programs.emma}`)).body;
    expect(prog.redFlags).toContain('Plotselinge knap of scheur');
    expect((await patient.post(`/patient/programs/${s.programs.emma}/red-flag`, {})).status).toBe(400);
    const r = await patient.post(`/patient/programs/${s.programs.emma}/red-flag`, { flags: ['Plotselinge knap of scheur'], note: 'Bij traplopen' });
    expect(r.status).toBe(201);

    const home = (await patient.get('/patient/home')).body.programs.find((p: any) => p.id === s.programs.emma);
    expect(home.paused).toBe(true);
    const start = await patient.post('/patient/sessions', { programId: s.programs.emma });
    expect(start.status).toBe(409);
    expect(start.body.error).toBe('paused_red_flag');

    const ther = await login('therapistA');
    const notes = (await ther.get('/me/notifications')).body.items;
    const n = notes.find((x: any) => x.kind === 'red_flag');
    expect(n.body).not.toMatch(/traplopen|knap/i); // no clinical detail in the notification
    const mod = (await ther.get(`/patients/${emmaId}/modules`)).body;
    expect(mod.redFlags[0]).toMatchObject({ flags: ['Plotselinge knap of scheur'], note: 'Bij traplopen', handledAt: null });
    expect((await ther.get('/dashboard')).body.alerts.some((a: any) => a.kind === 'red_flag' && a.patientId === emmaId)).toBe(true);

    const other = await login('therapistB');
    expect((await other.post(`/red-flags/${r.body.id}/handle`, { note: 'x' })).status).toBe(404);
    expect((await ther.post(`/red-flags/${r.body.id}/handle`, { note: '' })).status).toBe(400);
    expect((await ther.post(`/red-flags/${r.body.id}/handle`, { note: 'Gebeld, knie onderzocht, mag door' })).status).toBe(200);
    expect((await patient.post('/patient/sessions', { programId: s.programs.emma })).status).toBe(201);
  });
});

describe('modes, consent and strength (W01, W02, W04–W09)', () => {
  it('strength needs the therapist’s transition check; data is only visible to the practice with consent', async () => {
    const patient = await login('patientA');
    const ther = await login('therapistA');
    const modes = (await patient.get('/patient/modes')).body;
    expect(modes.templates.map((t: any) => t.id)).toContain(strengthTemplate);
    expect(modes.templates[0]).not.toHaveProperty('description');
    expect((await patient.put('/patient/mode', { mode: 'kracht' })).status).toBe(200);

    // Not cleared yet.
    const early = await patient.post('/patient/programs/start', { templateId: strengthTemplate });
    expect(early.status).toBe(409);
    expect(early.body.error).toBe('strength_not_cleared');
    expect((await ther.post(`/patients/${emmaId}/strength-clearance`)).status).toBe(400);
    for (let i = 0; i < STRENGTH_TRANSITION.length; i++) expect((await ther.put(`/patients/${emmaId}/transition/${i}`)).status).toBe(200);
    expect((await ther.post(`/patients/${emmaId}/strength-clearance`)).status).toBe(200);
    expect((await ther.get(`/patients/${emmaId}/modules`)).body.strength.cleared.by).toBe('Joris Bakker');

    const started = await patient.post('/patient/programs/start', { templateId: strengthTemplate });
    expect(started.status).toBe(201);
    const progId = started.body.id;
    const sess = (await patient.post('/patient/sessions', { programId: progId })).body;
    const item = (await patient.get(`/patient/programs/${progId}`)).body.items[0];
    for (const [setNo, weightKg, reps] of [[1, 60, 8], [2, 60, 8], [3, 60, 8]])
      expect((await patient.post(`/patient/sessions/${sess.id}/sets`, { programItemId: item.id, setNo, weightKg, reps, rpe: 8 })).status).toBe(200);
    // Correcting a set does not add one.
    expect((await patient.post(`/patient/sessions/${sess.id}/sets`, { programItemId: item.id, setNo: 3, weightKg: 60, reps: 8, rpe: 9 })).status).toBe(200);
    const st = (await patient.get('/patient/strength')).body.exercises.find((e: any) => e.exerciseId === s.exercises.box_squat);
    expect(st.lastSets).toHaveLength(3);
    expect(st.best.value).toBeGreaterThan(70);
    expect(st.advice).toEqual({ kind: 'increase', fromKg: 60, toKgMin: 62.5, toKgMax: 65 });
    expect(st.main).toBe(true);
    expect(st.oneRmTestAllowed).toBe(false);
    const early1rm = await patient.post('/patient/one-rm-tests', { programId: progId, exerciseId: s.exercises.box_squat, screening: { heart: false, dizzy: false, chest: false }, weightKg: 80 });
    expect(early1rm.body.error).toBe('one_rm_too_early');

    // Without consent the therapist sees neither the programme nor its data.
    expect((await ther.get(`/programs/${progId}`)).status).toBe(404);
    expect((await ther.get(`/patients/${emmaId}/strength`)).body).toEqual({ shared: false, exercises: [] });
    expect((await patient.post('/patient/consents/kracht')).status).toBe(200);
    expect((await ther.get(`/programs/${progId}`)).status).toBe(200);
    const shared = (await ther.get(`/patients/${emmaId}/strength`)).body;
    expect(shared.shared).toBe(true);
    expect(shared.exercises[0].lastSets).toHaveLength(3);
    // Another practice never.
    expect((await (await login('therapistB')).get(`/patients/${emmaId}/strength`)).status).toBe(404);

    // Revoking hides again; nothing is deleted.
    expect((await patient.del('/patient/consents/kracht')).status).toBe(200);
    expect((await ther.get(`/programs/${progId}`)).status).toBe(404);
    expect((await patient.get('/patient/strength')).body.exercises[0].lastSets).toHaveLength(3);
    const hist = (await ther.get(`/patients/${emmaId}/modules`)).body.consentHistory;
    expect(hist[0]).toMatchObject({ module: 'kracht' });
    expect(hist[0].revokedAt).toBeTruthy();

    // The patient can stop a programme they started; it stays in the history.
    expect((await patient.post(`/patient/programs/${progId}/stop`)).status).toBe(200);
    expect((await patient.get(`/patient/programs/${progId}`)).body.status).toBe('archived');
    expect((await patient.post(`/patient/programs/${s.programs.emma}/stop`)).status).toBe(404); // not self-started
  });

  it('a 1RM test with a "yes" in the screening is stopped and records no weight', async () => {
    const patient = await login('patientA');
    const progId = (await patient.post('/patient/programs/start', { templateId: strengthTemplate })).body.id;
    await owner((db) => db.query(`UPDATE programs SET start_date = current_date - 35 WHERE id = $1`, [progId]));
    const r = await patient.post('/patient/one-rm-tests', { programId: progId, exerciseId: s.exercises.box_squat, screening: { heart: false, dizzy: true, chest: false }, weightKg: 90 });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ stopped: true });
    const ok = await patient.post('/patient/one-rm-tests', { programId: progId, exerciseId: s.exercises.box_squat, screening: { heart: false, dizzy: false, chest: false } });
    expect(ok.body.error).toBe('weight_required');
    expect((await patient.post('/patient/one-rm-tests', { programId: progId, exerciseId: s.exercises.box_squat, screening: { heart: false, dizzy: false, chest: false }, weightKg: 85 })).status).toBe(201);
    const st = (await patient.get('/patient/strength')).body;
    expect(st.screeningStops).toBeGreaterThanOrEqual(1);
    expect(st.exercises.find((e: any) => e.exerciseId === s.exercises.box_squat).directTests.map((d: any) => d.value)).toContain(85);
  });
});

describe('export and deletion request (W15)', () => {
  it('exports everything about the patient without internal therapist texts', async () => {
    const patient = await login('patientA');
    const r = await patient.get('/patient/export');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-disposition')).toMatch(/attachment/);
    expect(r.body.strengthSets.length).toBeGreaterThan(0);
    expect(r.body.redFlagReports.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.body.programs)).not.toMatch(/"description"|"criteria"|"evidence"/);
  });

  it('only an owner/admin can carry out a deletion request, with a reason or an explicit confirmation', async () => {
    const patient = await login('patientB');
    const noah = s.patients.noah;
    expect((await patient.post('/patient/deletion-request', { reason: 'Behandeling afgerond' })).status).toBe(201);
    expect((await patient.post('/patient/deletion-request', {})).status).toBe(409);
    const req = (await patient.get('/patient/deletion-request')).body.request;
    expect(req.handled_at).toBeNull();

    // Therapists are notified; only the owner/admin (data controller) sees and handles the request.
    const ther = await login('therapistB');
    expect((await ther.get('/me/notifications')).body.items.some((n: any) => n.kind === 'deletion_request')).toBe(true);
    expect((await ther.get(`/patients/${noah}/modules`)).body.deletionRequest).toBeNull();
    const ownerB = await login('ownerB');
    const mod = (await ownerB.get(`/patients/${noah}/modules`)).body;
    expect(mod.deletionRequest.reason).toBe('Behandeling afgerond');
    expect((await ther.post(`/patients/${noah}/deletion/${mod.deletionRequest.id}`, { outcome: 'declined', note: 'x' })).status).toBe(403);
    expect((await ownerB.post(`/patients/${noah}/deletion/${mod.deletionRequest.id}`, { outcome: 'declined' })).body.error).toBe('reason_required');
    expect((await ownerB.post(`/patients/${noah}/deletion/${mod.deletionRequest.id}`, { outcome: 'declined', note: 'Wettelijke bewaartermijn dossier' })).status).toBe(200);
    // New request, this time carried out.
    expect((await patient.post('/patient/deletion-request', {})).status).toBe(201);
    const id2 = (await ownerB.get(`/patients/${noah}/modules`)).body.deletionRequest.id;
    expect((await ownerB.post(`/patients/${noah}/deletion/${id2}`, { outcome: 'deleted' })).body.error).toBe('confirmation_required');
    // Practice A cannot touch practice B's patient.
    expect((await (await login('ownerA')).post(`/patients/${noah}/deletion/${id2}`, { outcome: 'deleted', confirm: 'VERWIJDEREN' })).status).toBe(404);
    expect((await ownerB.post(`/patients/${noah}/deletion/${id2}`, { outcome: 'deleted', confirm: 'VERWIJDEREN' })).status).toBe(200);
    expect((await ownerB.get(`/patients/${noah}`)).status).toBe(404);
    // The login is gone too.
    await expect(login('patientB')).rejects.toThrow(/login patientB failed/);
  });
});

describe('external references on exercises (W14)', () => {
  it('stores a Physitrack id and https video URL for staff only', async () => {
    const c = await login('therapistA');
    const bad = await c.post('/exercises', { nameNl: 'Test extern', nameEn: 'Test external', bodyRegion: 'knee', externalVideoUrl: 'http://onveilig.test/x' });
    expect(bad.status).toBe(400);
    const r = await c.post('/exercises', { nameNl: 'Test extern', nameEn: 'Test external', bodyRegion: 'knee', physitrackId: 'PT-12345', externalVideoUrl: 'https://voorbeeld.test/video' });
    expect(r.status).toBe(201);
    const e = (await c.get(`/exercises/${r.body.id}`)).body;
    expect(e).toMatchObject({ physitrackId: 'PT-12345', externalVideoUrl: 'https://voorbeeld.test/video' });
    // Patients never get these fields (nor clinical notes) through their programme.
    const patient = await login('patientA');
    const prog = (await patient.get(`/patient/programs/${s.programs.emma}`)).body;
    expect(JSON.stringify(prog)).not.toMatch(/physitrack|externalVideoUrl|clinicalNotes/);
  });
});
