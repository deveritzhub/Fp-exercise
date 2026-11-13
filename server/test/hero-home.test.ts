import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
const LOOK = { heroName: 'Emma de Sprinter', frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'round', outfit: 'forest', sport: 'running' };
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

/** Coins come from XP and day chests; chests in the past are the simple way to give the test patient some. */
async function giveCoins(patientId: string, coins: number) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    // A chest holds at most a couple of dozen coins: spread the amount over earlier days.
    for (let day = 30, left = coins; left > 0; day++, left -= 20) {
      await db.query(`INSERT INTO hero_daily_chests (patient_id, day, coins) VALUES ($1, current_date - $2::int, $3)`, [patientId, day, Math.min(20, left)]);
    }
  } finally {
    await db.end();
  }
}

describe('own home: furniture bought with coins and put down in the room', () => {
  it('needs a hero, the level and the coins; a bought piece is placed and the coins are gone', async () => {
    const p = await login('patientA');
    expect((await p.post('/patient/hero/home/buy', { item: 'home_chair' })).body.error).toBe('hero_required');
    expect((await p.put('/patient/hero', LOOK)).status).toBe(200);
    const start = (await p.get('/patient/hero/home')).body;
    expect(start.owned).toEqual([]);
    expect(start.layout).toEqual([]);

    expect((await p.post('/patient/hero/home/buy', { item: 'home_castle' })).body.error).toBe('unknown_item');
    expect((await p.post('/patient/hero/home/buy', { item: 'home_statue' })).body.error).toBe('level_too_low');
    await giveCoins(s.patients.emma, 200);
    const rich = (await p.get('/patient/hero/home')).body;
    expect(rich.coins).toBeGreaterThanOrEqual(200);

    const bought = await p.post('/patient/hero/home/buy', { item: 'home_chair' });
    expect(bought.status).toBe(201);
    expect(bought.body.owned).toEqual(['home_chair']);
    expect(bought.body.coins).toBe(rich.coins - 25);
    expect(bought.body.layout).toHaveLength(1);
    expect(bought.body.layout[0].key).toBe('home_chair');
    expect((await p.post('/patient/hero/home/buy', { item: 'home_chair' })).body.error).toBe('item_owned');
    // The hero's own gear balance is the same purse.
    expect((await p.get('/patient/hero')).body.gear.coins).toBe(bought.body.coins);
  });

  it('saves a layout that follows the rules and refuses one that does not', async () => {
    const p = await login('patientA');
    expect((await p.post('/patient/hero/home/buy', { item: 'home_rug' })).status).toBe(201);
    const ok = await p.put('/patient/hero/home/layout', { items: [{ key: 'home_chair', x: 1.234, z: -1, rot: 180 }, { key: 'home_rug', x: 1.2, z: -1, rot: 0 }] });
    expect(ok.status).toBe(200);
    expect(ok.body.layout).toEqual([{ key: 'home_chair', x: 1.23, z: -1, rot: 180 }, { key: 'home_rug', x: 1.2, z: -1, rot: 0 }]);
    expect((await p.put('/patient/hero/home/layout', { items: [{ key: 'home_bed', x: 0, z: 0, rot: 0 }] })).body.error).toBe('layout_not_owned');
    expect((await p.put('/patient/hero/home/layout', { items: [{ key: 'home_chair', x: 9, z: 0, rot: 0 }] })).body.error).toBe('layout_outside');
    // Leaving a piece out puts it in storage: still owned, no longer in the room.
    const stored = await p.put('/patient/hero/home/layout', { items: [{ key: 'home_rug', x: 0, z: 0, rot: 0 }] });
    expect(stored.body.layout.map((i: { key: string }) => i.key)).toEqual(['home_rug']);
    expect(stored.body.owned.sort()).toEqual(['home_chair', 'home_rug']);
  });

  it('is private: staff and other patients cannot read or change it', async () => {
    const t = await login('therapistA');
    expect((await t.get('/patient/hero/home')).status).toBe(403);
    const other = await login('patientB');
    const theirs = (await other.get('/patient/hero/home')).body;
    expect(theirs.owned).toEqual([]);
    expect(theirs.layout).toEqual([]);
  });
});
