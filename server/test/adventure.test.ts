import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
});

describe('adventure in the village', () => {
  it('gives its own XP for a creature beaten and leaves the hero level alone', async () => {
    const P = await login('patientA');
    const hero = (await P.get('/patient/hero')).body.level.xp;
    expect((await P.get('/patient/hero/adventure')).body).toMatchObject({ xp: 0, wins: 0, level: 1 });
    const win = await P.post('/patient/hero/adventure/win', { kind: 'imp' });
    expect(win.status).toBe(200);
    expect(win.body).toMatchObject({ gained: 12, xp: 12, wins: 1, winsToday: 1, level: 1 });
    expect((await P.post('/patient/hero/adventure/win', { kind: 'couch' })).body).toMatchObject({ gained: 18, xp: 30, wins: 2 });
    expect((await P.post('/patient/hero/adventure/win', { kind: 'dragon' })).status).toBe(400);
    // A big one is not there yet for a level 1 adventurer.
    expect((await P.post('/patient/hero/adventure/win', { kind: 'couch_king' })).status).toBe(400);
    // The real level is about real exercise: nothing here moves it.
    expect((await P.get('/patient/hero')).body.level.xp).toBe(hero);
    // A round on the bag: two XP a hit, for the first six rounds of a day.
    expect((await P.post('/patient/hero/adventure/round', { hits: 10 })).body).toMatchObject({ gained: 20, xp: 50, roundsToday: 1, winsToday: 2 });
    expect((await P.post('/patient/hero/adventure/round', { hits: 99 })).status).toBe(400);
    for (let i = 0; i < 5; i++) await P.post('/patient/hero/adventure/round', { hits: 1 });
    expect((await P.post('/patient/hero/adventure/round', { hits: 14 })).body).toMatchObject({ gained: 0, xp: 60, roundsToday: 7, level: 2 });
    // Staff have no adventure.
    const T = await login('therapistA');
    expect((await T.get('/patient/hero/adventure')).status).toBe(403);
  });
});
