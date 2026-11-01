import { describe, it, expect, beforeAll } from 'vitest';
import { Client, login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import pg from 'pg';

beforeAll(async () => {
  await seedDb();
  resetRateLimits();
});

const signup = (body: Record<string, unknown>) => new Client().post('/auth/signup', { locale: 'nl', acceptTerms: true, password: 'Sterk-wachtwoord-1', ...body });

describe('account types', () => {
  it('advertises the sign-up options', async () => {
    expect((await new Client().get('/auth/options')).body.signup).toEqual(['coach', 'personal']);
  });

  it('a personal account trains for itself: fitness only, self-check before strength, no warning-sign reports', async () => {
    const me = new Client();
    const r = await me.post('/auth/signup', { kind: 'personal', fullName: 'Sam de Vries', email: 'sam@voorbeeld.test', password: 'Sterk-wachtwoord-1', acceptTerms: true });
    expect(r.status).toBe(201);
    expect(r.body.user.memberships).toEqual([]); // trains, does not manage
    expect(r.body.user.patient.kind).toBe('personal');
    expect(r.body.user.idleMinutes).toBeNull();

    const modes = (await me.get('/patient/modes')).body;
    expect(modes.kind).toBe('personal');
    expect(modes.modules).toEqual(['kracht', 'mobiliteit']);
    expect(modes.active).toBe('kracht');
    expect(modes.templates.length).toBeGreaterThan(0);
    expect(modes.templates.every((t: { module: string }) => t.module !== 'revalidatie')).toBe(true);
    expect((await me.put('/patient/mode', { mode: 'revalidatie' })).body.error).toBe('rehab_needs_physio');

    // Mobility can start straight away; strength only after the self-check.
    const mob = modes.templates.find((t: { module: string }) => t.module === 'mobiliteit');
    expect((await me.post('/patient/programs/start', { templateId: mob.id })).status).toBe(201);
    const str = modes.templates.find((t: { module: string }) => t.module === 'kracht');
    expect((await me.post('/patient/programs/start', { templateId: str.id })).body.error).toBe('strength_not_cleared');
    expect((await me.post('/patient/self-check', { anyYes: true })).body.outcome).toBe('see_doctor');
    expect((await me.post('/patient/programs/start', { templateId: str.id })).body.error).toBe('strength_not_cleared');
    expect((await me.post('/patient/self-check', { anyYes: true, doctorOk: true })).body.outcome).toBe('doctor_ok');
    const started = await me.post('/patient/programs/start', { templateId: str.id });
    expect(started.status).toBe(201);
    expect((await me.get('/patient/modes')).body.selfCheck.outcome).toBe('doctor_ok');

    // No clinical warning-sign report (nobody to send it to); general advice in the app instead.
    expect((await me.post(`/patient/programs/${started.body.id}/red-flag`, { flags: ['Pijn op de borst'] })).body.error).toBe('red_flag_needs_physio');
    // Not a staff member anywhere.
    expect((await me.get('/patients')).status).toBe(403);
    // The hero works as for everyone.
    expect((await me.get('/patient/hero')).status).toBe(200);
  });

  it('a coach gets a studio with clients, fitness templates and two-step verification; no rehab programmes', async () => {
    const coach = new Client();
    const r = await coach.post('/auth/signup', { kind: 'coach', fullName: 'Kim Jansen', businessName: 'Kim Coaching', email: 'kim@voorbeeld.test', password: 'Sterk-wachtwoord-1', acceptTerms: true });
    expect(r.status).toBe(201);
    expect(r.body.user.memberships[0]).toMatchObject({ kind: 'coach', role: 'owner', practiceName: 'Kim Coaching' });
    expect(r.body.user.mfaRequired).toBe(true);
    // Like every practice account, staff screens wait until two-step verification is on.
    expect((await coach.get('/patients')).body.error).toBe('mfa_required');

    // The database itself refuses a rehab programme for a client of a coach.
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    try {
      const pid = r.body.user.memberships[0].practiceId;
      const tpl = (await db.query("SELECT count(*)::int AS n FROM programs WHERE practice_id = $1 AND is_template AND module IN ('kracht','mobiliteit')", [pid])).rows[0].n;
      expect(tpl).toBeGreaterThan(0);
      const pat = (await db.query("INSERT INTO patients(practice_id, first_name, last_name) VALUES ($1,'Test','Klant') RETURNING id", [pid])).rows[0].id;
      const plain = await db.query("INSERT INTO programs(practice_id, patient_id, title, status) VALUES ($1,$2,'Schema','draft') RETURNING module", [pid, pat]);
      expect(plain.rows[0].module).toBe('kracht');
      await expect(
        db.query("INSERT INTO programs(practice_id, patient_id, title, module, status, series_key, phase_no) VALUES ($1,$2,'Knie','revalidatie','draft','knie',1)", [pid, pat]),
      ).rejects.toThrow(/physiotherapy/);
    } finally {
      await db.end();
    }
  });

  it('refuses a used e-mail address, weak passwords and missing consent', async () => {
    resetRateLimits();
    expect((await signup({ kind: 'personal', fullName: 'Emma', email: 'patient@praktijk-a.test' })).body.error).toBe('email_in_use');
    expect((await signup({ kind: 'personal', fullName: 'Lisa', email: 'lisa@voorbeeld.test', password: 'kort' })).body.error).toBe('password_too_short');
    expect((await signup({ kind: 'personal', fullName: 'Lisa', email: 'lisa@voorbeeld.test', acceptTerms: false })).status).toBe(400);
    expect((await signup({ kind: 'physio', fullName: 'Lisa', email: 'lisa@voorbeeld.test' })).status).toBe(400);
  });

  it('physiotherapy practices keep all clinical features; the session says which kind it is', async () => {
    const ther = await login('therapistA');
    const me = (await ther.get('/auth/me')).body.user;
    expect(me.memberships[0].kind).toBe('physio');
    const pat = await login('patientA');
    expect((await pat.get('/auth/me')).body.user.patient.kind).toBe('physio');
    expect((await pat.get('/patient/modes')).body.modules).toEqual(['revalidatie', 'kracht', 'mobiliteit']);
  });
});
