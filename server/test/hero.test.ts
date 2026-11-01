import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { Client, login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

const LOOK = { heroName: 'Emma de Sprinter', frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'round', outfit: 'forest', sport: 'running' };

describe('sports hero', () => {
  it('the patient creates a hero, checks in pain and earns XP; the own therapist sees the body map', async () => {
    const patient = await login('patientA');
    const before = (await patient.get('/patient/hero')).body;
    expect(before.hero).toBeNull();
    expect(before.level.level).toBeGreaterThanOrEqual(1);

    expect((await patient.put('/patient/hero', { ...LOOK, skin: 'pink' })).status).toBe(400);
    expect((await patient.put('/patient/hero', LOOK)).status).toBe(200);
    expect((await patient.put('/patient/hero', { ...LOOK, outfit: 'ocean' })).status).toBe(200);

    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'elbow_x', score: 3 }] })).body.error).toBe('unknown_body_area');
    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'knee_l', score: 11 }] })).status).toBe(400);
    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'knee_l', score: 6 }, { area: 'lower_back', score: 4 }] })).status).toBe(201);
    await new Promise((r) => setTimeout(r, 20));
    expect((await patient.post('/patient/hero/pain-map', { entries: [{ area: 'knee_l', score: 2 }] })).status).toBe(201);

    const after = (await patient.get('/patient/hero')).body;
    expect(after.hero).toMatchObject({ heroName: 'Emma de Sprinter', outfit: 'ocean', build: 'athletic', hairColor: 'blond', glasses: 'round' });
    expect(after.painMap.baseline.entries).toEqual([{ area: 'knee_l', score: 6 }, { area: 'lower_back', score: 4 }]);
    expect(after.painMap.current.entries).toEqual([{ area: 'knee_l', score: 2 }]);
    expect(after.level.xp).toBeGreaterThan(before.level.xp); // check-in week counts
    const recovery = after.skills.find((k: { key: string }) => k.key === 'recovery');
    expect(recovery.xp).toBeGreaterThan(0);
    expect(after.skills).toHaveLength(10);
    expect(after.skills.find((k: { key: string; locked: boolean }) => k.key === 'knowledge')).toMatchObject({ locked: true, reason: 'soon' });
    expect(after.skills.find((k: { key: string; locked: boolean }) => k.key === 'mobility').locked).toBe(true);
    expect(after.skills.find((k: { key: string; locked: boolean }) => k.key === 'strength').locked).toBe(false);
    expect(after.totalLevel).toBe(after.skills.reduce((sum: number, k: { locked: boolean; level: number }) => sum + (k.locked ? 0 : k.level), 0));
    // Discipline: XP per completed workout and per full week.
    expect(after.skills.find((k: { key: string }) => k.key === 'discipline').xp).toBe(after.totals.sessions * 20 + after.totals.fullWeeks * 50);
    expect(after.badges.find((b: { key: string }) => b.key === 'pain_down').earned).toBe(true);

    // "No pain" is a valid check-in too.
    expect((await patient.post('/patient/hero/pain-map', { entries: [] })).status).toBe(201);
    expect((await patient.get('/patient/hero')).body.painMap.current.entries).toEqual([]);

    const ther = await login('therapistA');
    const seen = (await ther.get(`/patients/${s.patients.emma}/hero`)).body;
    expect(seen.hero.heroName).toBe('Emma de Sprinter');
    expect(seen.painMap.baseline.entries).toHaveLength(2);

    // Another practice sees nothing.
    expect((await (await login('therapistB')).get(`/patients/${s.patients.emma}/hero`)).status).toBe(404);
    const exp = (await patient.get('/patient/export')).body;
    expect(exp.hero.hero_name).toBe('Emma de Sprinter');
    expect(exp.painMap.length).toBe(3);
  });

  it('a patient cannot see another patient’s hero', async () => {
    const other = await login('patientB');
    expect((await other.get('/patient/hero')).body.hero).toBeNull();
    expect((await other.get(`/patients/${s.patients.emma}/hero`)).status).toBe(403);
  });
});

describe('weekly quests, gear, daily check-in, trends', () => {
  it('gives quests, a daily check-in and a pain trend; gear only when unlocked', async () => {
    const patient = await login('patientA');
    await patient.put('/patient/hero', LOOK);
    const st = (await patient.get('/patient/hero')).body;
    expect(st.weekly.quests.map((q: { key: string }) => q.key)).toEqual(['train', 'checkin', 'skill']);
    expect(st.weekly.quests[0].target).toBeLessThanOrEqual(3);

    // Daily check-in: once per day, can be changed; counts as this week's check-in.
    expect((await patient.post('/patient/hero/checkin', { area: 'knee_l', score: 4 })).status).toBe(201);
    expect((await patient.post('/patient/hero/checkin', { area: 'knee_l', score: 3 })).status).toBe(201);
    expect((await patient.post('/patient/hero/checkin', { area: 'tail', score: 3 })).body.error).toBe('unknown_body_area');
    const after = (await patient.get('/patient/hero')).body;
    expect(after.checkin.today).toMatchObject({ area: 'knee_l', score: 3 });
    expect(after.weekly.quests[1].done).toBe(true);
    const knee = after.trends.find((t: { area: string }) => t.area === 'knee_l');
    expect(knee.points.at(-1)).toMatchObject({ score: 3, source: 'daily' });

    // Gear: locked items cannot be worn, including level and skill pieces.
    const locked = after.gear.unlocked.includes('gold_shoes') ? null : 'gold_shoes';
    if (locked) expect((await patient.put('/patient/hero/gear', { equipped: [locked] })).body.error).toBe('gear_locked');
    for (const key of ['pin', 'crown', 'gloves', 'yoga_mat']) {
      if (!after.gear.unlocked.includes(key)) expect((await patient.put('/patient/hero/gear', { equipped: [key] })).body.error).toBe('gear_locked');
    }
    expect((await patient.put('/patient/hero/gear', { equipped: ['cape'] })).body.error).toBe('unknown_gear');
    expect((await patient.put('/patient/hero/gear', { equipped: after.gear.unlocked })).status).toBe(200);
    if (after.gear.unlocked.length) {
      const worn = after.gear.unlocked[0];
      expect((await patient.put('/patient/hero/gear', { equipped: [worn] })).status).toBe(200);
      expect((await patient.get('/patient/hero')).body.gear.equipped).toEqual([worn]);
      expect((await patient.put('/patient/hero/gear', { equipped: [] })).status).toBe(200);
      expect((await patient.get('/patient/hero')).body.gear.equipped).toEqual([]);
    }

    // Body measurements: the patient saves them; another patient and the practice do not see them.
    expect((await patient.put('/patient/hero/metrics', { weightKg: 10, bodyFatPct: 24, heightCm: 168 })).status).toBe(400);
    expect((await patient.put('/patient/hero/metrics', { weightKg: 72.5, bodyFatPct: 80, heightCm: 168 })).status).toBe(400);
    expect((await patient.put('/patient/hero/metrics', { weightKg: 72.5, bodyFatPct: 24, heightCm: 168 })).status).toBe(200);
    expect((await patient.get('/patient/hero')).body.metrics).toMatchObject({ weightKg: 72.5, bodyFatPct: 24, heightCm: 168 });
    expect((await patient.put('/patient/hero/metrics', { weightKg: null, bodyFatPct: null, heightCm: null })).status).toBe(200);
    expect((await patient.get('/patient/hero')).body.metrics).toMatchObject({ weightKg: null, bodyFatPct: null, heightCm: null });
    expect((await patient.put('/patient/hero/metrics', { weightKg: 68, bodyFatPct: 22.4, heightCm: 170 })).status).toBe(200);
    const exp = (await patient.get('/patient/export')).body;
    expect(Number(exp.bodyMetrics.weight_kg)).toBe(68);
    expect(Number(exp.bodyMetrics.body_fat_pct)).toBe(22.4);
    const other = await login('patientB');
    expect((await other.get('/patient/hero')).body.metrics).toMatchObject({ weightKg: null, bodyFatPct: null, heightCm: null });

    // The therapist sees the trend; another practice does not. Measurements stay off that record.
    const ther = await login('therapistA');
    const seen = (await ther.get(`/patients/${s.patients.emma}/hero`)).body;
    expect(seen.metrics).toBeUndefined();
    expect(seen.hero.weight_kg).toBeUndefined();
    expect(seen.trends.find((t: { area: string }) => t.area === 'knee_l')).toBeTruthy();
    expect(seen.weekly.length).toBe(12);
    expect((await (await login('therapistB')).get(`/patients/${s.patients.emma}/hero`)).status).toBe(404);
  });
});

describe('red-flag skill XP follows the account kind', () => {
  it('gives a physiotherapy account the recovery bonus and withholds it from a personal account', async () => {
    const owner = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await owner.connect();
    try {
      const emma = await login('patientA');
      const before = (await emma.get('/patient/hero')).body.skills.find((k: { key: string }) => k.key === 'recovery').xp as number;
      const prog = (await owner.query(`SELECT id, practice_id, patient_id FROM programs WHERE patient_id = $1 AND status = 'active' LIMIT 1`, [s.patients.emma])).rows[0];
      await owner.query(
        `INSERT INTO red_flag_reports(practice_id, patient_id, program_id, flags) VALUES ($1,$2,$3,'["test"]'::jsonb)`,
        [prog.practice_id, prog.patient_id, prog.id],
      );
      const after = (await emma.get('/patient/hero')).body.skills.find((k: { key: string }) => k.key === 'recovery').xp as number;
      expect(after - before).toBe(25);

      const personal = new Client();
      const signed = await personal.post('/auth/signup', {
        kind: 'personal', fullName: 'Sam de Vries', email: 'sam-skills@voorbeeld.test', password: 'Sterk-wachtwoord-1', acceptTerms: true,
      });
      expect(signed.status).toBe(201);
      await personal.put('/patient/hero', LOOK);
      const modes = (await personal.get('/patient/modes')).body;
      const mob = modes.templates.find((t: { module: string }) => t.module === 'mobiliteit');
      const started = await personal.post('/patient/programs/start', { templateId: mob.id });
      expect(started.status).toBe(201);
      const own = (await personal.get('/patient/hero')).body.skills.find((k: { key: string }) => k.key === 'recovery').xp as number;
      const me = signed.body.user.patient;
      await owner.query(
        `INSERT INTO red_flag_reports(practice_id, patient_id, program_id, flags) VALUES ($1,$2,$3,'["test"]'::jsonb)`,
        [me.practiceId, me.id, started.body.id],
      );
      const still = (await personal.get('/patient/hero')).body.skills.find((k: { key: string }) => k.key === 'recovery').xp as number;
      expect(still).toBe(own);
    } finally {
      await owner.end();
    }
  });
});
