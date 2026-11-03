import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb } from './helpers';
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


beforeAll(async () => {
  await seedDb();
  resetRateLimits();
});

const LOOK = { frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' };

describe('team quest with companions', () => {
  it('needs friend sharing and its own opt-in; shows only a status, and only from five participants', async () => {
    const emma = await login('patientA');
    await emma.put('/patient/hero', { ...LOOK, heroName: 'Emma' });
    // Not without sharing; off by default.
    expect((await emma.get('/patient/hero')).body.team).toMatchObject({ enabled: false, canJoin: false, available: false });
    expect((await emma.put('/patient/hero/team', { enabled: true })).body.error).toBe('sharing_off');
    await emma.put('/patient/hero/sharing', { enabled: true });
    const joined = (await emma.put('/patient/hero/team', { enabled: true })).body;
    // Alone: no status at all.
    expect(joined).toEqual({ enabled: true, canJoin: true, available: false, status: 'not_started' });

    // Four synthetic companions who share and joined the team quest, all done this week.
    const emmaId = (await ownerQuery(`SELECT p.id, p.practice_id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`)).rows[0];
    const week = (await emma.get('/patient/hero')).body.weekly.weekStart as string;
    for (let i = 0; i < 4; i++) {
      const p = (await ownerQuery(`INSERT INTO patients(practice_id, first_name, last_name) VALUES ($1, 'Team', $2) RETURNING id`, [emmaId.practice_id, `Lid ${i}`])).rows[0];
      await ownerQuery(
        `INSERT INTO patient_heroes(patient_id, practice_id, hero_name, skin, hair, outfit, sport, share_with_friends, team_opt_in, team_week, team_done)
         VALUES ($1, $2, $3, 's3', 'long', 'forest', 'running', true, true, $4, true)`,
        [p.id, emmaId.practice_id, `Lid ${i}`, week],
      );
      await ownerQuery(`INSERT INTO hero_friendships(requester_id, addressee_id, status, accepted_at) VALUES ($1, $2, 'accepted', now())`, [emmaId.id, p.id]);
    }
    const team = (await emma.get('/patient/hero')).body.team;
    expect(team.available).toBe(true);
    expect(team.participantsBand).toBe('5+');
    expect(['in_progress', 'complete']).toContain(team.status);
    // Only these keys: never who did what, how many, or my own answer.
    expect(Object.keys(team).sort()).toEqual(['available', 'canJoin', 'enabled', 'participantsBand', 'status']);
    expect(JSON.stringify((await emma.get('/patient/hero')).body)).not.toMatch(/teamDone|contributed|participants"/);

    // Leaving clears the snapshot at once; switching sharing off also leaves the team.
    expect((await emma.put('/patient/hero/team', { enabled: false })).body).toMatchObject({ enabled: false, available: false });
    const row = (await ownerQuery('SELECT team_opt_in, team_week, team_done FROM patient_heroes WHERE patient_id = $1', [emmaId.id])).rows[0];
    expect(row).toEqual({ team_opt_in: false, team_week: null, team_done: null });
    await emma.put('/patient/hero/team', { enabled: true });
    await emma.put('/patient/hero/sharing', { enabled: false });
    expect((await ownerQuery('SELECT team_opt_in FROM patient_heroes WHERE patient_id = $1', [emmaId.id])).rows[0].team_opt_in).toBe(false);
  });

  it('the group function only works for the logged-in patient', async () => {
    const lid = (await ownerQuery(`SELECT id FROM patients WHERE last_name = 'Lid 1'`)).rows[0].id;
    const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    try {
      // As the app role but without a logged-in user, nobody counts.
      const r = await db.query('SELECT participants, contributed FROM app.hero_team_week($1, current_date)', [lid]);
      expect(r.rows[0]).toEqual({ participants: 0, contributed: 0 });
    } finally {
      await db.end();
    }
  });
});
