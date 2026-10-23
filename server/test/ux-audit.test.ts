import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { itemsForDate } from '../../shared/schedule';
import { toISODate } from '../../shared/adherence';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

describe('patient preview equals the patient app (P0)', () => {
  it('the app shows exactly the exercises the shared planning gives for today', async () => {
    const patient = await login('patientA');
    const home = (await patient.get('/patient/home')).body;
    const prog = (await patient.get(`/patient/programs/${s.programs.emma}`)).body;
    const expected = itemsForDate({ startDate: prog.startDate, endDate: prog.endDate }, prog.items, toISODate(new Date())).map((i: any) => i.id);
    const shown = home.programs.find((p: any) => p.id === s.programs.emma);
    expect(shown.today.items.map((i: any) => i.id)).toEqual(expected);
    // The seeded programme has exercises on different weekdays, so not every exercise is shown each day.
    expect(expected.length).toBeLessThan(prog.items.length);
  });
});

describe('substitute exercise (P0)', () => {
  const items = (cur: any) => cur.items.map((i: any) => ({ id: i.id, exerciseId: i.exerciseId, alternativeExerciseId: i.alternativeExerciseId, sets: i.sets, reps: i.reps, holdS: i.holdS, days: i.days, notes: i.notes }));

  it('refuses a progression as substitute', async () => {
    const c = await login('therapistA');
    const cur = (await c.get(`/programs/${s.programs.emma}`)).body;
    const list = items(cur);
    const spanish = list.find((i: any) => i.exerciseId === s.exercises.spanish_squat);
    spanish.alternativeExerciseId = s.exercises.decline_squat_ecc; // recorded as a progression of the Spanish squat
    const r = await c.put(`/programs/${s.programs.emma}`, { title: cur.title, items: list, startDate: cur.startDate, endDate: cur.endDate });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('alternative_is_progression');
  });

  it('accepts an equivalent alternative or a regression chosen by the therapist', async () => {
    const c = await login('therapistA');
    const cur = (await c.get(`/programs/${s.programs.emma}`)).body;
    const list = items(cur);
    const decline = list.find((i: any) => i.exerciseId === s.exercises.decline_squat_ecc);
    decline.alternativeExerciseId = s.exercises.spanish_squat; // regression of the decline squat
    const r = await c.put(`/programs/${s.programs.emma}`, { title: cur.title, items: list, startDate: cur.startDate, endDate: cur.endDate, changeNote: 'Vervanger' });
    expect(r.status).toBe(200);
    const patient = await login('patientA');
    const prog = (await patient.get(`/patient/programs/${s.programs.emma}`)).body;
    expect(prog.items.find((i: any) => i.exerciseId === s.exercises.decline_squat_ecc).alternative.nameNl).toBe('Spaanse squat');
  });
});
