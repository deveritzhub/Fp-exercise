import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

describe('survival: water and sleep', () => {
  it('water fills to a goal from weight, pays once a day, has a daily maximum; sleep sets the score', async () => {
    const p = await login('patientA');
    await p.put('/patient/hero', { heroName: 'Emma', frame: 'f', build: 'average', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' });
    await p.post('/patient/logs/weight', { kg: 60 });
    let st = (await p.get('/patient/hero')).body;
    expect(st.logs.survival.water).toMatchObject({ ml: 0, target: 1800 });
    const xp0 = st.level.xp;
    for (let i = 0; i < 4; i++) expect((await p.post('/patient/logs/water', { ml: 500 })).status).toBe(201);
    st = (await p.get('/patient/hero')).body;
    expect(st.logs.survival.water.ml).toBe(2000);
    expect(st.logs.survival.status.map((x: { key: string }) => x.key)).toContain('hydrated');
    expect(st.level.xp).toBe(xp0 + 10);
    await p.post('/patient/logs/water', { ml: 250 });
    expect((await p.get('/patient/hero')).body.level.xp).toBe(xp0 + 10); // once a day
    for (let i = 0; i < 3; i++) await p.post('/patient/logs/water', { ml: 1000 });
    expect((await p.post('/patient/logs/water', { ml: 1000 })).body.error).toBe('too_much_water');
    expect((await p.post('/patient/logs/water', { ml: 5000 })).status).toBe(400);

    expect((await p.put('/patient/logs/sleep', { hours: 8, quality: 5 })).status).toBe(200);
    st = (await p.get('/patient/hero')).body;
    expect(st.logs.survival.sleep).toMatchObject({ hours: 8, quality: 5, score: 100 });
    expect(st.logs.survival.status.map((x: { key: string }) => x.key)).toContain('rested');
    expect(st.logs.survival.energy).toBeGreaterThan(50);
    await p.put('/patient/logs/sleep', { hours: 5, quality: 2 }); // same day: replaces
    expect((await p.get('/patient/hero')).body.logs.survival.sleep.hours).toBe(5);

    // The practice does not see water or sleep.
    const ther = await login('therapistA');
    expect(JSON.stringify((await ther.get(`/patients/${s.patients.emma}/hero`)).body)).not.toMatch(/survival|sleep|water/);
    // Removing a glass.
    const id = (await p.get('/patient/hero')).body.logs.survival.water.entries[0].id;
    expect((await p.del(`/patient/logs/water/${id}`)).status).toBe(200);
    expect((await (await login('patientB')).del(`/patient/logs/water/${id}`)).status).toBe(404);
  });
});
