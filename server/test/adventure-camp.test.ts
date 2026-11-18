import pg from 'pg';
import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { dailyQuest, ADVENTURE_QUEST_XP } from '../../shared/adventure';

async function sql(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows;
  } finally {
    await db.end();
  }
}
const LOOK = { heroName: 'Emma', frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'round', outfit: 'forest', sport: 'running' };

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
});

describe('campfire, task of the day and the chest at home', () => {
  it('cooks loot into food, eats it, counts the task of the day and puts the chest in the room', async () => {
    const P = await login('patientA');
    expect((await P.put('/patient/hero', LOOK)).status).toBe(200);
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    const loot = (item: string, n: number) => sql('INSERT INTO hero_loot(patient_id, item, n) VALUES ($1,$2,$3) ON CONFLICT (patient_id, item) DO UPDATE SET n = EXCLUDED.n', [me.id, item, n]);

    // Cooking: raw meat becomes roast meat; berries a tart; nothing without the loot.
    expect((await P.post('/patient/hero/adventure/cook', { key: 'cooked_meat' })).body.error).toBe('not_enough_loot');
    await loot('meat', 2);
    await loot('berries', 5);
    const cooked = await P.post('/patient/hero/adventure/cook', { key: 'cooked_meat' });
    expect(cooked.body.loot).toMatchObject({ meat: 1, cooked_meat: 1 });
    expect((await P.post('/patient/hero/adventure/cook', { key: 'berry_tart' })).body.loot).toMatchObject({ berries: 1, berry_tart: 1 });
    expect((await P.post('/patient/hero/adventure/cook', { key: 'gold' })).status).toBe(400);
    // Eating: one fewer, and how much life it brings back.
    const ate = await P.post('/patient/hero/adventure/eat', { key: 'cooked_meat' });
    expect(ate.body).toMatchObject({ heals: 0.5 });
    expect(ate.body.loot.cooked_meat ?? 0).toBe(0);
    expect((await P.post('/patient/hero/adventure/eat', { key: 'cooked_meat' })).body.error).toBe('not_enough_loot');

    // The task of the day: the same as the shared rule says, counted by wins of its kind, its bonus once.
    const [{ d }] = await sql('SELECT CURRENT_DATE::text AS d');
    const quest = dailyQuest(d, me.id);
    const start = (await P.get('/patient/hero/adventure')).body;
    expect(start.quest).toMatchObject({ key: quest.key, n: quest.n, progress: 0, done: false });
    let last = start;
    let bonus = 0;
    for (let i = 0; i < quest.n; i++) {
      last = (await P.post('/patient/hero/adventure/win', { kind: quest.kind })).body;
      bonus += last.questXp ?? 0;
    }
    expect(last.quest).toMatchObject({ progress: quest.n, done: true });
    expect(bonus).toBe(ADVENTURE_QUEST_XP);
    // Once done, more wins of its kind give no second bonus.
    expect((await P.post('/patient/hero/adventure/win', { kind: quest.kind })).body.questXp).toBe(0);

    // The chest made from loot stands in the room at home, and is not for sale.
    await loot('wood', 6);
    await loot('hide', 1);
    expect((await P.post('/patient/hero/adventure/craft', { key: 'chest' })).body.built).toContain('chest');
    const home = (await P.get('/patient/hero/home')).body;
    expect(home.owned).toContain('home_lootchest');
    expect(home.layout.some((p: { key: string }) => p.key === 'home_lootchest')).toBe(true);
    expect((await P.post('/patient/hero/home/buy', { item: 'home_lootchest' })).body.error).toBe('unknown_item');
  });

  it('makes armour from loot (or berries), wears it and takes it off', async () => {
    const P = await login('patientA');
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql('INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 200) ON CONFLICT (patient_id) DO UPDATE SET xp = GREATEST(hero_adventure.xp, 200)', [me.id]);
    await sql('INSERT INTO hero_loot(patient_id, item, n) VALUES ($1, $2, 3) ON CONFLICT (patient_id, item) DO UPDATE SET n = 3', [me.id, 'hide']);
    // The wolf cloak asks for adventurer 6.
    expect((await P.post('/patient/hero/adventure/craft', { key: 'wolf_cloak' })).body.error).toBe('level_too_low');
    const made = await P.post('/patient/hero/adventure/craft', { key: 'leather' });
    expect(made.body).toMatchObject({ armour: 'leather' });
    expect(made.body.built).toContain('leather');
    expect((await P.put('/patient/hero/adventure/armour', { key: null })).body.armour).toBeNull();
    expect((await P.put('/patient/hero/adventure/armour', { key: 'bear_armour' })).body.error).toBe('gear_not_owned');
    expect((await P.put('/patient/hero/adventure/armour', { key: 'leather' })).body.armour).toBe('leather');
  });

  it('the shadow creatures show themselves from their level on, and drop their own loot', async () => {
    const P = await login('patientA');
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql('INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 0) ON CONFLICT (patient_id) DO UPDATE SET xp = 0', [me.id]);
    expect((await P.post('/patient/hero/adventure/win', { kind: 'pride' })).status).toBe(400);
    await sql('UPDATE hero_adventure SET xp = 6000, wins_today = 0 WHERE patient_id = $1', [me.id]);
    const win = await P.post('/patient/hero/adventure/win', { kind: 'fright' });
    expect(win.body.gained).toBe(120);
    expect(win.body.loot.shiver_crystal).toBeGreaterThan(0);
    // The first win over fright sets Acceptance free, once.
    expect(win.body.unlocked).toBe('acceptance');
    expect(win.body.light).toContain('acceptance');
    expect((await P.post('/patient/hero/adventure/win', { kind: 'fright' })).body.unlocked).toBeNull();
    const lord = (await P.post('/patient/hero/adventure/win', { kind: 'shame_lord' })).body;
    expect(lord.loot.crown_of_light).toBe(1);
    expect(lord.unlocked).toBe('enlightenment');
    // The boss board stamps a boss beaten.
    expect(lord.slain).toContain('shame_lord');
    expect(typeof lord.bossOfWeek).toBe('string');
    // An ordinary creature frees nothing.
    expect((await P.post('/patient/hero/adventure/win', { kind: 'cow' })).body.unlocked).toBeNull();
    await sql('UPDATE hero_adventure SET xp = 0 WHERE patient_id = $1', [me.id]);
  });

  it('a big rock asks for a pickaxe; pebbles and twigs are picked up by hand', async () => {
    const P = await login('patientA');
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql("DELETE FROM hero_purchases WHERE patient_id = $1 AND item = 'tool_pickaxe'", [me.id]);
    await sql('UPDATE hero_adventure SET wins_today = 0 WHERE patient_id = $1', [me.id]);
    expect((await P.post('/patient/hero/adventure/win', { kind: 'rock' })).body.error).toBe('tool_required');
    const pebble = (await P.post('/patient/hero/adventure/win', { kind: 'pebble' })).body;
    expect(pebble.drops).toEqual([{ item: 'stone', n: 1 }]);
    const twigs = (await P.post('/patient/hero/adventure/win', { kind: 'twigs' })).body;
    expect(twigs.drops).toEqual([{ item: 'wood', n: 1 }]);
    await sql("INSERT INTO hero_purchases(patient_id, item, price) VALUES ($1, 'tool_pickaxe', 0) ON CONFLICT DO NOTHING", [me.id]);
    const rock = (await P.post('/patient/hero/adventure/win', { kind: 'rock' })).body;
    // With the pickaxe: doubled, so 2 to 6 stone.
    expect(rock.drops[0].item).toBe('stone');
    expect(rock.drops[0].n % 2).toBe(0);
  });

  it('buys a bike in the stables; faster rides wait for a higher level', async () => {
    const P = await login('patientA');
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql("DELETE FROM hero_purchases WHERE patient_id = $1 AND item LIKE 'ride\\_%'", [me.id]);
    // A few old chests' worth of coins, so the purse is known to be enough.
    for (const day of ['2000-01-01', '2000-01-02', '2000-01-03', '2000-01-04']) await sql('INSERT INTO hero_daily_chests (patient_id, day, coins) VALUES ($1, $2, 50) ON CONFLICT DO NOTHING', [me.id, day]);
    try {
      const before = (await P.get('/patient/hero/adventure')).body;
      expect(before.rides).toEqual([]);
      const bought = await P.post('/patient/hero/adventure/ride/buy', { key: 'bike' });
      expect(bought.status).toBe(200);
      expect(bought.body.rides).toEqual(['bike']);
      expect(bought.body.coins).toBe(before.coins - 80);
      expect((await P.post('/patient/hero/adventure/ride/buy', { key: 'bike' })).body.error).toBe('gear_owned');
      expect((await P.post('/patient/hero/adventure/ride/buy', { key: 'rocket' })).body.error).toBe('unknown_item');
      if (before.level < 10) expect((await P.post('/patient/hero/adventure/ride/buy', { key: 'car' })).body.error).toBe('level_too_low');
    } finally {
      await sql("DELETE FROM hero_purchases WHERE patient_id = $1 AND item LIKE 'ride\\_%'", [me.id]);
      await sql("DELETE FROM hero_daily_chests WHERE patient_id = $1 AND day < '2001-01-01'", [me.id]);
    }
  });

  it('every win gives XP: full for the first 100 of the day, half after that', async () => {
    const P = await login('patientA');
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql('UPDATE hero_adventure SET wins_today = 0, day = CURRENT_DATE WHERE patient_id = $1', [me.id]);
    expect((await P.post('/patient/hero/adventure/win', { kind: 'slime' })).body.gained).toBe(12);
    expect((await P.post('/patient/hero/adventure/win', { kind: 'slime' })).body.gained).toBe(12);
    await sql('UPDATE hero_adventure SET wins_today = 100 WHERE patient_id = $1', [me.id]);
    const late = (await P.post('/patient/hero/adventure/win', { kind: 'slime' })).body;
    expect(late.gained).toBe(6);
    // Picking up twigs counts for the adventure skill too.
    expect((await P.post('/patient/hero/adventure/win', { kind: 'twigs' })).body.gained).toBe(1);
    await sql('UPDATE hero_adventure SET wins_today = 0 WHERE patient_id = $1', [me.id]);
  });

  it('remembers where the hero stood in the village', async () => {
    const P = await login('patientA');
    expect((await P.put('/patient/hero/adventure/position', { x: 12.5, z: -7.25 })).status).toBe(200);
    expect((await P.get('/patient/hero/adventure')).body.pos).toEqual({ x: 12.5, z: -7.25 });
    expect((await P.put('/patient/hero/adventure/position', { x: 999, z: 0 })).status).toBe(400);
  });

  it('a pet from adventure level 2: breed, coat and a clean name; nothing before that level', async () => {
    const P = await login('patientA');
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    const [{ xp }] = await sql('SELECT xp FROM hero_adventure WHERE patient_id = $1', [me.id]);
    await sql('UPDATE hero_adventure SET xp = 0 WHERE patient_id = $1', [me.id]);
    expect((await P.put('/patient/hero/adventure/pet', { key: 'whippet', coat: 1, name: 'Bolt' })).body.error).toBe('level_too_low');
    await sql('UPDATE hero_adventure SET xp = 500 WHERE patient_id = $1', [me.id]);
    const chosen = (await P.put('/patient/hero/adventure/pet', { key: 'whippet', coat: 2, name: '  Bolt <b>!</b> ' })).body;
    expect(chosen.pet).toMatchObject({ key: 'whippet', coat: 2, name: 'Bolt bb', color: 'red', wear: null });
    expect((await P.get('/patient/hero/adventure')).body.pet).toMatchObject({ key: 'whippet', coat: 2 });
    // A coat past the breed's list is kept inside it; an unknown breed is refused.
    expect((await P.put('/patient/hero/adventure/pet', { key: 'siberian', coat: 9 })).body.pet).toMatchObject({ key: 'siberian', coat: 4, name: null });
    expect((await P.put('/patient/hero/adventure/pet', { key: 'dragon' })).status).toBe(400);
    // The grooming salon: a free collar colour, things to wear bought once with coins.
    expect((await P.put('/patient/hero/adventure/pet/look', { color: 'blue' })).body.pet).toMatchObject({ key: 'siberian', color: 'blue', wear: null });
    expect((await P.put('/patient/hero/adventure/pet/look', { color: 'neon' })).status).toBe(400);
    expect((await P.put('/patient/hero/adventure/pet/look', { wear: 'coat' })).body.error).toBe('gear_not_owned');
    for (const day of ['2001-01-01', '2001-01-02']) await sql('INSERT INTO hero_daily_chests (patient_id, day, coins) VALUES ($1, $2, 50) ON CONFLICT DO NOTHING', [me.id, day]);
    const coins = (await P.get('/patient/hero/adventure')).body.coins;
    const bought = (await P.post('/patient/hero/adventure/pet/wear/buy', { key: 'coat' })).body;
    expect(bought.pet).toMatchObject({ wear: 'coat', color: 'blue' });
    expect(bought.petWear).toEqual(['coat']);
    expect(bought.coins).toBe(coins - 30);
    expect((await P.post('/patient/hero/adventure/pet/wear/buy', { key: 'coat' })).body.error).toBe('gear_owned');
    expect((await P.put('/patient/hero/adventure/pet/look', { wear: null })).body.pet.wear).toBeNull();
    expect((await P.put('/patient/hero/adventure/pet/look', { wear: 'coat' })).body.pet.wear).toBe('coat');
    // Another breed keeps the colour and what it wears.
    expect((await P.put('/patient/hero/adventure/pet', { key: 'whippet', coat: 0 })).body.pet).toMatchObject({ key: 'whippet', color: 'blue', wear: 'coat' });
    expect((await P.put('/patient/hero/adventure/pet', { key: null })).body.pet).toBeNull();
    expect((await P.post('/patient/hero/adventure/pet/wear/buy', { key: 'bow' })).body.error).toBe('pet_required');
    await sql('UPDATE hero_adventure SET xp = $2 WHERE patient_id = $1', [me.id, xp]);
  });
});
