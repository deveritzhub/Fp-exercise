import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

const LOOK = { heroName: 'Emma de Sprinter', frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'round', outfit: 'forest', sport: 'running' };

describe('sports hero', () => {
  it('the patient creates a hero, checks in pain and earns XP; the own therapist sees the body map', async () => {
    const patient = await login('patientA');
    const before = (await patient.get('/patient/hero')).body;
    expect(before.hero).toBeNull();
    expect(before.level.level).toBeGreaterThanOrEqual(1);

    expect((await patient.put('/patient/hero', { ...LOOK, skin: 'pink' })).status).toBe(400);
    expect((await patient.put('/patient/hero', LOOK)).status).toBe(200);
    expect((await patient.put('/patient/hero', { ...LOOK, outfit: 'ocean' })).status).toBe(200);

    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'elbow_x', score: 3 }] })).body.error).toBe('unknown_body_area');
    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'knee_l', score: 11 }] })).status).toBe(400);
    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'knee_l', score: 6 }, { area: 'lower_back', score: 4 }] })).status).toBe(201);
    await new Promise((r) => setTimeout(r, 20));
    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'knee_l', score: 2 }] })).status).toBe(201);

    const after = (await patient.get('/patient/hero')).body;
    expect(after.hero).toMatchObject({ heroName: 'Emma de Sprinter', outfit: 'ocean', build: 'athletic', hairColor: 'blond', glasses: 'round' });
    expect(after.painMap.baseline.entries).toEqual([{ area: 'knee_l', score: 6 }, { area: 'lower_back', score: 4 }]);
    expect(after.painMap.current.entries).toEqual([{ area: 'knee_l', score: 2 }]);
    expect(after.level.xp).toBeGreaterThan(before.level.xp); // check-in week counts
    const recovery = after.skills.find((k: { key: string }) => k.key === 'recovery');
    expect(recovery.xp).toBeGreaterThan(0);
    expect(after.skills).toHaveLength(9);
    expect(after.totalLevel).toBeGreaterThanOrEqual(9);
    // Discipline: XP per completed workout and per full week.
    expect(after.skills.find((k: { key: string }) => k.key === 'discipline').xp).toBe(after.totals.sessions * 20 + after.totals.fullWeeks * 50);
    expect(after.badges.find((b: { key: string }) => b.key === 'pain_down').earned).toBe(true);

    // "No pain" is a valid check-in too.
    expect((await patient.post('/patient/hero/pain-map', { entries: [] })).status).toBe(201);
    expect((await patient.get('/patient/hero')).body.painMap.current.entries).toEqual([]);

    const ther = await login('therapistA');
    const seen = (await ther.get(`/patients/${s.patients.emma}/hero`)).body;
    expect(seen.hero.heroName).toBe('Emma de Sprinter');
    expect(seen.painMap.baseline.entries).toHaveLength(2);

    // Another practice sees nothing.
    expect((await (await login('therapistB')).get(`/patients/${s.patients.emma}/hero`)).status).toBe(404);
    const exp = (await patient.get('/patient/export')).body;
    expect(exp.hero.hero_name).toBe('Emma de Sprinter');
    expect(exp.painMap.length).toBe(3);
  });

  it('a patient cannot see another patient’s hero', async () => {
    const other = await login('patientB');
    expect((await other.get('/patient/hero')).body.hero).toBeNull();
    expect((await other.get(`/patients/${s.patients.emma}/hero`)).status).toBe(403);
  });
});

describe('weekly quests, gear, daily check-in, trends', () => {
  it('gives quests, a daily check-in and a pain trend; gear only when unlocked', async () => {
    const patient = await login('patientA');
    await patient.put('/patient/hero', LOOK);
    const st = (await patient.get('/patient/hero')).body;
    expect(st.weekly.quests.map((q: { key: string }) => q.key)).toEqual(['train', 'checkin', 'skill']);
    expect(st.weekly.quests[0].target).toBeLessThanOrEqual(3);

    // Daily check-in: once per day, can be changed; counts as this week's check-in.
    expect((await patient.post('/patient/hero/checkin', { area: 'knee_l', score: 4 })).status).toBe(201);
    expect((await patient.post('/patient/hero/checkin', { area: 'knee_l', score: 3 })).status).toBe(201);
    expect((await patient.post('/patient/hero/checkin', { area: 'tail', score: 3 })).body.error).toBe('unknown_body_area');
    const after = (await patient.get('/patient/hero')).body;
    expect(after.checkin.today).toMatchObject({ area: 'knee_l', score: 3 });
    expect(after.weekly.quests[1].done).toBe(true);
    const knee = after.trends.find((t: { area: string }) => t.area === 'knee_l');
    expect(knee.points.at(-1)).toMatchObject({ score: 3, source: 'daily' });

    // Gear: locked items cannot be worn.
    const locked = after.gear.unlocked.includes('gold_shoes') ? null : 'gold_shoes';
    if (locked) expect((await patient.put('/patient/hero/gear', { equipped: [locked] })).body.error).toBe('gear_locked');
    expect((await patient.put('/patient/hero/gear', { equipped: ['cape'] })).body.error).toBe('unknown_gear');
    expect((await patient.put('/patient/hero/gear', { equipped: after.gear.unlocked })).status).toBe(200);

    // The therapist sees the trend; another practice does not.
    const ther = await login('therapistA');
    const seen = (await ther.get(`/patients/${s.patients.emma}/hero`)).body;
    expect(seen.trends.find((t: { area: string }) => t.area === 'knee_l')).toBeTruthy();
    expect(seen.weekly.length).toBe(12);
    expect((await (await login('therapistB')).get(`/patients/${s.patients.emma}/hero`)).status).toBe(404);
  });
});
