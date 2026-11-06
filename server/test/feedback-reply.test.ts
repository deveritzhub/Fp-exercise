import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

describe('reply to a workout', () => {
  it('own practice can mark seen with a reply that reaches the patient; another practice cannot', async () => {
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    const sid = (await db.query(`SELECT id FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1`, [s.patients.emma])).rows[0].id;
    await db.end();
    expect((await (await login('therapistB')).post(`/patients/sessions/${sid}/review`, { reply: 'x' })).status).toBe(404);
    const r = await (await login('therapistA')).post(`/patients/sessions/${sid}/review`, { reply: 'Goed gedaan, volgende week iets zwaarder.' });
    expect(r.body).toEqual({ ok: true, delivered: true });
    const home = await (await login('patientA')).get('/patient/home');
    const n = home.body.notifications.find((x: any) => x.title === 'Reactie van je fysiotherapeut');
    expect(n?.body).toBe('Goed gedaan, volgende week iets zwaarder.');
    // Without a reply: only marked as seen.
    expect((await (await login('therapistA')).post(`/patients/sessions/${sid}/review`)).body).toEqual({ ok: true, delivered: false });
  });
});
