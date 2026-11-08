import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

describe('therapist chooses the skill quest', () => {
  it('sets the skill from this week on; the patient sees it as chosen by the therapist; back to automatic', async () => {
    const ther = await login('therapistA');
    expect((await ther.put(`/patients/${s.patients.emma}/hero/focus`, { skill: 'balance' })).status).toBe(200);
    const emma = await login('patientA');
    const q = (await emma.get('/patient/hero')).body.weekly.quests.find((x: any) => x.key === 'skill');
    expect(q).toMatchObject({ skill: 'balance', byTherapist: true });
    const staffView = (await ther.get(`/patients/${s.patients.emma}/hero`)).body.questFocus;
    expect(staffView).toMatchObject({ skill: 'balance', byTherapist: true });
    expect(Array.isArray(staffView.programmeSkills)).toBe(true);
    // Back to automatic.
    await ther.put(`/patients/${s.patients.emma}/hero/focus`, { skill: null });
    expect((await emma.get('/patient/hero')).body.weekly.quests.find((x: any) => x.key === 'skill').byTherapist).toBeUndefined();
  });

  it('only known skills, only own patients, never by the patient', async () => {
    const ther = await login('therapistA');
    expect((await ther.put(`/patients/${s.patients.emma}/hero/focus`, { skill: 'flying' })).status).toBe(400);
    expect((await (await login('therapistB')).put(`/patients/${s.patients.emma}/hero/focus`, { skill: 'balance' })).status).toBe(404);
    expect((await (await login('patientA')).put(`/patients/${s.patients.emma}/hero/focus`, { skill: 'balance' })).status).toBe(403);
  });
});
