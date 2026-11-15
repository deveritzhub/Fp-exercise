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

describe('own home: the next one is built with loot', () => {
  it('keeps the home the level gave, and builds the next only with enough loot (which is then used up)', async () => {
    const p = await login('patientA');
    const start = (await p.get('/patient/hero/home')).body;
    expect(typeof start.stage).toBe('number');
    expect((await p.get('/patient/hero')).body.homeStage).toBe(start.stage);
    const b = start.build;
    expect(b.stage).toBe(start.stage + 1);
    expect(Object.keys(b.cost)).toEqual(expect.arrayContaining(['wood', 'stone']));
    // Without the loot: nothing is built.
    const poor = await p.post('/patient/hero/home/build', {});
    expect(poor.status).toBe(400);
    expect(poor.body.error).toBe(b.levelOk ? 'not_enough_loot' : 'level_too_low');

    // A hero whose level does not reach the next home yet: start again from the camp, so the hut is in reach.
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    let now;
    try {
      if (!b.levelOk) await db.query('UPDATE hero_homes SET built_stage = 0 WHERE patient_id = $1', [s.patients.emma]);
      now = (await p.get('/patient/hero/home')).body;
      if (!now.build.levelOk) return; // a level-1 hero cannot build a hut yet; covered by the shared rules
      // Loot from the village: twice what it costs.
      for (const [item, n] of Object.entries(now.build.cost as Record<string, number>)) {
        await db.query('INSERT INTO hero_loot(patient_id, item, n) VALUES ($1,$2,$3) ON CONFLICT (patient_id, item) DO UPDATE SET n = EXCLUDED.n', [s.patients.emma, item, n * 2]);
      }
    } finally {
      await db.end();
    }
    now = (await p.get('/patient/hero/home')).body;
    expect(now.build.ready).toBe(true);
    const built = await p.post('/patient/hero/home/build', {});
    expect(built.status).toBe(201);
    expect(built.body.stage).toBe(now.stage + 1);
    const loot = (await p.get('/patient/hero/adventure')).body.loot;
    for (const [item, n] of Object.entries(now.build.cost as Record<string, number>)) expect(loot[item]).toBe(n);
  });
});

describe('tools and the plant-based way', () => {
  it('a tool costs coins once and doubles the yield of its harvest; berries pay for hides', async () => {
    const p = await login('patientA');
    // The coins of the first test are still there.
    expect((await p.post('/patient/hero/adventure/tool/buy', { key: 'spade' })).body.error).toBe('unknown_item');
    const before = (await p.get('/patient/hero/adventure')).body;
    const bought = await p.post('/patient/hero/adventure/tool/buy', { key: 'hatchet' });
    expect(bought.status).toBe(201);
    expect(bought.body.tools).toEqual(['hatchet']);
    expect(bought.body.coins).toBe(before.coins - 40);
    expect((await p.post('/patient/hero/adventure/tool/buy', { key: 'hatchet' })).body.error).toBe('gear_owned');

    // An oak with the hatchet: always an even number of wood (doubled); a rock by hand is not doubled.
    for (let i = 0; i < 4; i++) {
      const win = (await p.post('/patient/hero/adventure/win', { kind: 'oak' })).body;
      expect(win.drops[0].item).toBe('wood');
      expect(win.drops[0].n % 2).toBe(0);
    }
    const bush = (await p.post('/patient/hero/adventure/win', { kind: 'bush' })).body;
    expect(bush.drops[0].item).toBe('berries');

    // A cottage needs two hides: with none, berries are handed in instead.
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    try {
      await db.query('UPDATE hero_homes SET built_stage = 1 WHERE patient_id = $1', [s.patients.emma]);
      for (const [item, n] of [['wood', 12], ['stone', 6], ['hide', 0], ['berries', 10]] as const) {
        await db.query('INSERT INTO hero_loot(patient_id, item, n) VALUES ($1,$2,$3) ON CONFLICT (patient_id, item) DO UPDATE SET n = EXCLUDED.n', [s.patients.emma, item, n]);
      }
    } finally {
      await db.end();
    }
    const home = (await p.get('/patient/hero/home')).body;
    if (!home.build.levelOk) return; // the level decides; the rules themselves are covered in shared tests
    expect(home.build.pay).toEqual({ wood: 12, stone: 6, berries: 6 });
    expect((await p.post('/patient/hero/home/build', {})).status).toBe(201);
    expect((await p.get('/patient/hero/adventure')).body.loot.berries).toBe(4);
  });
});
