import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb } from './helpers';

const ownerQuery = async (sql: string, params: unknown[] = []) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try { return await db.query(sql, params); } finally { await db.end(); }
};

beforeAll(async () => { await seedDb(); });

describe('ACL measurement route', () => {
  it('shows five zones, an LSI bar, and does not open the next phase when the boss falls', async () => {
    const therapist = await login('therapistA');
    const mila = await login('aclPatient');
    const other = await login('therapistB');
    const patientId = (await ownerQuery(`SELECT id FROM patients WHERE email = 'vkb@praktijk-a.test'`)).rows[0].id as string;
    const phases = (await ownerQuery(
      `SELECT phase_no, status FROM programs WHERE patient_id = $1 AND series_key = 'acl_vkb_flagship' AND NOT is_template ORDER BY phase_no`,
      [patientId],
    )).rows;
    expect(phases.map((r) => [Number(r.phase_no), r.status])).toEqual([[1, 'completed'], [2, 'completed'], [3, 'completed'], [4, 'active'], [5, 'draft']]);

    const world = (await mila.get('/patient/world')).body;
    expect(world.zones).toHaveLength(5);
    expect(world.zones.map((z: { name: string }) => z.name)).toEqual(['De Poort', 'Het Pad', 'De Krachtbron', 'De Springsprong', 'Het Veld']);
    expect(world.zones[4].locked).toBe(true);
    expect(world.zones[4].measure).toBeNull();
    expect(world.zones[4].bossNameNl).toBe('De Terugkeer');
    expect(JSON.stringify(world.zones[4])).not.toMatch(/90|ACL-RSI|LSI|diagnose/i);
    expect(world.zones[0].measure.defeated).toBe(true);
    expect(world.zones[3].measure).toMatchObject({ labelNl: 'De Landing', remaining: 8, defeated: false });
    expect(world.zones[3].measure.latest).toBe(72);
    expect(JSON.stringify(world.zones[3].measure)).not.toMatch(/quadriceps|diagnose|ACL-RSI|lsi_quad/);

    const programId = world.zones[3].programId as string;
    expect((await other.get(`/programs/${programId}/boss`)).status).toBe(404);
    const goals = (await therapist.get(`/programs/${programId}/boss`)).body.goals;
    expect(goals[0].target).toBe(80);
    expect(goals[0].clinicalNl).toMatch(/Standaardwaarde/);

    await therapist.post(`/patients/${patientId}/outcomes`, { domain: 'strength', metric: 'Kracht voorkant been', metricKey: 'quad_strength', value: 40, unit: 'kg', side: 'right', measuredOn: '2026-11-08', note: '' });
    await therapist.post(`/patients/${patientId}/outcomes`, { domain: 'strength', metric: 'Kracht voorkant been', metricKey: 'quad_strength', value: 50, unit: 'kg', side: 'left', measuredOn: '2026-11-08', note: '' });
    const won = (await mila.get('/patient/world')).body.zones[3];
    expect(won.measure.defeated).toBe(true);
    const after = (await ownerQuery(
      `SELECT phase_no, status FROM programs WHERE patient_id = $1 AND series_key = 'acl_vkb_flagship' AND NOT is_template ORDER BY phase_no`,
      [patientId],
    )).rows;
    expect(after.map((r) => r.status)).toEqual(['completed', 'completed', 'completed', 'active', 'draft']);

    const best = Number((await ownerQuery('SELECT heirloom_best FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0].heirloom_best);
    await therapist.post(`/patients/${patientId}/outcomes`, { domain: 'strength', metric: 'Kracht voorkant been', metricKey: 'quad_strength', value: 20, unit: 'kg', side: 'right', measuredOn: '2026-11-08', note: '' });
    expect(Number((await ownerQuery('SELECT heirloom_best FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0].heirloom_best)).toBe(best);
    expect((await mila.get('/patient/world')).body.zones[3].measure.defeated).toBe(true);
  });

  it('a coach practice cannot start the route or store an ACL measurement', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    const practice = (await db.query(`SELECT id FROM practices WHERE slug = 'fysio-noord-demo'`)).rows[0].id;
    await db.query('ALTER TABLE practices DISABLE TRIGGER USER');
    await db.query(`UPDATE practices SET kind = 'coach' WHERE id = $1`, [practice]);
    try {
      const coach = await login('therapistB');
      const noah = (await db.query(`SELECT id FROM patients WHERE email = 'patient@praktijk-b.test'`)).rows[0].id;
      expect((await coach.post(`/patients/${noah}/acl-route`, { side: 'right' })).status).toBe(400);
      const reading = await coach.post(`/patients/${noah}/outcomes`, {
        domain: 'rom', metric: 'Kniebuiging', metricKey: 'knee_flexion', value: 90, unit: 'degrees', side: 'right', measuredOn: '2026-11-01', note: '',
      });
      expect(reading.status).toBe(400);
    } finally {
      await db.query(`UPDATE practices SET kind = 'physio' WHERE id = $1`, [practice]);
      await db.query('ALTER TABLE practices ENABLE TRIGGER USER');
      await db.end();
    }
  });
});
