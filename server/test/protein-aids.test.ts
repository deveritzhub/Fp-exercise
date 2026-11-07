import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

describe('protein levels from weight', () => {
  it('needs a weight, then the goal follows the chosen level and the latest weight', async () => {
    const p = await login('patientA');
    await p.put('/patient/hero', { heroName: 'Emma', frame: 'f', build: 'average', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' });
    expect((await p.put('/patient/logs/protein-goal', { tier: 'optimal' })).body.error).toBe('weight_required');
    expect((await p.post('/patient/logs/weight', { kg: 80 })).status).toBe(201);
    expect((await p.put('/patient/logs/protein-goal', { tier: 'optimal' })).status).toBe(200);
    let st = (await p.get('/patient/hero')).body.logs;
    expect(st.protein).toMatchObject({ tier: 'optimal', goal: 130, zone: 'below' });
    expect(st.protein.targets).toMatchObject({ minimum: 65, suboptimal: 95, optimal: 130 });
    expect(st.weight).toMatchObject({ latestKg: 80, olderAdult: false });
    expect(st.weight.history).toEqual([expect.objectContaining({ kg: 80 })]);

    // New weight (same day replaces): goal follows.
    await p.post('/patient/logs/weight', { kg: 70 });
    st = (await p.get('/patient/hero')).body.logs;
    expect(st.protein.goal).toBe(110);
    expect(st.weight.history).toHaveLength(1);

    // 65+: minimum goes up.
    await p.put('/patient/logs/older-adult', { olderAdult: true });
    st = (await p.get('/patient/hero')).body.logs;
    expect(st.protein.targets.minimum).toBe(70);

    // Logging protein moves through the zones; reaching the goal earns XP once.
    const before = (await p.get('/patient/hero')).body.level.xp;
    await p.post('/patient/logs/protein', { grams: 75 });
    expect((await p.get('/patient/hero')).body.logs.protein.zone).toBe('minimum');
    await p.post('/patient/logs/protein', { grams: 40 });
    const after = (await p.get('/patient/hero')).body;
    expect(after.logs.protein).toMatchObject({ zone: 'optimal', hit: true });
    expect(after.level.xp).toBeGreaterThan(before);

    // An own number of grams still works and clears the level.
    await p.put('/patient/logs/protein-goal', { grams: 100 });
    expect((await p.get('/patient/hero')).body.logs.protein).toMatchObject({ tier: null, goal: 100 });

    // The practice never sees weight.
    const ther = await login('therapistA');
    expect(JSON.stringify((await ther.get(`/patients/${s.patients.emma}/hero`)).body)).not.toMatch(/latestKg|weight_logs|"kg"/);
    expect((await p.post('/patient/logs/weight', { kg: 10 })).status).toBe(400);
  });
});

describe('walking aids on the hero', () => {
  it('the therapist switches crutches on; the patient sees them, friends do not, the patient cannot change it', async () => {
    const ther = await login('therapistA');
    expect((await ther.put(`/patients/${s.patients.emma}/hero/aids`, { crutches: true })).status).toBe(200);
    expect((await ther.get(`/patients/${s.patients.emma}/hero`)).body.aids).toEqual(['crutches']);
    const p = await login('patientA');
    expect((await p.get('/patient/hero')).body.aids).toEqual(['crutches']);
    // Not on the friend card.
    await p.put('/patient/hero/sharing', { enabled: true });
    const card = (await p.get('/patient/hero')).body;
    expect(JSON.stringify(card.hero ?? {})).not.toContain('crutches');
    // Patient cannot switch it, another practice cannot either.
    expect((await p.put(`/patients/${s.patients.emma}/hero/aids`, { crutches: false })).status).toBe(403);
    expect((await (await login('therapistB')).put(`/patients/${s.patients.emma}/hero/aids`, { crutches: false })).status).toBe(404);
    expect((await ther.put(`/patients/${s.patients.emma}/hero/aids`, { crutches: false })).status).toBe(200);
    expect((await p.get('/patient/hero')).body.aids).toEqual([]);
  });
});
