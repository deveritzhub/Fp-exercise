import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

describe('dashboard: long inactivity', () => {
  it('flags a patient with an active programme and no workout for three weeks', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    try {
      // Emma's last workout was 25 days ago.
      await db.query(
        `UPDATE workout_sessions SET completed_at = now() - interval '25 days', started_at = now() - interval '25 days'
          WHERE id = (SELECT id FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1)`,
        [s.patients.emma],
      );
      await db.query(`DELETE FROM workout_sessions WHERE patient_id = $1 AND (completed_at IS NULL OR completed_at > now() - interval '24 days')`, [s.patients.emma]);
      const n = (await db.query(`SELECT count(*)::int AS n FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL`, [s.patients.emma])).rows[0].n;
      expect(n).toBeGreaterThan(0);
    } finally {
      await db.end();
    }
    const A = await login('therapistA');
    const d = await A.get('/dashboard');
    expect(d.status).toBe(200);
    const emma = d.body.attention.find((x: any) => x.patientId === s.patients.emma);
    expect(emma.reasons).toContain('inactive_long');
    const sig = emma.signals.find((x: any) => x.reason === 'inactive_long');
    expect(sig.value).toBeGreaterThanOrEqual(21);
    // Not also counted as "nothing registered this week": one clear reason.
    expect(emma.reasons).not.toContain('no_registration');
  });
});
