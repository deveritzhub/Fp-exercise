import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import pg from 'pg';
import webpush from 'web-push';
import { login, seedDb, type Seed } from './helpers';
import { runDueReminders, validEndpoint } from '../src/auth/push';
import { toISODate } from '../../shared/adherence';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
let owner: pg.Client;

beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
  owner = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await owner.connect();
});
afterAll(async () => {
  vi.restoreAllMocks();
  await owner.end();
});

describe('feedback', () => {
  it('therapists and patients can send it; only practice admins see their own practice', async () => {
    const patient = await login('patientA');
    const therapist = await login('therapistA');
    expect((await patient.post('/feedback', { kind: 'idea', message: 'Graag een donkere modus', page: '/p?x=1' })).status).toBe(201);
    expect((await therapist.post('/feedback', { kind: 'problem', message: 'Knop doet niks' })).status).toBe(201);
    expect((await therapist.post('/feedback', { kind: 'rant', message: 'x' })).status).toBe(400);
    expect((await therapist.post('/feedback', { kind: 'idea', message: '   ' })).status).toBe(400);

    expect((await therapist.get('/feedback')).status).toBe(403);
    const ownerA = (await (await login('ownerA')).get('/feedback')).body.items;
    expect(ownerA.map((f: any) => f.message).sort()).toEqual(['Graag een donkere modus', 'Knop doet niks']);
    expect(ownerA.find((f: any) => f.role === 'patient').page).toBe('/p'); // query string dropped
    expect((await (await login('ownerB')).get('/feedback')).body.items).toHaveLength(0);
    expect((await (await login('admin')).get('/feedback')).body.items.length).toBeGreaterThanOrEqual(2);
  });
});

describe('offline workouts (synced later)', () => {
  it('a workout started and finished offline is stored on the right day; replays are harmless', async () => {
    const c = await login('patientA');
    const id = crypto.randomUUID();
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000);
    const start = await c.post('/patient/sessions', { programId: s.programs.emma, id, startedAt: twoDaysAgo.toISOString() });
    expect(start.status).toBe(201);
    expect(start.body).toEqual({ id, resumed: false });
    expect((await c.post('/patient/sessions', { programId: s.programs.emma, id, startedAt: twoDaysAgo.toISOString() })).body.resumed).toBe(true);

    const program = (await c.get(`/patient/programs/${s.programs.emma}`)).body;
    expect((await c.post(`/patient/sessions/${id}/logs`, { programItemId: program.items[0].id, completed: true, pain: 2 })).status).toBe(200);
    const finished = new Date(twoDaysAgo.getTime() + 20 * 60_000).toISOString();
    expect((await c.post(`/patient/sessions/${id}/complete`, { difficulty: 4, completedAt: finished })).status).toBe(200);
    expect((await c.post(`/patient/sessions/${id}/complete`, { difficulty: 4, completedAt: finished })).status).toBe(200);
    const { rows } = await owner.query('SELECT completed_at FROM workout_sessions WHERE id = $1', [id]);
    expect(new Date(rows[0].completed_at).toISOString()).toBe(finished);

    // Someone else cannot hijack or probe that id.
    const other = await login('patientB');
    expect((await other.post('/patient/sessions', { programId: s.programs.noah, id })).status).toBe(409);
  });

  it('client times are clamped: no future and no older than 7 days', async () => {
    const c = await login('patientA');
    const id = crypto.randomUUID();
    await c.post('/patient/sessions', { programId: s.programs.emma, id, startedAt: '2001-01-01T00:00:00Z' });
    await c.post(`/patient/sessions/${id}/complete`, { completedAt: '2099-01-01T00:00:00Z' });
    const { rows } = await owner.query('SELECT started_at, completed_at FROM workout_sessions WHERE id = $1', [id]);
    expect(Date.now() - new Date(rows[0].started_at).getTime()).toBeLessThanOrEqual(7 * 86400_000 + 5000);
    expect(new Date(rows[0].completed_at).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe('push reminders', () => {
  const endpoint = 'https://fcm.googleapis.com/fcm/send/test-device-1';
  const keys = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };

  it('only accepts real push services as endpoint (no SSRF)', () => {
    expect(validEndpoint(endpoint)).toBe(true);
    expect(validEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(validEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(validEndpoint('https://169.254.169.254/latest')).toBe(false);
    expect(validEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(false);
    expect(validEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
  });

  it('patients manage reminders; staff cannot; the runtime role cannot read subscriptions', async () => {
    const c = await login('patientA');
    const st = await c.get('/reminders');
    expect(st.status).toBe(200);
    expect(st.body.publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/);
    expect((await c.post('/reminders/subscribe', { endpoint: 'https://evil.example/x', keys })).status).toBe(400);
    expect((await c.post('/reminders/subscribe', { endpoint, keys })).status).toBe(200);
    expect((await c.put('/reminders', { enabled: true, time: '07:30' })).status).toBe(200);
    expect((await c.put('/reminders', { enabled: true, time: '23:30' })).status).toBe(400);
    expect((await c.get('/reminders')).body).toMatchObject({ enabled: true, time: '07:30', endpoints: [endpoint] });
    expect((await (await login('therapistA')).get('/reminders')).status).toBe(403);

    const app = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await app.connect();
    await expect(app.query('SELECT * FROM push_subscriptions')).rejects.toThrow(/permission denied/);
    await expect(app.query(`SELECT * FROM app.due_reminders(current_date, '08:00')`)).rejects.toThrow(/permission denied/);
    await app.end();
  });

  it('sends once per day, only on training days without a completed workout, with a generic text', async () => {
    const send = vi.spyOn(webpush, 'sendNotification').mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    // Make today a training day for Emma, and start from a clean slate.
    await owner.query(`UPDATE program_items SET days = '{1,2,3,4,5,6,7}' WHERE program_id = $1`, [s.programs.emma]);
    await owner.query(`DELETE FROM workout_sessions WHERE patient_id = $1 AND completed_at::date = current_date`, [s.patients.emma]);
    const today = toISODate(new Date());

    expect((await runDueReminders({ date: today, time: '07:00' })).sent).toBe(0); // before the set time
    const r = await runDueReminders({ date: today, time: '07:45' });
    expect(r.sent).toBe(1);
    const payload = JSON.parse(send.mock.calls[0][1] as string);
    expect(payload.body).toMatch(/oefeningen voor vandaag/);
    expect(JSON.stringify(payload)).not.toMatch(/Emma|knie|pijn/i);
    expect((await runDueReminders({ date: today, time: '08:00' })).sent).toBe(0); // already sent today
    expect((await runDueReminders({ date: today, time: '11:00' })).due).toBe(0);

    // Next day, but the workout is already done => no reminder.
    const tomorrow = toISODate(new Date(Date.now() + 86400_000));
    await owner.query(
      `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at)
       SELECT practice_id, patient_id, id, version, ($2::date + time '06:00') AT TIME ZONE 'Europe/Amsterdam', ($2::date + time '06:30') AT TIME ZONE 'Europe/Amsterdam'
         FROM programs WHERE id = $1`,
      [s.programs.emma, tomorrow],
    );
    expect((await runDueReminders({ date: tomorrow, time: '07:45' })).due).toBe(0);
  });

  it('removes subscriptions the push service reports as expired', async () => {
    resetRateLimits();
    vi.spyOn(webpush, 'sendNotification').mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));
    const c = await login('patientA');
    expect((await c.post('/reminders/test')).body.sent).toBe(0);
    expect((await c.get('/reminders')).body.endpoints).toEqual([]);
  });
});
