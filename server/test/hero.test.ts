import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { Client, login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { GEAR } from '../../shared/hero';
import { appPool } from '../src/db';

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
    // Older clients send only `sport`; it becomes the one sport.
    expect((await patient.get('/patient/hero')).body.hero).toMatchObject({ sport: 'running', sports: ['running'] });
    // Several sports: the first is the main one; unknown or empty lists are refused.
    expect((await patient.put('/patient/hero', { ...LOOK, outfit: 'ocean', sports: ['fitness', 'swimming', 'fitness'] })).status).toBe(200);
    expect((await patient.get('/patient/hero')).body.hero).toMatchObject({ sport: 'fitness', sports: ['fitness', 'swimming'] });
    expect((await patient.put('/patient/hero', { ...LOOK, sports: ['skydiving'] })).status).toBe(400);
    expect((await patient.put('/patient/hero', { ...LOOK, sports: [] })).status).toBe(400);
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
  it('gives quests, a daily check-in and a pain trend; gear is bought with private coins', async () => {
    const patient = await login('patientA');
    await patient.put('/patient/hero', LOOK);
    const st = (await patient.get('/patient/hero')).body;
    expect(st.weekly.quests.map((q: { key: string }) => q.key)).toEqual(['train', 'checkin', 'skill']);
    expect(st.weekly.quests[0].target).toBeLessThanOrEqual(3);
    // Each quest points to where it is done: today's training, the body map, an exercise for the skill.
    expect(st.weekly.links).toMatchObject({ train: '/p', checkin: '/p/held/pijn' });
    // The weekly boss comes with the quests.
    expect(st.weekly.boss).toMatchObject({ hp: 100, xp: 60 });
    expect(st.weekly.boss.damage).toBeGreaterThanOrEqual(0);
    expect(st.weekly.boss.hits.map((h: { source: string }) => h.source)).toEqual(['train', 'checkin']);
    if (st.weekly.links.skill) expect(st.weekly.links.skill).toMatch(/^\/p\/(programma\/[\w-]+\/oefening\/[\w-]+|kracht)$/);

    // Daily check-in: once per day, can be changed; counts as this week's check-in.
    expect((await patient.post('/patient/hero/checkin', { area: 'knee_l', score: 4 })).status).toBe(201);
    expect((await patient.post('/patient/hero/checkin', { area: 'knee_l', score: 3 })).status).toBe(201);
    expect((await patient.post('/patient/hero/checkin', { area: 'tail', score: 3 })).body.error).toBe('unknown_body_area');
    const after = (await patient.get('/patient/hero')).body;
    expect(after.checkin.today).toMatchObject({ area: 'knee_l', score: 3 });
    // Day chest: the check-in earns it; it opens once a day for a few coins, privately.
    expect(after.chest).toMatchObject({ available: true, opened: null });
    const before = after.gear.coins;
    const opened = await patient.post('/patient/hero/chest', {});
    expect(opened.status).toBe(201);
    expect(opened.body.coins).toBeGreaterThanOrEqual(5);
    expect(opened.body.gear.coins).toBe(before + opened.body.coins);
    expect(opened.body.chest).toMatchObject({ available: false, opened: { coins: opened.body.coins } });
    expect((await patient.post('/patient/hero/chest', {})).body.error).toBe('chest_opened');
    expect(after.weekly.quests[1].done).toBe(true);
    const knee = after.trends.find((t: { area: string }) => t.area === 'knee_l');
    expect(knee.points.at(-1)).toMatchObject({ score: 3, source: 'daily' });

    // Gear: bought with coins in the shop; only owned pieces can be worn.
    const g0 = (await patient.get('/patient/hero')).body.gear;
    expect(g0.coins).toBe(Math.max(0, g0.earned - g0.spent));
    const cheap = GEAR.filter((g) => g.tier === 1 && !g0.owned.includes(g.key))[0];
    expect((await patient.put('/patient/hero/gear', { equipped: [cheap.key] })).body.error).toBe('gear_not_owned');
    expect((await patient.put('/patient/hero/gear', { equipped: ['cape'] })).body.error).toBe('unknown_gear');
    expect((await patient.post('/patient/hero/shop', { item: 'cape' })).body.error).toBe('unknown_gear');
    const bought = await patient.post('/patient/hero/shop', { item: cheap.key });
    expect(bought.status).toBe(201);
    expect(bought.body.owned).toContain(cheap.key);
    expect(bought.body.equipped).toContain(cheap.key);
    expect(bought.body.coins).toBe(g0.coins - cheap.price);
    expect(bought.body.score).toBeGreaterThanOrEqual(cheap.score);
    expect((await patient.post('/patient/hero/shop', { item: cheap.key })).body.error).toBe('gear_owned');
    const tooDear = GEAR.filter((g) => !bought.body.owned.includes(g.key) && g.price > bought.body.coins)[0];
    if (tooDear) expect((await patient.post('/patient/hero/shop', { item: tooDear.key })).body.error).toBe('not_enough_coins');
    expect((await patient.put('/patient/hero/gear', { equipped: [] })).status).toBe(200);
    expect((await patient.get('/patient/hero')).body.gear).toMatchObject({ equipped: [], score: 0 });
    expect((await patient.put('/patient/hero/gear', { equipped: [cheap.key] })).status).toBe(200);
    expect((await patient.get('/patient/hero')).body.gear.equipped).toEqual([cheap.key]);

    // Coins are private: not in the professional's hero view, and the database refuses staff reads.
    const therView = (await (await login('therapistA')).get(`/patients/${s.patients.emma}/hero`)).body;
    expect(JSON.stringify(therView)).not.toMatch(/coins|hero_purchases|"spent"/);
    const c = await appPool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.user_id', $1, true)", [s.users.therapistA]);
      expect((await c.query('SELECT * FROM hero_purchases')).rowCount).toBe(0);
      expect((await c.query('SELECT * FROM hero_daily_chests')).rowCount).toBe(0);
      await expect(c.query('INSERT INTO hero_purchases (patient_id, item, price) VALUES ($1, $2, 0)', [s.patients.emma, 'crown'])).rejects.toThrow(/row-level security/);
    } finally {
      await c.query('ROLLBACK');
      c.release();
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

describe('trophy shelf', () => {
  it('only earned trophies can go on the shelf, at most three', async () => {
    resetRateLimits();
    const p = await login('patientA');
    const st = (await p.get('/patient/hero')).body;
    expect(st.trophies.length).toBeGreaterThan(0);
    expect(st.trophies[0]).toMatchObject({ key: expect.stringMatching(/^[a-z_]+:\d+$/), earned: expect.any(Boolean) });
    const notEarned = st.trophies.find((x: { earned: boolean }) => !x.earned);
    expect((await p.put('/patient/hero/showcase', { trophies: [notEarned.key] })).body.error).toBe('trophy_not_earned');
    expect((await p.put('/patient/hero/showcase', { trophies: ['a', 'b', 'c', 'd'] })).status).toBe(400);
    expect((await p.put('/patient/hero/showcase', { trophies: [] })).status).toBe(200);
  });
});
