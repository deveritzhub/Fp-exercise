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
    expect(win.body).toMatchObject({ gained: 24, xp: 24, wins: 1, winsToday: 1, level: 1 });
    expect((await P.post('/patient/hero/adventure/win', { kind: 'couch' })).body).toMatchObject({ gained: 36, xp: 60, wins: 2, level: 2 });
    expect((await P.post('/patient/hero/adventure/win', { kind: 'dragon' })).status).toBe(400);
    // A big one is not there yet for a level 1 adventurer.
    expect((await P.post('/patient/hero/adventure/win', { kind: 'couch_king' })).status).toBe(400);
    // The real level is about real exercise: nothing here moves it.
    expect((await P.get('/patient/hero')).body.level.xp).toBe(hero);
    // A round on the bag: two XP a hit, for the first six rounds of a day.
    expect((await P.post('/patient/hero/adventure/round', { hits: 10 })).body).toMatchObject({ gained: 20, xp: 80, roundsToday: 1, winsToday: 2 });
    expect((await P.post('/patient/hero/adventure/round', { hits: 99 })).status).toBe(400);
    for (let i = 0; i < 5; i++) await P.post('/patient/hero/adventure/round', { hits: 1 });
    expect((await P.post('/patient/hero/adventure/round', { hits: 14 })).body).toMatchObject({ gained: 0, xp: 90, roundsToday: 7, level: 2 });
    // Staff have no adventure.
    const T = await login('therapistA');
    expect((await T.get('/patient/hero/adventure')).status).toBe(403);
  });

  it('sells weapons for coins and lets the patient put one on or off', async () => {
    const P = await login('patientA');
    // No hero yet: nothing to buy for.
    expect((await P.post('/patient/hero/adventure/weapon/buy', { key: 'staff' })).body.error).toBe('hero_required');
    expect((await P.put('/patient/hero', { heroName: 'Emma de Sprinter', frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'round', outfit: 'forest', sport: 'running' })).status).toBe(200);
    const start = (await P.get('/patient/hero/adventure')).body;
    expect(start).toMatchObject({ level: 2, weapon: null, owned: [] });
    expect(start.coins).toBeGreaterThanOrEqual(30);
    // Not for sale yet at this level, not a weapon at all, and nothing to wear before buying.
    expect((await P.post('/patient/hero/adventure/weapon/buy', { key: 'sword' })).body.error).toBe('level_too_low');
    expect((await P.post('/patient/hero/adventure/weapon/buy', { key: 'fists' })).status).toBe(400);
    expect((await P.put('/patient/hero/adventure/weapon', { key: 'staff' })).body.error).toBe('gear_not_owned');
    const bought = await P.post('/patient/hero/adventure/weapon/buy', { key: 'staff' });
    expect(bought.body).toMatchObject({ weapon: 'staff', owned: ['staff'], coins: start.coins - 30, xp: start.xp });
    // The coins are the hero's own: the purse on the hero page shows the same.
    expect((await P.get('/patient/hero')).body.gear.coins).toBe(start.coins - 30);
    expect((await P.post('/patient/hero/adventure/weapon/buy', { key: 'staff' })).body.error).toBe('gear_owned');
    expect((await P.put('/patient/hero/adventure/weapon', { key: null })).body).toMatchObject({ weapon: null, owned: ['staff'] });
    expect((await P.put('/patient/hero/adventure/weapon', { key: 'staff' })).body.weapon).toBe('staff');
    // A cow always leaves a hide and a bone; they are kept, and counted up.
    const cow = await P.post('/patient/hero/adventure/win', { kind: 'cow' });
    expect(cow.body.gained).toBe(40);
    expect(cow.body.drops).toEqual(expect.arrayContaining([{ item: 'hide', n: 1 }, { item: 'bone', n: 1 }]));
    expect(cow.body.loot).toMatchObject({ hide: 1, bone: 1 });
    expect((await P.post('/patient/hero/adventure/win', { kind: 'cow' })).body.loot).toMatchObject({ hide: 2, bone: 2 });
    // A boar is not in the meadow yet for this adventurer.
    expect((await P.post('/patient/hero/adventure/win', { kind: 'boar' })).status).toBe(400);
    // A tree asks for a hatchet; with one it gives wood. Wood, bones and a hide make a club and a chest.
    expect((await P.post('/patient/hero/adventure/win', { kind: 'oak' })).body.error).toBe('tool_required');
    expect((await P.post('/patient/hero/adventure/tool/buy', { key: 'hatchet' })).body.tools).toEqual(['hatchet']);
    expect((await P.post('/patient/hero/adventure/tool/buy', { key: 'hatchet' })).body.error).toBe('gear_owned');
    expect((await P.post('/patient/hero/adventure/craft', { key: 'chest' })).body.error).toBe('not_enough_loot');
    let wood = 0;
    for (let i = 0; i < 24 && wood < 20; i++) wood = (await P.post('/patient/hero/adventure/win', { kind: 'oak' })).body.loot.wood;
    // The backpack holds twenty of a kind.
    expect(wood).toBe(20);
    expect((await P.post('/patient/hero/adventure/win', { kind: 'oak' })).body.loot.wood).toBe(20);
    const chest = await P.post('/patient/hero/adventure/craft', { key: 'chest' });
    expect(chest.body).toMatchObject({ built: ['chest'], lootCap: 99, loot: { wood: 14, hide: 1, bone: 2 } });
    expect((await P.post('/patient/hero/adventure/craft', { key: 'chest' })).body.error).toBe('gear_owned');
    // The staff was bought already; the club asks for adventurer 4.
    expect((await P.post('/patient/hero/adventure/craft', { key: 'staff' })).body.error).toBe('gear_owned');
    expect((await P.post('/patient/hero/adventure/craft', { key: 'club' })).body.error).toBe('level_too_low');
    // A win keeps the weapon in hand.
    expect((await P.post('/patient/hero/adventure/win', { kind: 'slime' })).body.weapon).toBe('staff');
    // The home and its furniture are untouched by a weapon in the purchases.
    expect((await P.get('/patient/hero/home')).status).toBe(200);
  });
});
