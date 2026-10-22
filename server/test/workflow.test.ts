import { describe, it, expect, beforeAll } from 'vitest';
import { Client, login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

describe('therapist → patient → therapist workflow', () => {
  let therapist: Client;
  let patientId: string;
  let programId: string;
  let patient: Client;
  let itemIds: string[];

  it('therapist searches and filters the exercise library', async () => {
    therapist = await login('therapistA');
    const all = await therapist.get('/exercises');
    expect(all.body.total).toBeGreaterThan(40);
    const knee = await therapist.get('/exercises?region=knee');
    expect(knee.body.items.every((e: any) => e.bodyRegion === 'knee')).toBe(true);
    const band = await therapist.get('/exercises?equipment=resistance_band');
    expect(band.body.items.every((e: any) => e.equipment.includes('resistance_band'))).toBe(true);
    const ecc = await therapist.get('/exercises?category=eccentric');
    expect(ecc.body.items.length).toBeGreaterThan(1);
    // full-text: name, muscle and Dutch region label
    expect((await therapist.get('/exercises?q=bekkenbrug')).body.items[0].nameNl).toBe('Bekkenbrug');
    expect((await therapist.get('/exercises?q=soleus')).body.items.length).toBeGreaterThan(0);
    const schouder = await therapist.get('/exercises?q=schouder');
    expect(schouder.body.items.some((e: any) => e.bodyRegion === 'shoulder')).toBe(true);
    const favs = await therapist.get('/exercises?scope=favorites');
    expect(favs.body.items.length).toBe(3);
  });

  it('exercise detail includes therapist-only notes and progressions', async () => {
    const ex = await therapist.get(`/exercises/${s.exercises.glute_bridge}`);
    expect(ex.body.clinicalNotes).toContain('Progressie');
    expect(ex.body.relations.some((r: any) => r.kind === 'progression')).toBe(true);
    expect(ex.body.reviewStatus).toBe('needs_clinical_review');
  });

  it('clinical review is recorded per practice', async () => {
    const id = s.exercises.bird_dog;
    expect((await therapist.get(`/exercises/${id}`)).body.reviewStatus).toBe('needs_clinical_review');
    expect((await therapist.post(`/exercises/${id}/review`)).status).toBe(200);
    const ex = (await therapist.get(`/exercises/${id}`)).body;
    expect(ex.reviewStatus).toBe('reviewed');
    expect(ex.reviewedBy).toBe('Joris Bakker');
    expect((await therapist.get('/exercises?scope=reviewed')).body.items.map((e: any) => e.id)).toEqual([id]);
    expect((await therapist.get('/exercises?scope=unreviewed')).body.items.map((e: any) => e.id)).not.toContain(id);
    // another practice's approval never counts for practice B
    const B = await login('therapistB');
    expect((await B.get(`/exercises/${id}`)).body.reviewStatus).toBe('needs_clinical_review');
    expect((await B.get(`/exercises/${id}`)).body.reviewedBy).toBeNull();
    // undo
    expect((await therapist.del(`/exercises/${id}/review`)).status).toBe(200);
    expect((await therapist.get(`/exercises/${id}`)).body.reviewStatus).toBe('needs_clinical_review');
  });

  it('therapist creates a custom exercise', async () => {
    const r = await therapist.post('/exercises', {
      nameNl: 'Testoefening knie', nameEn: 'Test knee exercise', bodyRegion: 'knee', trainingCategories: ['strength'],
      equipment: ['none'], difficulty: 2, clinicalNotes: 'Intern', defaults: { sets: 3, reps: 10 },
    });
    expect(r.status).toBe(201);
    const found = await therapist.get('/exercises?scope=mine');
    expect(found.body.items.some((e: any) => e.id === r.body.id)).toBe(true);
    // invalid taxonomy keys are rejected
    expect((await therapist.post('/exercises', { nameNl: 'XX', nameEn: 'XX', bodyRegion: 'tail' })).status).toBe(400);
  });

  it('therapist creates a patient and invites them', async () => {
    const r = await therapist.post('/patients', { firstName: 'Test', lastName: 'Patiënt', email: 'test.patient@voorbeeld.test' });
    expect(r.status).toBe(201);
    patientId = r.body.id;
    const list = await therapist.get('/patients?q=Test');
    expect(list.body.items.map((p: any) => p.id)).toContain(patientId);
    const inv = await therapist.post(`/patients/${patientId}/invite`);
    expect(inv.status).toBe(200);
    expect(inv.body.inviteUrl).toMatch(/\/uitnodiging\//);
    const token = inv.body.inviteUrl.split('/').pop();
    // invited but not yet activated
    expect((await therapist.get(`/patients/${patientId}`)).body.hasAccount).toBe(false);
    patient = new Client('newpatient');
    expect((await patient.get(`/auth/invite/${token}`)).body.email).toBe('test.patient@voorbeeld.test');
    expect((await patient.post('/auth/invite/accept', { token, password: 'kort' })).status).toBe(400);
    const acc = await patient.post('/auth/invite/accept', { token, password: 'Mijn-wachtwoord-9' });
    expect(acc.status).toBe(200);
    expect(acc.body.user.patient.id).toBe(patientId);
    expect(acc.body.user.emailVerified).toBe(true);
    expect((await therapist.get(`/patients/${patientId}`)).body.hasAccount).toBe(true);
    expect((await therapist.post(`/patients/${patientId}/invite`)).body.error).toBe('already_activated');
  });

  it('changing the email of an invited (not activated) patient withdraws the pending invite', async () => {
    const r = await therapist.post('/patients', { firstName: 'Fout', lastName: 'Adres', email: 'fout.adres@voorbeeld.test' });
    const inv = await therapist.post(`/patients/${r.body.id}/invite`);
    const token = inv.body.inviteUrl.split('/').pop();
    expect((await therapist.patch(`/patients/${r.body.id}`, { firstName: 'Fout', lastName: 'Adres', email: 'goed.adres@voorbeeld.test' })).status).toBe(200);
    expect((await new Client().get(`/auth/invite/${token}`)).status).toBe(404);
    const p = (await therapist.get(`/patients/${r.body.id}`)).body;
    expect(p.invitedAt).toBeNull();
    expect(p.email).toBe('goed.adres@voorbeeld.test');
  });

  it('therapist builds and assigns a program', async () => {
    const r = await therapist.post('/programs', {
      patientId,
      title: 'Knie basis',
      patientInstructions: 'Rustig opbouwen.',
      startDate: new Date().toISOString().slice(0, 10),
      status: 'draft',
      items: [
        { exerciseId: s.exercises.quad_set, sets: 3, reps: 10, holdS: 5, days: [1, 2, 3, 4, 5, 6, 7], notes: 'Let op volledige strekking' },
        { exerciseId: s.exercises.box_squat, sets: 3, reps: 8, load: 'lichaamsgewicht', tempo: '3-0-2', days: [1, 2, 3, 4, 5, 6, 7] },
        { exerciseId: s.exercises.sl_stance, sets: 3, holdS: 30, days: [1, 2, 3, 4, 5, 6, 7], alternativeExerciseId: s.exercises.balance_pad_reach },
      ],
    });
    expect(r.status).toBe(201);
    programId = r.body.id;
    // Draft programs are invisible to the patient
    expect((await patient.get(`/patient/programs/${programId}`)).status).toBe(404);
    expect((await therapist.post(`/programs/${programId}/status`, { status: 'active' })).status).toBe(200);
    const p = await therapist.get(`/programs/${programId}`);
    expect(p.body.items).toHaveLength(3);
    expect(p.body.items[1].load).toBe('lichaamsgewicht');
    expect(p.body.items[2].alternative.nameNl).toBeTruthy();
    itemIds = p.body.items.map((i: any) => i.id);
  });

  it('patient sees the program on their home screen with a notification', async () => {
    const home = await patient.get('/patient/home');
    expect(home.status).toBe(200);
    expect(home.body.programs).toHaveLength(1);
    expect(home.body.programs[0].today.scheduled).toBe(3);
    expect(home.body.notifications[0].kind).toBe('program_assigned');
    const prog = await patient.get(`/patient/programs/${programId}`);
    expect(prog.body.items[0].notes).toBe('Let op volledige strekking');
    // patient cannot read therapist-only clinical notes
    const ex = await patient.get(`/exercises/${s.exercises.quad_set}`);
    expect(ex.body.clinicalNotes).toBeUndefined();
    // patient cannot use therapist endpoints
    expect((await patient.get('/patients')).status).toBe(403);
    expect((await patient.get(`/programs/${programId}`)).status).toBe(403);
  });

  it('patient completes a session with feedback', async () => {
    const sess = await patient.post('/patient/sessions', { programId });
    expect(sess.status).toBe(201);
    const sid = sess.body.id;
    // starting again resumes the open session
    expect((await patient.post('/patient/sessions', { programId })).body.id).toBe(sid);
    await patient.post(`/patient/sessions/${sid}/logs`, { programItemId: itemIds[0], completed: true, setsDone: 3, repsDone: 10, difficulty: 3, pain: 1 });
    await patient.post(`/patient/sessions/${sid}/logs`, { programItemId: itemIds[1], completed: true, setsDone: 3, repsDone: 8, difficulty: 6, pain: 7, feedback: 'Pijn bij diep zakken' });
    await patient.post(`/patient/sessions/${sid}/logs`, { programItemId: itemIds[2], completed: false });
    // item from another program is rejected
    expect((await patient.post(`/patient/sessions/${sid}/logs`, { programItemId: s.exercises.quad_set, completed: true })).status).toBe(400);
    expect((await patient.post(`/patient/sessions/${sid}/complete`, { difficulty: 5, pain: 3, feedback: 'Ging goed' })).status).toBe(200);
    // Completing again (e.g. an offline sync replay) is harmless and keeps the original answers.
    expect((await patient.post(`/patient/sessions/${sid}/complete`, {})).status).toBe(200);
    expect((await patient.post(`/patient/sessions/${sid}/logs`, { programItemId: itemIds[0], completed: true })).status).toBe(400);
    const hist = await patient.get('/patient/history');
    expect(hist.body.sessions[0].exercisesDone).toBe(2);
  });

  it('therapist reviews progress, feedback and attention signals', async () => {
    const prog = await therapist.get(`/patients/${patientId}/progress`);
    expect(prog.body.completedSessions).toBe(1);
    const sess = prog.body.sessions[0];
    expect(sess.feedback).toBe('Ging goed');
    expect(sess.logs.find((l: any) => l.pain === 7).feedback).toBe('Pijn bij diep zakken');
    expect(prog.body.adherence7d.completed).toBe(1);
    const dash = await therapist.get('/dashboard');
    const att = dash.body.attention.find((a: any) => a.patientId === patientId);
    expect(att.reasons).toContain('high_pain');
    expect(att.reasons).toContain('new_feedback');
    const notes = await therapist.get('/me/notifications');
    expect(notes.body.items.some((n: any) => n.kind === 'feedback_received')).toBe(true);
    expect((await therapist.post(`/patients/sessions/${sess.id}/review`)).status).toBe(200);
  });

  it('therapist modifies the program and a new version is recorded', async () => {
    const cur = (await therapist.get(`/programs/${programId}`)).body;
    const items = cur.items.map((i: any) => ({ id: i.id, exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, holdS: i.holdS, days: i.days, notes: i.notes }));
    items[1].reps = 6; // regress squat volume after pain report
    items.reverse();
    const r = await therapist.put(`/programs/${programId}`, { title: 'Knie basis (aangepast)', items, changeNote: 'Volume squat verlaagd', startDate: cur.startDate });
    expect(r.status).toBe(200);
    const after = (await therapist.get(`/programs/${programId}`)).body;
    expect(after.version).toBe(2);
    expect(after.items[0].exerciseId).toBe(s.exercises.sl_stance);
    expect(after.items.find((i: any) => i.exerciseId === s.exercises.box_squat).reps).toBe(6);
    // item ids are preserved so history stays linked
    expect(after.items.map((i: any) => i.id).sort()).toEqual([...itemIds].sort());
    const versions = await therapist.get(`/programs/${programId}/versions`);
    expect(versions.body.items.map((v: any) => v.version)).toEqual([2, 1]);
    expect(versions.body.items[0].changeNote).toBe('Volume squat verlaagd');
    const home = await patient.get('/patient/home');
    expect(home.body.notifications.some((n: any) => n.kind === 'program_updated')).toBe(true);
  });

  it('templates: list, favorite, instantiate for a patient, save program as template, duplicate', async () => {
    const t = await therapist.get('/programs/templates');
    expect(t.body.items.length).toBeGreaterThanOrEqual(9);
    const acl = t.body.items.find((x: any) => x.title.startsWith('VKB-revalidatie fase 1'));
    const fromTemplate = await therapist.post(`/programs/${acl.id}/duplicate`, { patientId });
    expect(fromTemplate.status).toBe(201);
    const created = (await therapist.get(`/programs/${fromTemplate.body.id}`)).body;
    expect(created.status).toBe('draft');
    expect(created.sourceTemplateId).toBe(acl.id);
    expect(created.items.length).toBe(5);
    const asTemplate = await therapist.post(`/programs/${programId}/duplicate`, { asTemplate: true, title: 'Mijn knie-sjabloon' });
    expect(asTemplate.status).toBe(201);
    await therapist.post(`/programs/${asTemplate.body.id}/favorite`);
    const t2 = await therapist.get('/programs/templates');
    expect(t2.body.items.find((x: any) => x.id === asTemplate.body.id).favorite).toBe(true);
    // draft can be deleted, active cannot
    expect((await therapist.del(`/programs/${fromTemplate.body.id}`)).status).toBe(200);
    expect((await therapist.del(`/programs/${programId}`)).status).toBe(404);
  });

  it('archiving a patient archives their programs; export contains their data', async () => {
    const exp = await therapist.get(`/patients/${patientId}/export`);
    expect(exp.body.sessions).toHaveLength(1);
    expect(exp.body.exerciseLogs).toHaveLength(3);
    expect((await therapist.post(`/patients/${patientId}/archive`)).status).toBe(200);
    const p = (await therapist.get(`/patients/${patientId}`)).body;
    expect(p.archived).toBe(true);
    expect(p.programs.every((x: any) => x.status === 'archived' || x.status === 'completed')).toBe(true);
    expect((await therapist.get('/patients')).body.items.some((x: any) => x.id === patientId)).toBe(false);
    expect((await therapist.get('/patients?status=archived')).body.items.some((x: any) => x.id === patientId)).toBe(true);
  });

  it('seeded activity produces adherence statistics', async () => {
    const prog = await therapist.get(`/patients/${s.patients.emma}/progress?weeks=4`);
    expect(prog.body.weekly).toHaveLength(4);
    expect(prog.body.completedSessions).toBeGreaterThan(5);
    expect(prog.body.adherence28d.rate).toBeGreaterThan(0.3);
    expect(prog.body.perExercise.length).toBeGreaterThan(0);
  });
});
