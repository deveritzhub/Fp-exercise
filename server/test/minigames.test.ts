import pg from 'pg';
import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { MINIGAMES, MINIGAME_REWARDED_PER_DAY, minigameXp } from '../../shared/minigames';

async function sql(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows;
  } finally {
    await db.end();
  }
}

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
});

describe('the little games', () => {
  it('keeps the best score, gives XP by stars for the first rounds of the day, and knows the steps', async () => {
    const P = await login('patientA');
    const [me] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
    await sql('DELETE FROM hero_minigames WHERE patient_id = $1', [me.id]);
    const start = (await P.get('/patient/hero/minigames')).body;
    expect(start.games).toHaveLength(MINIGAMES.length);
    expect(start.games.find((g: { key: string }) => g.key === 'breath')).toMatchObject({ best: 0, plays: 0, rewardsLeft: MINIGAME_REWARDED_PER_DAY });
    expect(typeof start.steps.total).toBe('number');

    const xp0 = Number((await P.get('/patient/hero/adventure')).body.xp);
    // Breathing: 6 calm breaths are two stars.
    const r1 = (await P.post('/patient/hero/minigames/breath', { score: 6 })).body;
    expect(r1).toMatchObject({ score: 6, stars: 2, xp: minigameXp(2), newBest: true, best: 6 });
    expect(Number((await P.get('/patient/hero/adventure')).body.xp)).toBe(xp0 + minigameXp(2));
    // A lower round keeps the best; above the most a round can score is not believed.
    const r2 = (await P.post('/patient/hero/minigames/breath', { score: 2 })).body;
    expect(r2).toMatchObject({ stars: 0, newBest: false, best: 6 });
    const r3 = (await P.post('/patient/hero/minigames/breath', { score: 9999 })).body;
    expect(r3.score).toBe(30);
    expect(r3.stars).toBe(3);
    // Rewarded rounds are used up; the next still counts for the best and the plays.
    const r4 = (await P.post('/patient/hero/minigames/breath', { score: 10 })).body;
    expect(r4.xp).toBe(0);
    expect(r4.games.find((g: { key: string }) => g.key === 'breath')).toMatchObject({ best: 30, plays: 4, rewardsLeft: 0 });

    expect((await P.post('/patient/hero/minigames/nope', { score: 1 })).status).toBe(404);
    expect((await P.post('/patient/hero/minigames/breath', { score: -1 })).status).toBe(400);
    await sql('DELETE FROM hero_minigames WHERE patient_id = $1', [me.id]);
  });
});
