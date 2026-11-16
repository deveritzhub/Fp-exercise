import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';

const ownerQuery = async (sql: string, params: unknown[] = []) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try { return await db.query(sql, params); } finally { await db.end(); }
};

let seed: Seed;
const LOOK = { frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' };

beforeAll(async () => { seed = await seedDb(); });

describe('measurement boss', () => {
  it('defeats the boss from a clinician measurement without releasing the next phase', async () => {
    const therapist = await login('therapistA');
    const emma = await login('patientA');
    await emma.put('/patient/hero', { ...LOOK, heroName: 'Emma' });
    const programId = seed.programs.emma;
    const before = (await ownerQuery('SELECT phase_no, status FROM programs WHERE id = $1', [programId])).rows[0];
    expect((await therapist.put(`/programs/${programId}/boss`, {
      source: 'outcome', domain: 'rom', metric: 'Kniebuiging', unit: 'degrees', side: 'right', comparator: 'gte', target: 120, labelNl: 'Knie buigen', labelEn: 'Bend the knee',
    })).status).toBe(200);

    const other = await login('therapistB');
    expect((await other.get(`/programs/${programId}/boss`)).status).toBe(404);
    expect((await other.put(`/programs/${programId}/boss`, {
      source: 'outcome', domain: 'rom', metric: 'Kniebuiging', unit: 'degrees', side: 'right', comparator: 'gte', target: 10, labelNl: 'X', labelEn: 'X',
    })).status).toBe(404);

    await therapist.post(`/patients/${seed.patients.emma}/outcomes`, { domain: 'rom', metric: 'Kniebuiging', value: 90, unit: 'degrees', side: 'right', measuredOn: '2026-10-01', note: '' });
    await therapist.post(`/patients/${seed.patients.emma}/outcomes`, { domain: 'rom', metric: 'Kniebuiging', value: 105, unit: 'degrees', side: 'right', measuredOn: '2026-10-15', note: '' });
    const mid = (await emma.get('/patient/world')).body;
    const zone = mid.zones.find((z: { programId: string | null }) => z.programId === programId);
    expect(zone.measure).toMatchObject({ remaining: 15, defeated: false });
    expect(zone.measure.ratio).toBeCloseTo(0.5);
    expect(JSON.stringify(zone.measure)).not.toMatch(/rom|diagnosis|diagnose/);

    await therapist.post(`/patients/${seed.patients.emma}/outcomes`, { domain: 'rom', metric: 'Kniebuiging', value: 120, unit: 'degrees', side: 'right', measuredOn: '2026-11-01', note: '' });
    const won = (await emma.get('/patient/world')).body.zones.find((z: { programId: string | null }) => z.programId === programId);
    expect(won.measure.defeated).toBe(true);
    expect(won.measure.remaining).toBe(0);
    const after = (await ownerQuery('SELECT phase_no, status FROM programs WHERE id = $1', [programId])).rows[0];
    expect(after).toEqual(before);

    await therapist.post(`/patients/${seed.patients.emma}/outcomes`, { domain: 'rom', metric: 'Kniebuiging', value: 100, unit: 'degrees', side: 'right', measuredOn: '2026-11-02', note: '' });
    expect((await emma.get('/patient/world')).body.zones.find((z: { programId: string | null }) => z.programId === programId).measure.defeated).toBe(true);

    const dash = (await therapist.get('/dashboard')).body;
    const row = dash.attention.find((a: { patientId: string }) => a.patientId === seed.patients.emma);
    expect(row.reasons).toContain('boss_met');

    expect((await emma.put('/patient/hero/heirloom', { kind: 'shield' })).status).toBe(200);
    expect((await emma.put('/patient/hero/heirloom', { kind: 'weapon' })).body.error).toBe('heirloom_locked');
    const best = Number((await ownerQuery('SELECT heirloom_best FROM patient_heroes WHERE patient_id = $1', [seed.patients.emma])).rows[0].heirloom_best);
    expect(best).toBeGreaterThan(0);
    await ownerQuery('UPDATE patient_heroes SET heirloom_best = 0 WHERE patient_id = $1', [seed.patients.emma]);
    expect(Number((await ownerQuery('SELECT heirloom_best FROM patient_heroes WHERE patient_id = $1', [seed.patients.emma])).rows[0].heirloom_best)).toBe(best);
  });

  it('a coach cannot store a clinical boss goal', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    const practice = seed.practices.B;
    await db.query('ALTER TABLE practices DISABLE TRIGGER USER');
    await db.query(`UPDATE practices SET kind = 'coach' WHERE id = $1`, [practice]);
    try {
      const coach = await login('therapistB');
      const denied = await coach.put(`/programs/${seed.programs.noah}/boss`, {
        source: 'outcome', domain: 'rom', metric: 'Kniebuiging', unit: 'degrees', side: 'right', comparator: 'gte', target: 120, labelNl: 'Knie', labelEn: 'Knee',
      });
      expect(denied.status).toBe(400);
      const ok = await coach.put(`/programs/${seed.programs.noah}/boss`, {
        source: 'mobility', testKey: 'knee_to_wall', side: 'right', comparator: 'gte', target: 12, labelNl: 'Enkel naar de muur', labelEn: 'Ankle to the wall',
      });
      expect(ok.status).toBe(200);
      expect(ok.body.goal.source).toBe('mobility');
    } finally {
      await db.query(`UPDATE practices SET kind = 'physio' WHERE id = $1`, [practice]);
      await db.query('ALTER TABLE practices ENABLE TRIGGER USER');
      await db.end();
    }
  });
});
