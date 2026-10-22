import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { Client, login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
let A: Client, B: Client, ownerA: Client, patientA: Client, patientB: Client, admin: Client, anon: Client;

beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
  [A, B, ownerA, patientA, patientB, admin] = await Promise.all([
    login('therapistA'), login('therapistB'), login('ownerA'), login('patientA'), login('patientB'), login('admin'),
  ]);
  anon = new Client();
});

describe('API-level tenant isolation (Practice A vs Practice B)', () => {
  it('patient lists only contain own practice', async () => {
    const a = await ownerA.get('/patients');
    const b = await B.get('/patients');
    expect(a.body.items.every((p: any) => p.practiceId === s.practices.A)).toBe(true);
    expect(b.body.items.every((p: any) => p.practiceId === s.practices.B)).toBe(true);
    expect(b.body.items.map((p: any) => p.id)).not.toContain(s.patients.emma);
  });

  it('cannot read, edit, invite, export or view progress of another practice patient by id', async () => {
    const id = s.patients.emma;
    expect((await B.get(`/patients/${id}`)).status).toBe(404);
    expect((await B.patch(`/patients/${id}`, { firstName: 'X', lastName: 'Y' })).status).toBe(404);
    expect((await B.post(`/patients/${id}/invite`)).status).toBe(404);
    expect((await B.get(`/patients/${id}/progress`)).status).toBe(404);
    expect((await B.get(`/patients/${id}/export`)).status).toBe(404);
    expect((await B.post(`/patients/${id}/archive`)).status).toBe(404);
  });

  it('spoofing the practice header does not grant access', async () => {
    B.practiceId = s.practices.A;
    expect((await B.get('/patients')).status).toBe(403);
    B.practiceId = undefined;
  });

  it('cannot read or modify another practice program', async () => {
    const pid = s.programs.emma;
    expect((await B.get(`/programs/${pid}`)).status).toBe(404);
    expect((await B.put(`/programs/${pid}`, { title: 'hack', items: [] })).status).toBe(404);
    expect((await B.post(`/programs/${pid}/status`, { status: 'archived' })).status).toBe(404);
    expect((await B.post(`/programs/${pid}/duplicate`, { asTemplate: true })).status).toBe(404);
    expect((await B.get(`/programs/${pid}/versions`)).body.items).toHaveLength(0);
  });

  it('cannot create a program for another practice patient', async () => {
    const r = await B.post('/programs', { patientId: s.patients.emma, title: 'Hack', items: [] });
    expect(r.status).toBe(404);
  });

  it('custom exercises are private to their practice and cannot be used by others', async () => {
    expect((await B.get(`/exercises/${s.customA}`)).status).toBe(404);
    const list = await B.get('/exercises?q=sledge');
    expect(list.body.items).toHaveLength(0);
    expect((await A.get(`/exercises/${s.customA}`)).status).toBe(200);
    const r = await B.post('/programs', {
      patientId: s.patients.noah, title: 'Met vreemde oefening', items: [{ exerciseId: s.customA, days: [1] }],
    });
    expect(r.status).toBe(400);
    expect((await B.patch(`/exercises/${s.customA}`, { nameNl: 'Hacked', nameEn: 'Hacked', bodyRegion: 'knee' })).status).toBe(404);
    expect((await B.post(`/exercises/${s.customA}/favorite`)).status).toBe(404);
  });

  it('global exercises cannot be edited by practices', async () => {
    const r = await ownerA.patch(`/exercises/${s.exercises.glute_bridge}`, { nameNl: 'Changed', nameEn: 'Changed', bodyRegion: 'hip' });
    expect(r.status).toBe(400);
  });

  it('practice templates are private; global templates are shared', async () => {
    const tA = (await A.get('/programs/templates')).body.items.map((t: any) => t.title);
    const tB = (await B.get('/programs/templates')).body.items.map((t: any) => t.title);
    expect(tA).toContain('FP — Return to run basis');
    expect(tB).not.toContain('FP — Return to run basis');
    expect(tB).toContain('Lage rug — algemeen herstel');
  });

  it('cannot assign a therapist from another practice', async () => {
    const r = await ownerA.put(`/patients/${s.patients.emma}/therapists`, { therapistIds: [s.users.therapistB] });
    expect(r.status).toBe(403);
  });

  it('practice members, settings and audit log are isolated', async () => {
    const m = await B.get('/practice/members');
    expect(m.body.items.map((x: any) => x.email)).not.toContain('therapeut@praktijk-a.test');
    expect((await A.get('/practice/audit')).status).toBe(403); // therapist is not a practice admin
    const audit = await ownerA.get('/practice/audit');
    expect(audit.status).toBe(200);
    expect(JSON.stringify(audit.body)).not.toContain(s.practices.B);
  });

  it('patients only see their own data', async () => {
    expect((await patientA.get(`/patient/programs/${s.programs.emma}`)).status).toBe(200);
    expect((await patientA.get(`/patient/programs/${s.programs.noah}`)).status).toBe(404);
    expect((await patientB.get(`/patient/programs/${s.programs.emma}`)).status).toBe(404);
    const home = await patientB.get('/patient/home');
    expect(home.body.programs.every((p: any) => p.patientId === s.patients.noah)).toBe(true);
    expect((await patientB.get(`/exercises/${s.customA}`)).status).toBe(404);
    expect((await patientB.post('/patient/sessions', { programId: s.programs.emma })).status).toBe(404);
  });

  it('within a practice, therapists only access assigned patients', async () => {
    // Sophie is assigned to ownerA only; therapistA (not admin) must not see her.
    expect((await A.get(`/patients/${s.patients.sophie}`)).status).toBe(404);
    const list = await A.get('/patients');
    expect(list.body.items.map((p: any) => p.id)).not.toContain(s.patients.sophie);
    // the owner (practice admin) can
    expect((await ownerA.get(`/patients/${s.patients.sophie}`)).status).toBe(200);
  });

  it('platform administrator has no clinical access through the ordinary interface', async () => {
    const practices = await admin.get('/admin/practices');
    expect(practices.body.items).toHaveLength(2);
    expect(practices.body.items[0]).toHaveProperty('activePatients');
    expect((await admin.get('/patients')).status).toBe(403);
    expect((await admin.get(`/patients/${s.patients.emma}`)).status).toBe(403);
    expect((await admin.get(`/patient/programs/${s.programs.emma}`)).status).toBe(403);
    expect((await A.get('/admin/practices')).status).toBe(403);
  });

  it('unauthenticated requests are rejected', async () => {
    for (const p of ['/patients', '/exercises', '/dashboard', `/programs/${s.programs.emma}`, '/patient/home', '/admin/practices']) {
      expect((await anon.get(p)).status).toBe(401);
    }
  });
});

describe('database-level isolation (direct SQL as the runtime role)', () => {
  let db: pg.Client;
  beforeAll(async () => {
    db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
  });
  afterAll(() => db.end());

  const as = async (userId: string | null, sql: string, params: unknown[] = []) => {
    await db.query('BEGIN');
    try {
      await db.query("SELECT set_config('app.user_id', $1, true)", [userId ?? '']);
      return (await db.query(sql, params)).rows;
    } finally {
      await db.query('ROLLBACK');
    }
  };

  it('the runtime role cannot bypass RLS', async () => {
    const r = await db.query("SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user");
    expect(r.rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it('without an authenticated user no tenant data is visible', async () => {
    for (const t of ['patients', 'programs', 'workout_sessions', 'exercise_logs', 'practices', 'users', 'exercises', 'media']) {
      expect(await as(null, `SELECT ${t === 'users' ? 'id' : '*'} FROM ${t}`)).toHaveLength(0);
    }
  });

  it('Practice B therapist sees zero Practice A rows even with unfiltered SELECT *', async () => {
    const u = s.users.therapistB;
    expect((await as(u, 'SELECT practice_id FROM patients')).every((r) => r.practice_id === s.practices.B)).toBe(true);
    expect(await as(u, 'SELECT * FROM programs WHERE practice_id = $1', [s.practices.A])).toHaveLength(0);
    expect(await as(u, 'SELECT * FROM workout_sessions WHERE practice_id = $1', [s.practices.A])).toHaveLength(0);
    expect(await as(u, 'SELECT * FROM exercise_logs WHERE practice_id = $1', [s.practices.A])).toHaveLength(0);
    expect(await as(u, 'SELECT * FROM exercise_clinical_notes WHERE practice_id = $1', [s.practices.A])).toHaveLength(0);
    expect(await as(u, 'SELECT * FROM practices WHERE id = $1', [s.practices.A])).toHaveLength(0);
  });

  it('cross-tenant writes are rejected by policies', async () => {
    const u = s.users.therapistB;
    await expect(
      as(u, `INSERT INTO patients(practice_id, first_name, last_name, created_by) VALUES ($1,'X','Y',$2)`, [s.practices.A, u]),
    ).rejects.toThrow(/row-level security/);
    const upd = await as(u, `UPDATE patients SET first_name = 'hacked' WHERE practice_id = $1 RETURNING id`, [s.practices.A]);
    expect(upd).toHaveLength(0);
    const del = await as(u, `DELETE FROM programs WHERE practice_id = $1 RETURNING id`, [s.practices.A]);
    expect(del).toHaveLength(0);
    await expect(
      as(u, `INSERT INTO practice_members(practice_id, user_id, role) VALUES ($1,$2,'owner')`, [s.practices.A, u]),
    ).rejects.toThrow(/row-level security/);
  });

  it('patients cannot forge sessions for other patients or read clinical notes', async () => {
    const u = s.users.patientB;
    await expect(
      as(u, `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version) VALUES ($1,$2,$3,1)`, [s.practices.A, s.patients.emma, s.programs.emma]),
    ).rejects.toThrow(/row-level security/);
    expect(await as(u, 'SELECT * FROM exercise_clinical_notes')).toHaveLength(0);
    expect(await as(u, 'SELECT * FROM program_versions')).toHaveLength(0);
  });

  it('the runtime role has no access to auth secrets or the audit trail mutation', async () => {
    await expect(db.query('SELECT * FROM auth_sessions')).rejects.toThrow(/permission denied/);
    await expect(db.query('SELECT password_hash FROM users')).rejects.toThrow(/permission denied/);
    await expect(db.query('SELECT * FROM users')).rejects.toThrow(/permission denied/);
    await expect(db.query('UPDATE audit_log SET action = $1', ['x'])).rejects.toThrow(/permission denied/);
    await expect(db.query('DELETE FROM audit_log')).rejects.toThrow(/permission denied/);
  });
});
