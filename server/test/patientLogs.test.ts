import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { LOG_XP } from '../../shared/patientLogs';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

const skill = (body: { skills: { key: string; xp: number }[] }, key: string) => body.skills.find((k) => k.key === key)!.xp;

describe('self-logged workouts and protein', () => {
  it('awards XP once for a protein goal and for an own workout, and keeps the logs private', async () => {
    const patient = await login('patientA');
    const before = (await patient.get('/patient/hero')).body;
    expect(before.logs.protein.goal).toBeNull();
    expect(before.skills).toHaveLength(9);

    expect((await patient.put('/patient/logs/protein-goal', { grams: 10 })).status).toBe(400);
    expect((await patient.put('/patient/logs/protein-goal', { grams: 60 })).status).toBe(200);
    expect((await patient.post('/patient/logs/protein', { grams: 30, label: 'Ontbijt' })).status).toBe(201);
    let st = (await patient.get('/patient/hero')).body;
    expect(st.logs.protein).toMatchObject({ grams: 30, hit: false, goal: 60 });
    expect(skill(st, 'discipline')).toBe(skill(before, 'discipline'));
    expect(st.level.xp).toBe(before.level.xp);

    expect((await patient.post('/patient/logs/protein', { grams: 30, label: 'Lunch' })).status).toBe(201);
    st = (await patient.get('/patient/hero')).body;
    expect(st.logs.protein.hit).toBe(true);
    expect(skill(st, 'discipline')).toBe(skill(before, 'discipline') + LOG_XP.proteinDiscipline);
    expect(st.level.xp).toBe(before.level.xp + LOG_XP.proteinGoal);

    // More grams the same day do not pay again.
    expect((await patient.post('/patient/logs/protein', { grams: 20 })).status).toBe(201);
    st = (await patient.get('/patient/hero')).body;
    expect(skill(st, 'discipline')).toBe(skill(before, 'discipline') + LOG_XP.proteinDiscipline);
    expect(st.level.xp).toBe(before.level.xp + LOG_XP.proteinGoal);

    expect((await patient.post('/patient/logs/trainings', { kind: 'walk', minutes: 2 })).body.error).toBe('bad_minutes');
    expect((await patient.post('/patient/logs/trainings', { kind: 'walk', minutes: 25, pain: 8, note: 'Park' })).status).toBe(201);
    st = (await patient.get('/patient/hero')).body;
    expect(skill(st, 'endurance')).toBe(skill(before, 'endurance') + LOG_XP.selfSkill);
    expect(skill(st, 'discipline')).toBe(skill(before, 'discipline') + LOG_XP.proteinDiscipline + LOG_XP.selfDiscipline);
    expect(skill(st, 'recovery')).toBe(skill(before, 'recovery') + LOG_XP.selfPainSkill);
    expect(st.level.xp).toBe(before.level.xp + LOG_XP.proteinGoal + LOG_XP.selfSession + LOG_XP.selfPain);

    const strength = skill(st, 'strength');
    expect((await patient.post('/patient/logs/trainings', { kind: 'strength', minutes: 20, pain: 9, stoppedForPain: true })).status).toBe(201);
    st = (await patient.get('/patient/hero')).body;
    expect(skill(st, 'strength')).toBe(strength);
    expect(skill(st, 'recovery')).toBe(skill(before, 'recovery') + LOG_XP.selfPainSkill + LOG_XP.selfStoppedSkill);

    expect((await patient.post('/patient/logs/trainings', { kind: 'walk', minutes: 20 })).status).toBe(201);
    expect((await patient.post('/patient/logs/trainings', { kind: 'walk', minutes: 20 })).status).toBe(201);
    st = (await patient.get('/patient/hero')).body;
    expect(skill(st, 'discipline')).toBe(skill(before, 'discipline') + LOG_XP.proteinDiscipline + 2 * LOG_XP.selfDiscipline);

    const exp = (await patient.get('/patient/export')).body;
    expect(exp.proteinLogs.length).toBe(3);
    expect(exp.selfTrainings.length).toBe(4);
    expect(Number(exp.proteinGoal.grams)).toBe(60);

    const ther = await login('therapistA');
    const staff = (await ther.get(`/patients/${s.patients.emma}/export`)).body;
    expect(staff.proteinLogs).toBeUndefined();
    expect(staff.selfTrainings).toBeUndefined();
    expect((await ther.get(`/patients/${s.patients.emma}/hero`)).body.logs).toBeUndefined();

    const other = await login('patientB');
    expect((await other.get('/patient/hero')).body.logs.protein.entries).toEqual([]);
    const id = (await patient.get('/patient/hero')).body.logs.trainings[0].id as string;
    expect((await other.del(`/patient/logs/trainings/${id}`)).status).toBe(404);
    expect((await patient.del(`/patient/logs/trainings/${id}`)).status).toBe(200);
  });
});
