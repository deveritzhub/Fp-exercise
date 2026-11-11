import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

describe('krachtlog with 1RM meter', () => {
  it('the patient logs sets anywhere; the practice logs in the practice; sharing follows consent', async () => {
    const patient = await login('patientA');
    const ther = await login('therapistA');
    const emma = s.patients.emma;

    // Validation.
    expect((await patient.post('/patient/gym/sets', { exerciseName: 'S', weightKg: 50, reps: 5 })).status).toBe(400);
    expect((await patient.post('/patient/gym/sets', { exerciseName: 'Squat', weightKg: 50, reps: 0 })).status).toBe(400);
    expect((await patient.post('/patient/gym/sets', { exerciseName: 'Squat', weightKg: 50, reps: 5, place: 'moon' })).status).toBe(400);
    expect((await patient.post('/patient/gym/sets', { exerciseName: 'Squat', weightKg: 50, reps: 5, day: '2999-01-01' })).body.error).toBe('future_day');

    // Two days in the gym: the second day is a new best (PR) and set numbers count per exercise.
    const d1 = await patient.post('/patient/gym/sets', { exerciseName: 'Squat', weightKg: 80, reps: 5, day: '2026-10-01' });
    expect(d1.status).toBe(201);
    expect(d1.body).toMatchObject({ setNo: 1, estimate: 91.5, pr: false });
    expect((await patient.post('/patient/gym/sets', { exerciseName: ' squat ', weightKg: 80, reps: 6, day: '2026-10-01' })).body.setNo).toBe(2);
    const pr = await patient.post('/patient/gym/sets', { exerciseName: 'Squat', weightKg: 90, reps: 5, day: '2026-10-08' });
    expect(pr.body).toMatchObject({ setNo: 1, pr: true });
    await patient.post('/patient/gym/sets', { exerciseName: 'Leg press', weightKg: 120, reps: 12, place: 'home' });

    const mine = (await patient.get('/patient/gym')).body;
    expect(mine.sets).toHaveLength(4);
    const squat = mine.exercises.find((e: { key: string }) => e.key === 'squat');
    expect(squat.best.value).toBe(103);
    expect(squat.latestIsPr).toBe(true);
    expect(mine.exercises.find((e: { key: string }) => e.key === 'leg press').best).toBeNull(); // 12 reps: no estimate

    // The therapist logs in the practice and sees only those sets without consent.
    const inPractice = await ther.post(`/patients/${emma}/gym/sets`, { exerciseName: 'Squat', weightKg: 85, reps: 5, place: 'gym' });
    expect(inPractice.status).toBe(201);
    let staff = (await ther.get(`/patients/${emma}/gym`)).body;
    expect(staff.sharedByPatient).toBe(false);
    expect(staff.sets).toHaveLength(1);
    expect(staff.sets[0]).toMatchObject({ place: 'practice', mine: true, byPatient: false });
    // The patient sees everything, including the practice set.
    expect((await patient.get('/patient/gym')).body.sets).toHaveLength(5);

    // With consent for the strength module the practice also sees the gym sets.
    expect((await patient.post('/patient/consents/kracht')).status).toBe(200);
    staff = (await ther.get(`/patients/${emma}/gym`)).body;
    expect(staff.sharedByPatient).toBe(true);
    expect(staff.sets).toHaveLength(5);

    // Each side deletes only its own entries.
    expect((await ther.del(`/patients/${emma}/gym/sets/${d1.body.id}`)).status).toBe(404);
    expect((await patient.del(`/patient/gym/sets/${inPractice.body.id}`)).status).toBe(404);
    expect((await patient.del(`/patient/gym/sets/${d1.body.id}`)).status).toBe(200);
    expect((await ther.del(`/patients/${emma}/gym/sets/${inPractice.body.id}`)).status).toBe(200);

    // Another practice never.
    const other = await login('therapistB');
    expect((await other.get(`/patients/${emma}/gym`)).status).toBe(404);
    expect((await other.post(`/patients/${emma}/gym/sets`, { exerciseName: 'Squat', weightKg: 85, reps: 5 })).status).toBe(404);
  });
});

describe('Strength level follows real lifts', () => {
  it('reports the ceiling from the best compound lift relative to body weight', async () => {
    const patient = await login('patientB');
    await patient.put('/patient/hero', { heroName: 'Noah', frame: 'm', build: 'average', skin: 's3', hair: 'short', hairColor: 'darkbrown', eyeColor: 'brown', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'fitness' });
    const strength = async () => (await patient.get('/patient/hero')).body.skills.find((k: { key: string }) => k.key === 'strength');
    // No compound lift yet: the base ceiling.
    expect((await strength()).ceiling).toMatchObject({ cap: 50, reason: 'no_compound' });
    await patient.post('/patient/gym/sets', { exerciseName: 'Back squat', weightKg: 100, reps: 5 });
    // Compound lift, but no body weight.
    expect((await strength()).ceiling).toMatchObject({ reason: 'no_weight' });
    expect((await patient.post('/patient/logs/weight', { kg: 80 })).status).toBe(201);
    // 114.5 kg estimated / 80 kg = 1.43 × body weight: between novice (1.25) and intermediate (1.5).
    const c = (await strength()).ceiling;
    expect(c).toMatchObject({ reason: 'ok', tier: 2, best: { lift: 'squat', oneRmKg: 114.5, ratio: 1.43 }, next: { lift: 'squat', kg: 120, cap: 72 } });
    expect(c.cap).toBeGreaterThan(62);
    expect(c.cap).toBeLessThan(72);
  });
});

describe('own routines and RIR', () => {
  it('saves routines on the patient account only, and stores RIR with a set', async () => {
    resetRateLimits();
    const p = await login('patientA');
    // RIR is optional and validated.
    const set = await p.post('/patient/gym/sets', { exerciseName: 'Goblet squat', weightKg: 20, reps: 10, rir: 2 });
    expect(set.status).toBe(201);
    expect((await p.post('/patient/gym/sets', { exerciseName: 'Goblet squat', weightKg: 20, reps: 10, rir: 11 })).status).toBe(400);
    const sets = (await p.get('/patient/gym')).body.sets as { id: string; rir: number | null }[];
    expect(sets.find((s) => s.id === set.body.id)?.rir).toBe(2);

    // A routine: create, read, update, delete.
    const body = { name: 'Benen', items: [{ exerciseName: 'Goblet squat', sets: 3, repsMin: 8, repsMax: 12 }, { exerciseName: 'Hip thrust', sets: 4, repsMin: 6, repsMax: 10, restS: 120 }] };
    const made = await p.post('/patient/gym/routines', body);
    expect(made.status).toBe(201);
    expect(made.body.items).toHaveLength(2);
    expect((await p.post('/patient/gym/routines', { name: 'X', items: [] })).status).toBe(400);
    expect((await p.post('/patient/gym/routines', { name: 'Fout', items: [{ exerciseName: 'Squat', sets: 3, repsMin: 12, repsMax: 8 }] })).status).toBe(400);
    const upd = await p.put(`/patient/gym/routines/${made.body.id}`, { ...body, name: 'Benen zwaar' });
    expect(upd.body.name).toBe('Benen zwaar');
    expect((await p.get('/patient/gym/routines')).body.map((r: { name: string }) => r.name)).toContain('Benen zwaar');

    // Another patient cannot see, change or delete it.
    const other = await login('patientB');
    expect((await other.get('/patient/gym/routines')).body.map((r: { id: string }) => r.id)).not.toContain(made.body.id);
    expect((await other.put(`/patient/gym/routines/${made.body.id}`, body)).status).toBe(404);
    expect((await other.del(`/patient/gym/routines/${made.body.id}`)).status).toBe(404);

    expect((await p.del(`/patient/gym/routines/${made.body.id}`)).status).toBe(200);
    expect((await p.get('/patient/gym/routines')).body.map((r: { id: string }) => r.id)).not.toContain(made.body.id);
    await p.del(`/patient/gym/sets/${set.body.id}`);
  });
});
