import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

describe('a released rehabilitation phase', () => {
  it('phase 2 becoming active tells the patient "chapter 1 completed"; phase 1 does not', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    let t2: { id: string; phase_name: string | null };
    let t1: { id: string };
    try {
      // Two phases of a test series (practice templates of practice A).
      const practice = (await db.query('SELECT practice_id FROM patients WHERE id = $1', [s.patients.emma])).rows[0].practice_id;
      const tpl = async (no: number) =>
        (await db.query(
          `INSERT INTO programs(practice_id, is_template, title, status, module, series_key, series_title, phase_no, phase_count, phase_name, phase_goal)
           VALUES ($1, true, $2, 'active', 'revalidatie', 'test-knie', 'Test knie', $3, 2, $4, $5) RETURNING id, phase_name`,
          [practice, `Test knie fase ${no}`, no, no === 1 ? 'Rustig opbouwen' : 'Kracht opbouwen', no === 1 ? 'Pijnvrij lopen' : 'Traplopen zonder pijn'],
        )).rows[0];
      t1 = await tpl(1);
      t2 = await tpl(2);
    } finally {
      await db.end();
    }
    const ther = await login('therapistA');
    const exerciseId = s.exercises.box_squat;
    const make = (sourceTemplateId: string, title: string) => ther.post('/programs', { title, patientId: s.patients.emma, status: 'active', sourceTemplateId, items: [{ exerciseId, sets: 3, reps: 10, days: [1, 3, 5] }] });
    expect((await make(t1.id, 'Fase 1 test')).status).toBe(201);
    let n = (await (await login('patientA')).get('/me/notifications')).body.items.filter((x: any) => x.kind === 'phase_unlocked');
    expect(n).toHaveLength(0);
    expect((await make(t2.id, 'Fase 2 test')).status).toBe(201);
    n = (await (await login('patientA')).get('/me/notifications')).body.items.filter((x: any) => x.kind === 'phase_unlocked');
    expect(n).toHaveLength(1);
    expect(n[0].title).toBe('Hoofdstuk 1 voltooid!');
    expect(n[0].body).toContain('fase 2: Kracht opbouwen');
    expect(n[0].body).toContain('Traplopen zonder pijn');
  });
});
