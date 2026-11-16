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
    if (quest.kind === 'oak') await sql("INSERT INTO hero_purchases(patient_id, item, price) VALUES ($1, 'tool_hatchet', 0) ON CONFLICT DO NOTHING", [me.id]);
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
});
