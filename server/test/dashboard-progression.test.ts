import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

const setScores = async (difficulty: number, pain: number, n: number) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    await db.query(
      `UPDATE workout_sessions SET difficulty = $2, pain = $3
        WHERE id IN (SELECT id FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT $4)`,
      [s.patients.emma, difficulty, pain, n],
    );
    // Recent enough for the dashboard window.
    await db.query(`UPDATE workout_sessions SET completed_at = least(completed_at, now()) WHERE patient_id = $1`, [s.patients.emma]);
  } finally {
    await db.end();
  }
};

describe('dashboard: progression from the patient\'s own scores', () => {
  it('light workouts with little pain: ready for more load', async () => {
    await setScores(2, 1, 4);
    const d = await (await login('therapistA')).get('/dashboard');
    const emma = d.body.attention.find((x: any) => x.patientId === s.patients.emma);
    expect(emma?.reasons).toContain('ready_heavier');
  });
  it('very heavy workouts: too heavy?', async () => {
    await setScores(9, 3, 2);
    const d = await (await login('therapistA')).get('/dashboard');
    const emma = d.body.attention.find((x: any) => x.patientId === s.patients.emma);
    expect(emma?.reasons).toContain('too_heavy');
    expect(emma?.reasons).not.toContain('ready_heavier');
  });
});
