import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

const ownerQuery = async (sql: string, params: unknown[] = []) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return await db.query(sql, params);
  } finally {
    await db.end();
  }
};

let seed: Seed;

beforeAll(async () => {
  seed = await seedDb();
  resetRateLimits();
});

describe('world map and practice guild raid', () => {
  it('keeps a future phase locked, hides a small guild, and never lists people', async () => {
    await ownerQuery(
      `UPDATE programs SET series_key = 'world-knee', series_title = 'Knie', phase_no = 2, phase_count = 3, phase_name = 'Kracht', phase_weeks = '5-8', phase_goal = 'Controle'
        WHERE id = $1`,
      [seed.programs.emma],
    );
    for (const [no, name] of [[1, 'Basis'], [2, 'Kracht'], [3, 'Sport']] as const) {
      await ownerQuery(
        `INSERT INTO programs(practice_id, is_template, title, status, module, series_key, series_title, phase_no, phase_count, phase_name, phase_weeks, phase_goal)
         VALUES ($1, true, $2, 'active', 'revalidatie', 'world-knee', 'Knie', $3, 3, $2, '1-4', 'Doel')`,
        [seed.practices.A, name, no],
      );
    }
    const emma = await login('patientA');
    const world = (await emma.get('/patient/world')).body;
    expect(world.zones.map((z: { no: number; status: string; locked: boolean }) => [z.no, z.status, z.locked])).toEqual([
      [1, 'done', false],
      [2, 'current', false],
      [3, 'next', true],
    ]);
    expect(world.heroZoneNo).toBe(2);
    expect(world.zones[1].region).toBe('knee');
    expect(world.guild.available).toBe(false);
    expect(world.guild).not.toHaveProperty('workouts');
    expect(world.guild).not.toHaveProperty('bossHp');
    const json = JSON.stringify(world);
    expect(json).not.toMatch(/Emma|Lucas|Sophie|Daan|de Jong/);
    expect((await emma.post('/patient/world')).status).toBe(404);

    const therapist = await login('therapistA');
    const staff = (await therapist.get('/practice/guild')).body;
    expect(staff).toEqual({ available: false });
    expect(JSON.stringify(staff)).not.toMatch(/reward|workout|Emma/);
  });

  it('opens the raid only as a practice total once five patients exist, and rest or pain removes nothing', async () => {
    const extra = (await ownerQuery(
      `INSERT INTO patients(practice_id, first_name, last_name) VALUES ($1, 'Guild', 'Synthetic') RETURNING id`,
      [seed.practices.A],
    )).rows[0].id as string;
    const week = `(s.completed_at AT TIME ZONE 'Europe/Amsterdam')::date >= date_trunc('week', now() AT TIME ZONE 'Europe/Amsterdam')::date
        AND (s.completed_at AT TIME ZONE 'Europe/Amsterdam')::date < date_trunc('week', now() AT TIME ZONE 'Europe/Amsterdam')::date + 7`;
    const prescribed = async () => Number((await ownerQuery(
      `SELECT count(*)::int AS n FROM workout_sessions s JOIN patients pt ON pt.id = s.patient_id
        WHERE pt.practice_id = $1 AND pt.archived_at IS NULL AND s.completed_at IS NOT NULL AND ${week}`,
      [seed.practices.A],
    )).rows[0].n);
    const beforeExtra = await prescribed();
    await ownerQuery(
      `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at)
       VALUES ($1, $2, $3, 1, now(), now()), ($1, $4, $3, 1, now(), now())`,
      [seed.practices.A, extra, seed.programs.emma, seed.patients.emma],
    );
    await ownerQuery(
      `INSERT INTO self_trainings(patient_id, practice_id, day, kind, minutes, pain)
       VALUES ($1, $2, (now() AT TIME ZONE 'Europe/Amsterdam')::date, 'walk', 20, 3)`,
      [seed.patients.emma, seed.practices.A],
    );
    const totals = await prescribed();
    expect(totals).toBe(beforeExtra + 2);
    const emma = await login('patientA');
    const open = (await emma.get('/patient/world')).body;
    expect(open.guild.available).toBe(true);
    expect(open.guild.participantsBand).toBe('5+');
    expect(open.guild.workouts).toBe(totals);
    expect(open.guild.bossMaxHp).toBe(40);
    expect(open.guild.bossHp).toBe(Math.max(0, 40 - open.guild.workouts));
    expect(open.guild.reward).toBe(true);
    expect(Object.keys(open.guild).sort()).toEqual(['available', 'bossHp', 'bossMaxHp', 'defeated', 'participantsBand', 'reward', 'workouts']);
    expect(JSON.stringify(open.guild)).not.toMatch(/Guild|Synthetic|Emma|cohort|mine/);

    const zones = open.zones.map((z: { no: number; status: string; nodes: number }) => ({ no: z.no, status: z.status, nodes: z.nodes }));
    await ownerQuery(
      `INSERT INTO daily_checkins(patient_id, practice_id, day, area, score)
       VALUES ($1, $2, (now() AT TIME ZONE 'Europe/Amsterdam')::date, 'knee_r', 4)
       ON CONFLICT (patient_id, day) DO UPDATE SET score = 4`,
      [seed.patients.emma, seed.practices.A],
    );
    const hurting = (await emma.get('/patient/world')).body;
    expect(hurting.rest).toEqual({ active: true, reason: 'pain' });
    expect(hurting.zones.map((z: { no: number; status: string; nodes: number }) => ({ no: z.no, status: z.status, nodes: z.nodes }))).toEqual(zones);

    const other = await login('patientB');
    const foreign = (await other.get('/patient/world')).body;
    expect(foreign.guild.available).toBe(false);
    expect(JSON.stringify(foreign)).not.toMatch(/Guild Synthetic|world-knee/);

    const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    try {
      const hidden = await db.query(
        `SELECT cohort, workouts FROM app.practice_guild_week($1, current_date)`,
        [seed.practices.A],
      );
      expect(hidden.rows[0]).toEqual({ cohort: 0, workouts: 0 });
    } finally {
      await db.end();
    }
  });
});
