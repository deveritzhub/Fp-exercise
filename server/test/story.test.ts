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

describe('the story of the village', () => {
  it('opens one quest at a time, done by talking, going, beating, gathering and training, each with a reward', async () => {
    const P = await login('patientA');
    expect((await P.put('/patient/hero', LOOK)).status).toBe(200);
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql('DELETE FROM hero_story WHERE patient_id = $1', [me.id]);
    await sql('INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 0) ON CONFLICT (patient_id) DO UPDATE SET xp = 0, wins_today = 0, day = CURRENT_DATE', [me.id]);
    const coins0 = (await P.get('/patient/hero')).body.gear.coins as number;

    // The first quest: talk to the Guild master. Talking to someone else, or going somewhere, does nothing.
    const s0 = (await P.get('/patient/hero/story')).body;
    expect(s0).toMatchObject({ step: 0, finished: false, chapter: 0, quest: { key: 'call', goal: { type: 'talk', who: 'guild' }, have: 0, need: 1 } });
    expect(s0.quest.nl.title).toBe('Het gilde roept');
    expect((await P.post('/patient/hero/story/event', { kind: 'talk', key: 'smithy' })).body.step).toBe(0);
    expect((await P.post('/patient/hero/story/event', { kind: 'visit', key: 'well' })).body.step).toBe(0);
    expect((await P.post('/patient/hero/story/event', { kind: 'talk', key: 'DROP' })).status).toBe(400);
    const s1 = (await P.post('/patient/hero/story/event', { kind: 'talk', key: 'guild' })).body;
    expect(s1).toMatchObject({ step: 1, quest: { key: 'water' }, justDone: [{ key: 'call', chapter: 0, xp: 30, coins: 10 }] });
    // The reward: adventure XP and coins.
    expect((await P.get('/patient/hero/adventure')).body.xp).toBe(30);
    expect((await P.get('/patient/hero')).body.gear.coins).toBe(coins0 + 10);

    // Going to the well.
    expect((await P.post('/patient/hero/story/event', { kind: 'visit', key: 'well' })).body.quest).toMatchObject({ key: 'slimes', have: 0, need: 3 });
    // Three slimes; a cow does not count.
    await P.post('/patient/hero/adventure/win', { kind: 'cow' });
    for (let i = 0; i < 2; i++) await P.post('/patient/hero/adventure/win', { kind: 'slime' });
    expect((await P.get('/patient/hero/story')).body.quest).toMatchObject({ key: 'slimes', have: 2 });
    await P.post('/patient/hero/adventure/win', { kind: 'slime' });
    const s3 = (await P.get('/patient/hero/story')).body;
    expect(s3.quest).toMatchObject({ key: 'train', goal: { type: 'workout', n: 1 }, have: 0 });
    expect(s3.justDone.map((d: { key: string }) => d.key)).toEqual(['slimes']);
    // A workout done after the quest opened finishes it (here: as if one was done since).
    await sql('UPDATE hero_story SET base = GREATEST(base - 1, 0) WHERE patient_id = $1', [me.id]);
    const [{ n }] = await sql('SELECT count(*)::int AS n FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL', [me.id]);
    if (n > 0) {
      const s4 = (await P.get('/patient/hero/story')).body;
      // The end of chapter 1; chapter 2 starts with the smith.
      expect(s4.justDone[0]).toMatchObject({ key: 'train', chapterDone: true });
      expect(s4).toMatchObject({ chapter: 1, quest: { key: 'smith' } });
      // Gathering: a quest for loot already in the backpack is done as soon as the smith has spoken.
      await sql("INSERT INTO hero_loot(patient_id, item, n) VALUES ($1, 'wood', 6), ($1, 'stone', 4) ON CONFLICT (patient_id, item) DO UPDATE SET n = EXCLUDED.n", [me.id]);
      const s5 = (await P.post('/patient/hero/story/event', { kind: 'talk', key: 'smithy' })).body;
      expect(s5.justDone.map((d: { key: string }) => d.key)).toEqual(['smith', 'wood', 'stone']);
      expect(s5.quest.key).toBe('arm');
    }
    await sql('DELETE FROM hero_story WHERE patient_id = $1', [me.id]);
  });
});
