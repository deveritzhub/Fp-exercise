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

describe('dashboard: pain rising after workouts', () => {
  it('three workouts with more pain each time (below "high pain"): pain rising', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    try {
      const ids = (await db.query(`SELECT id FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 4`, [s.patients.emma])).rows.map((r) => r.id);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      // Newest first: 5, 3, 2 (and an older one, low).
      for (const [i, pain] of [5, 3, 2, 1].entries()) if (ids[i]) await db.query(`UPDATE workout_sessions SET difficulty = 5, pain = $2 WHERE id = $1`, [ids[i], pain]);
    } finally {
      await db.end();
    }
    const d = await (await login('therapistA')).get('/dashboard');
    const emma = d.body.attention.find((x: any) => x.patientId === s.patients.emma);
    expect(emma?.reasons).toContain('pain_rising');
    expect(emma?.signals.find((x: any) => x.reason === 'pain_rising')).toMatchObject({ value: 5, planned: 2 });
  });
});

describe('dashboard: coaches draw no conclusions from how someone feels', () => {
  it('no high pain or pain rising signals for a coach practice', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    const practice = (await db.query('SELECT practice_id FROM patients WHERE id = $1', [s.patients.emma])).rows[0].practice_id;
    try {
      const ids = (await db.query(`SELECT id FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 3`, [s.patients.emma])).rows.map((r) => r.id);
      for (const [i, pain] of [7, 4, 2].entries()) await db.query(`UPDATE workout_sessions SET difficulty = 5, pain = $2 WHERE id = $1`, [ids[i], pain]);
      await db.query(`ALTER TABLE practices DISABLE TRIGGER USER`);
      await db.query(`UPDATE practices SET kind = 'coach' WHERE id = $1`, [practice]);
      const d = await (await login('therapistA')).get('/dashboard');
      const emma = d.body.attention.find((x: any) => x.patientId === s.patients.emma);
      expect(emma?.reasons ?? []).not.toContain('high_pain');
      expect(emma?.reasons ?? []).not.toContain('pain_rising');
    } finally {
      await db.query(`UPDATE practices SET kind = 'physio' WHERE id = $1`, [practice]);
      await db.query(`ALTER TABLE practices ENABLE TRIGGER USER`);
      await db.end();
    }
  });
});

describe('dashboard: same spot on the pain map worse within two weeks', () => {
  it('signals the area with from and to', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    try {
      const practice = (await db.query('SELECT practice_id FROM patients WHERE id = $1', [s.patients.emma])).rows[0].practice_id;
      await db.query(`DELETE FROM pain_map_entries WHERE patient_id = $1`, [s.patients.emma]);
      await db.query(
        `INSERT INTO pain_map_entries(patient_id, practice_id, batch, area, score, recorded_at) VALUES
           ($1, $2, gen_random_uuid(), 'knee_r', 2, now() - interval '12 days'),
           ($1, $2, gen_random_uuid(), 'knee_r', 5, now() - interval '1 day')`,
        [s.patients.emma, practice],
      );
    } finally {
      await db.end();
    }
    const d = await (await login('therapistA')).get('/dashboard');
    const emma = d.body.attention.find((x: any) => x.patientId === s.patients.emma);
    expect(emma?.signals.find((x: any) => x.reason === 'area_pain_rising')).toMatchObject({ area: 'knee_r', planned: 2, value: 5 });
  });
});
