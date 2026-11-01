import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { withUser, type Tx } from '../db';
import { requirePatient, requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { loadAdherenceInputs, weeklyForPatient } from '../lib/progress';
import { AREA_KEYS, BADGES, HERO_OPTIONS, SKILLS, SKILL_XP, averagePain, levelFor, questTimeline, skillLevel, skillsForExercise, xpFor, type SkillKey } from '../../../shared/hero';

/**
 * Sports hero (gamified revalidatie): the patient's own character, a body map with self-reported
 * pain, and XP/levels/badges computed from what the patient actually did. See shared/hero.ts.
 */
export const heroPatient = new Hono<AppEnv>();
export const heroStaff = new Hono<AppEnv>();

const look = z.object({
  heroName: z.string().trim().min(1).max(40),
  frame: z.enum(HERO_OPTIONS.frame),
  build: z.enum(HERO_OPTIONS.build),
  skin: z.enum(HERO_OPTIONS.skin),
  hair: z.enum(HERO_OPTIONS.hair),
  hairColor: z.enum(HERO_OPTIONS.hairColor),
  eyeColor: z.enum(HERO_OPTIONS.eyeColor),
  beard: z.enum(HERO_OPTIONS.beard),
  glasses: z.enum(HERO_OPTIONS.glasses),
  outfit: z.enum(HERO_OPTIONS.outfit),
  sport: z.enum(HERO_OPTIONS.sport),
});

const mapHero = (r: Record<string, any> | undefined) =>
  r
    ? {
        heroName: r.hero_name, frame: r.frame, build: r.build, skin: r.skin, hair: r.hair, hairColor: r.hair_color, eyeColor: r.eye_color,
        beard: r.beard, glasses: r.glasses, outfit: r.outfit, sport: r.sport, createdAt: r.created_at,
      }
    : null;

/** First (baseline) and latest check-in of the body map, each as { recordedAt, entries }. */
async function painMap(tx: Tx, patientId: string) {
  const { rows } = await tx.query(
    `WITH b AS (SELECT batch, min(recorded_at) AS at FROM pain_map_entries WHERE patient_id = $1 GROUP BY batch)
     SELECT b.batch, b.at, e.area, e.score,
            b.at = (SELECT min(at) FROM b) AS is_first, b.at = (SELECT max(at) FROM b) AS is_last
       FROM b JOIN pain_map_entries e ON e.batch = b.batch
      WHERE b.at IN ((SELECT min(at) FROM b), (SELECT max(at) FROM b))
      ORDER BY b.at, e.area`,
    [patientId],
  );
  // A check-in without any sore area is stored as one row with area 'none'.
  const pick = (flag: 'is_first' | 'is_last') => {
    const r = rows.filter((x) => x[flag]);
    if (!r.length) return null;
    return { recordedAt: r[0].at, entries: r.filter((x) => x.area !== 'none').map((x) => ({ area: x.area as string, score: x.score as number })) };
  };
  const baseline = pick('is_first');
  const current = pick('is_last');
  const checkins = (await tx.query('SELECT count(DISTINCT batch)::int AS n FROM pain_map_entries WHERE patient_id = $1', [patientId])).rows[0].n as number;
  return { baseline, current, checkins };
}

async function heroState(tx: Tx, patientId: string) {
  const hero = mapHero((await tx.query('SELECT * FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0]);
  const map = await painMap(tx, patientId);
  const s = (
    await tx.query(
      `SELECT
         (SELECT count(*)::int FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL) AS sessions,
         (SELECT count(*)::int FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL AND pain IS NOT NULL) AS with_pain,
         (SELECT count(*)::int FROM red_flag_reports WHERE patient_id = $1) AS red_flags,
         (SELECT count(DISTINCT date_trunc('week', recorded_at))::int FROM pain_map_entries WHERE patient_id = $1) AS checkin_weeks,
         (SELECT count(*)::int FROM programs WHERE patient_id = $1 AND status = 'completed' AND phase_no IS NOT NULL) AS phases_done,
         (SELECT count(*)::int FROM strength_sets WHERE patient_id = $1) AS strength_sets,
         (SELECT count(*)::int FROM workout_sessions w JOIN programs p ON p.id = w.program_id
            WHERE w.patient_id = $1 AND w.completed_at IS NOT NULL AND p.module = 'mobiliteit') AS mobility_sessions`,
      [patientId],
    )
  ).rows[0];
  const inputs = await loadAdherenceInputs(tx, [patientId]);
  const fullWeeks = weeklyForPatient(inputs, patientId, 52).filter((w) => w.planned > 0 && w.completed >= w.planned).length;
  const painBaseline = map.baseline ? averagePain(map.baseline.entries.map((e) => e.score)) ?? 0 : null;
  const painNow = map.current ? averagePain(map.current.entries.map((e) => e.score)) ?? 0 : null;
  const xp = xpFor({ sessions: s.sessions, sessionsWithPain: s.with_pain, redFlags: s.red_flags, checkinWeeks: s.checkin_weeks });
  const badgeInput = { sessions: s.sessions, sessionsWithPain: s.with_pain, redFlags: s.red_flags, fullWeeks, phasesCompleted: s.phases_done, painBaseline, painNow };
  // Current chapter: the active rehabilitation programme with a phase.
  // ---- Skills: XP per skill from what the patient actually did. ----
  const logs = (
    await tx.query(
      `SELECT e.training_categories, e.movement_category, count(*)::int AS n
         FROM exercise_logs l JOIN exercises e ON e.id = l.exercise_id
        WHERE l.patient_id = $1 AND l.completed
        GROUP BY e.training_categories, e.movement_category`,
      [patientId],
    )
  ).rows;
  const skillXp: Record<SkillKey, number> = Object.fromEntries(SKILLS.map((k) => [k.key, 0])) as Record<SkillKey, number>;
  for (const r of logs) for (const k of skillsForExercise(r.training_categories ?? [], r.movement_category)) skillXp[k] += r.n * SKILL_XP.exercise;
  skillXp.strength += s.strength_sets * SKILL_XP.strengthSet;
  skillXp.discipline += s.sessions * SKILL_XP.session + fullWeeks * SKILL_XP.fullWeek;
  skillXp.recovery +=
    s.with_pain * SKILL_XP.painReported +
    s.checkin_weeks * SKILL_XP.painCheckin +
    (map.checkins > 1 && painBaseline !== null && painNow !== null ? Math.max(0, Math.round((painBaseline - painNow) * SKILL_XP.painPointDown)) : 0);
  const skills = SKILLS.map((k) => ({ key: k.key, ...skillLevel(skillXp[k.key]) }));

  // ---- Quest: the goal of the current programme and the road there. ----
  const prog = (
    await tx.query(
      `SELECT title, series_key, series_title, phase_no, phase_count, phase_name, phase_goal, start_date, end_date FROM programs
        WHERE patient_id = $1 AND status = 'active' AND NOT is_template
        ORDER BY (module = 'revalidatie') DESC, (phase_no IS NOT NULL) DESC, updated_at DESC LIMIT 1`,
      [patientId],
    )
  ).rows[0];
  let quest = null;
  if (prog) {
    const phases = prog.series_key
      ? (await tx.query('SELECT * FROM app.patient_series_phases($1)', [prog.series_key])).rows.map((r) => ({ no: r.phase_no as number, name: r.phase_name as string | null, weeks: r.phase_weeks as string | null, goal: r.phase_goal as string | null }))
      : [];
    const timeline = prog.phase_no && phases.length ? questTimeline({ phases, currentNo: prog.phase_no, phaseStart: prog.start_date }) : null;
    // Without phases: the programme's own start and end date.
    let fallback = null;
    if (!timeline && prog.start_date && prog.end_date) {
      const a = new Date(prog.start_date + 'T12:00:00').getTime();
      const b = new Date(prog.end_date + 'T12:00:00').getTime();
      const now = Date.now();
      const totalWeeks = Math.max(1, Math.round((b - a) / (7 * 86400_000)));
      fallback = {
        week: Math.min(totalWeeks, Math.max(1, Math.floor((now - a) / (7 * 86400_000)) + 1)),
        totalWeeks,
        progress: Math.max(0, Math.min(1, (now - a) / (b - a))),
        expectedEnd: prog.end_date as string,
        weeksLeft: Math.max(0, Math.ceil((b - now) / (7 * 86400_000))),
      };
    }
    const lastGoal = [...phases].sort((x, y) => y.no - x.no)[0]?.goal ?? null;
    quest = {
      title: prog.series_title || prog.title,
      goal: lastGoal || prog.phase_goal || null,
      phaseNo: prog.phase_no,
      phaseCount: prog.phase_count,
      phaseGoal: prog.phase_goal,
      phases: phases.map((ph) => ({ ...ph, status: ph.no < prog.phase_no ? 'done' : ph.no === prog.phase_no ? 'current' : 'next' })),
      timeline: timeline ?? fallback,
    };
  }
  const since = (await tx.query('SELECT min(started_at) AS at FROM workout_sessions WHERE patient_id = $1', [patientId])).rows[0].at;

  return {
    hero,
    painMap: map,
    level: levelFor(xp),
    badges: BADGES.map((b) => ({ key: b.key, earned: b.earned(badgeInput) })),
    skills,
    totalLevel: skills.reduce((a, k) => a + k.level, 0),
    totals: { sessions: s.sessions, fullWeeks, phasesCompleted: s.phases_done, since, painStart: painBaseline, painNow: map.checkins > 1 ? painNow : null },
    quest,
  };
}

heroPatient.get('/hero', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(await withUser(user.id, (tx) => heroState(tx, patient.id)));
});

/** Create or change the hero's look. */
heroPatient.put('/hero', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(look, await c.req.json());
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO patient_heroes(patient_id, practice_id, hero_name, frame, build, skin, hair, hair_color, eye_color, beard, glasses, outfit, sport)
       VALUES ($1, app.patient_practice($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (patient_id) DO UPDATE SET hero_name = EXCLUDED.hero_name, frame = EXCLUDED.frame, build = EXCLUDED.build,
         skin = EXCLUDED.skin, hair = EXCLUDED.hair, hair_color = EXCLUDED.hair_color, eye_color = EXCLUDED.eye_color,
         beard = EXCLUDED.beard, glasses = EXCLUDED.glasses, outfit = EXCLUDED.outfit, sport = EXCLUDED.sport, updated_at = now()`,
      [patient.id, b.heroName, b.frame, b.build, b.skin, b.hair, b.hairColor, b.eyeColor, b.beard, b.glasses, b.outfit, b.sport],
    ),
  );
  return c.json({ ok: true });
});

/** A body-map check-in: every sore area with a score 0–10 (an empty list means "no pain"). */
heroPatient.post('/hero/pain-map', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(
    z.object({ entries: z.array(z.object({ area: z.string(), score: z.number().int().min(0).max(10) })).max(40) }),
    await c.req.json(),
  );
  if (b.entries.some((e) => !AREA_KEYS.has(e.area))) throw badRequest('unknown_body_area');
  if (new Set(b.entries.map((e) => e.area)).size !== b.entries.length) throw badRequest('duplicate_body_area');
  const batch = randomUUID();
  const rows = b.entries.length ? b.entries : [{ area: 'none', score: 0 }];
  await withUser(user.id, async (tx) => {
    for (const e of rows)
      await tx.query(
        `INSERT INTO pain_map_entries(patient_id, practice_id, batch, area, score) VALUES ($1, app.patient_practice($1), $2, $3, $4)`,
        [patient.id, batch, e.area, e.score],
      );
  });
  return c.json({ ok: true }, 201);
});

/** Therapist: the patient's hero and body map (first and latest check-in). */
heroStaff.get('/:id/hero', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const ok = (await tx.query('SELECT app.can_manage_patient($1) AS ok', [id])).rows[0].ok;
      if (!ok) throw notFound();
      const hero = mapHero((await tx.query('SELECT * FROM patient_heroes WHERE patient_id = $1', [id])).rows[0]);
      return { hero, painMap: await painMap(tx, id) };
    }),
  );
});
