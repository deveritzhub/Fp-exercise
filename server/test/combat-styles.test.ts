import pg from 'pg';
import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

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

describe('three ways to fight: close by, with a bow, with magic', () => {
  it('makes arrows and runes from loot, uses them up and trains the skill of the weapon in hand', async () => {
    const P = await login('patientA');
    expect((await P.put('/patient/hero', LOOK)).status).toBe(200);
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    const loot = (item: string, n: number) => sql('INSERT INTO hero_loot(patient_id, item, n) VALUES ($1,$2,$3) ON CONFLICT (patient_id, item) DO UPDATE SET n = EXCLUDED.n', [me.id, item, n]);
    await sql('INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 400) ON CONFLICT (patient_id) DO UPDATE SET xp = 400, wins_today = 0, day = CURRENT_DATE, arrows = 0, runes = 0, melee_xp = 0, ranged_xp = 0, magic_xp = 0', [me.id]);
    for (const day of ['2001-02-01', '2001-02-02', '2001-02-03', '2001-02-04']) await sql('INSERT INTO hero_daily_chests (patient_id, day, coins) VALUES ($1, $2, 50) ON CONFLICT DO NOTHING', [me.id, day]);
    const start = (await P.get('/patient/hero/adventure')).body;
    expect(start).toMatchObject({ arrows: 0, runes: 0, skills: { melee: { level: 1 }, ranged: { level: 1 }, magic: { level: 1 } } });

    // Arrows: wood, a feather and a stone make ten; nothing without the loot.
    await loot('wood', 0);
    expect((await P.post('/patient/hero/adventure/ammo/make', { key: 'arrows' })).body.error).toBe('not_enough_loot');
    await loot('wood', 2);
    await loot('feather', 2);
    await loot('stone', 3);
    const made = (await P.post('/patient/hero/adventure/ammo/make', { key: 'arrows', times: 2 })).body;
    expect(made.arrows).toBe(20);
    expect(made.loot).toMatchObject({ stone: 1 });
    // Runes: slime gel and a stone make five.
    await loot('gel', 1);
    expect((await P.post('/patient/hero/adventure/ammo/make', { key: 'runes' })).body.runes).toBe(5);
    expect((await P.post('/patient/hero/adventure/ammo/make', { key: 'gold' })).status).toBe(400);

    // A bow from the smithy: a win with it takes the arrows shot and trains archery.
    const bought = (await P.post('/patient/hero/adventure/weapon/buy', { key: 'shortbow' })).body;
    expect(bought.weapon).toBe('shortbow');
    const shot = (await P.post('/patient/hero/adventure/win', { kind: 'cow', shots: 4 })).body;
    expect(shot.arrows).toBe(16);
    expect(shot.skills.ranged.xp).toBe(shot.gained);
    expect(shot.skills.melee.xp).toBe(0);
    // Chopping trains no fighting skill and takes no arrows.
    const twigs = (await P.post('/patient/hero/adventure/win', { kind: 'twigs' })).body;
    expect(twigs.arrows).toBe(16);
    expect(twigs.skills.ranged.xp).toBe(shot.gained);

    // Magic: a wand, a spell takes a rune; healing asks three.
    expect((await P.post('/patient/hero/adventure/weapon/buy', { key: 'wand' })).body.weapon).toBe('wand');
    const cast = (await P.post('/patient/hero/adventure/win', { kind: 'chicken', shots: 2 })).body;
    expect(cast.runes).toBe(3);
    expect(cast.skills.magic.xp).toBe(cast.gained);
    expect((await P.post('/patient/hero/adventure/spell', { key: 'heal' })).body.runes).toBe(0);
    expect((await P.post('/patient/hero/adventure/spell', { key: 'heal' })).body.error).toBe('not_enough_runes');
    // The shield asks magic level 5.
    expect((await P.post('/patient/hero/adventure/spell', { key: 'shield' })).body.error).toBe('level_too_low');

    // Fists again: a win trains fighting close by.
    await P.put('/patient/hero/adventure/weapon', { key: null });
    const punch = (await P.post('/patient/hero/adventure/win', { kind: 'chicken' })).body;
    expect(punch.skills.melee.xp).toBe(punch.gained);
    await sql('UPDATE hero_adventure SET xp = 0, arrows = 0, runes = 0, melee_xp = 0, ranged_xp = 0, magic_xp = 0, weapon = NULL WHERE patient_id = $1', [me.id]);
  });
});
