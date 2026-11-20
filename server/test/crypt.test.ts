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
import { buildCrypt, cryptLevel } from '../../shared/dungeon';

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
});

describe('the crypts', () => {
  it('builds the same crypt from a seed, with a boss in the furthest room and stronger creatures deeper down', () => {
    const a = buildCrypt(777, 2);
    expect(buildCrypt(777, 2)).toEqual(a);
    expect(a.rooms[0].kind).toBe('start');
    expect(a.rooms.filter((r) => r.kind === 'boss')).toHaveLength(1);
    expect(a.corridors).toHaveLength(a.rooms.length - 1);
    expect(buildCrypt(778, 2)).not.toEqual(a);
    expect(cryptLevel(1)).toBe(3);
    expect(cryptLevel(4)).toBe(9);
  });

  it('goes down one depth at a time, opens each chest once, and clears with the boss', async () => {
    const P = await login('patientA');
    expect((await P.put('/patient/hero', LOOK)).status).toBe(200);
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql("INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 0) ON CONFLICT (patient_id) DO UPDATE SET xp = 0, crypt_best = 0, crypt_seed = NULL, crypt_depth = NULL, crypt_chests = '{}'", [me.id]);
    // Too low a level for depth 1 (adventurer 3).
    expect((await P.post('/patient/hero/crypt/start', { depth: 1 })).body.error).toBe('level_too_low');
    await sql('UPDATE hero_adventure SET xp = 400 WHERE patient_id = $1', [me.id]);
    // Depth 2 is closed until depth 1 is cleared.
    expect((await P.post('/patient/hero/crypt/start', { depth: 2 })).body.error).toBe('crypt_locked');
    const run = (await P.post('/patient/hero/crypt/start', { depth: 1 })).body.crypt.run;
    expect(run).toMatchObject({ depth: 1, chests: [] });
    expect(run.seed).toBeGreaterThan(0);
    // A chest: opened once.
    const crypt = buildCrypt(run.seed, 1);
    if (crypt.chests.length) {
      const opened = (await P.post('/patient/hero/crypt/chest', { index: 0 })).body;
      expect(opened.prize.coins).toBeGreaterThan(0);
      expect(opened.crypt.run.chests).toEqual([0]);
      expect((await P.post('/patient/hero/crypt/chest', { index: 0 })).body.error).toBe('chest_open');
    }
    // Not cleared in a moment.
    expect((await P.post('/patient/hero/crypt/clear', {})).body.error).toBe('too_fast');
    await sql("UPDATE hero_adventure SET crypt_started_at = now() - interval '2 minutes' WHERE patient_id = $1", [me.id]);
    const cleared = (await P.post('/patient/hero/crypt/clear', {})).body;
    expect(cleared.cleared).toMatchObject({ depth: 1, xp: 90 });
    expect(cleared.crypt).toMatchObject({ best: 1, run: null });
    expect(cleared.xp).toBe(490);
    // A friend's crypt: the same seed.
    const joined = (await P.post('/patient/hero/crypt/start', { depth: 1, seed: 4242 })).body;
    expect(joined.crypt.run.seed).toBe(4242);
    expect((await P.post('/patient/hero/crypt/leave', {})).body.crypt.run).toBeNull();
    expect((await P.post('/patient/hero/crypt/clear', {})).body.error).toBe('no_crypt');
  });
});
