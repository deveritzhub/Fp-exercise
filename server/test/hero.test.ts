import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

const LOOK = { heroName: 'Emma de Sprinter', skin: 's3', hair: 'long', outfit: 'forest', sport: 'running' };

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
    expect(after.hero).toMatchObject({ heroName: 'Emma de Sprinter', outfit: 'ocean' });
    expect(after.painMap.baseline.entries).toEqual([{ area: 'knee_l', score: 6 }, { area: 'lower_back', score: 4 }]);
    expect(after.painMap.current.entries).toEqual([{ area: 'knee_l', score: 2 }]);
    expect(after.level.xp).toBeGreaterThan(before.level.xp); // check-in week counts
    expect(after.stats.recovery).toBeGreaterThan(0);
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
