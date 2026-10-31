import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { withUser, type Tx } from '../db';
import { requirePatient, requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { adherenceForPatient, loadAdherenceInputs, weeklyForPatient } from '../lib/progress';
import { AREA_KEYS, BADGES, HERO_OPTIONS, averagePain, levelFor, xpFor } from '../../../shared/hero';

/**
 * Sports hero (gamified revalidatie): the patient's own character, a body map with self-reported
 * pain, and XP/levels/badges computed from what the patient actually did. See shared/hero.ts.
 */
export const heroPatient = new Hono<AppEnv>();
export const heroStaff = new Hono<AppEnv>();

const look = z.object({
  heroName: z.string().trim().min(1).max(40),
  skin: z.enum(HERO_OPTIONS.skin),
  hair: z.enum(HERO_OPTIONS.hair),
  outfit: z.enum(HERO_OPTIONS.outfit),
  sport: z.enum(HERO_OPTIONS.sport),
});

const mapHero = (r: Record<string, any> | undefined) =>
  r ? { heroName: r.hero_name, skin: r.skin, hair: r.hair, outfit: r.outfit, sport: r.sport, createdAt: r.created_at } : null;

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
  const adherence = adherenceForPatient(inputs, patientId, 28).rate;
  const painBaseline = map.baseline ? averagePain(map.baseline.entries.map((e) => e.score)) ?? 0 : null;
  const painNow = map.current ? averagePain(map.current.entries.map((e) => e.score)) ?? 0 : null;
  const xp = xpFor({ sessions: s.sessions, sessionsWithPain: s.with_pain, redFlags: s.red_flags, checkinWeeks: s.checkin_weeks });
  const badgeInput = { sessions: s.sessions, sessionsWithPain: s.with_pain, redFlags: s.red_flags, fullWeeks, phasesCompleted: s.phases_done, painBaseline, painNow };
  // Current chapter: the active rehabilitation programme with a phase.
  const chapter = (
    await tx.query(
      `SELECT title, series_title, phase_no, phase_count, phase_name, phase_goal FROM programs
        WHERE patient_id = $1 AND status = 'active' AND module = 'revalidatie' AND phase_no IS NOT NULL
        ORDER BY updated_at DESC LIMIT 1`,
      [patientId],
    )
  ).rows[0];
  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));
  return {
    hero,
    painMap: map,
    level: levelFor(xp),
    badges: BADGES.map((b) => ({ key: b.key, earned: b.earned(badgeInput) })),
    stats: {
      consistency: adherence === null ? null : clamp(adherence * 10),
      strength: s.strength_sets ? clamp(s.strength_sets / 10) : null,
      mobility: s.mobility_sessions ? clamp(s.mobility_sessions / 2) : null,
      // Recovery needs a second check-in to compare with.
      recovery: map.checkins > 1 && painBaseline && painNow !== null ? clamp(10 * (1 - painNow / painBaseline)) : null,
    },
    totals: { sessions: s.sessions, fullWeeks, phasesCompleted: s.phases_done },
    chapter: chapter
      ? { title: chapter.series_title || chapter.title, no: chapter.phase_no, count: chapter.phase_count, name: chapter.phase_name, goal: chapter.phase_goal }
      : null,
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
      `INSERT INTO patient_heroes(patient_id, practice_id, hero_name, skin, hair, outfit, sport)
       VALUES ($1, app.patient_practice($1), $2, $3, $4, $5, $6)
       ON CONFLICT (patient_id) DO UPDATE SET hero_name = EXCLUDED.hero_name, skin = EXCLUDED.skin, hair = EXCLUDED.hair,
         outfit = EXCLUDED.outfit, sport = EXCLUDED.sport, updated_at = now()`,
      [patient.id, b.heroName, b.skin, b.hair, b.outfit, b.sport],
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
