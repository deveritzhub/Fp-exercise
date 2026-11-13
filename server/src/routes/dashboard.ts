import { Hono } from 'hono';
import { areaPainRising, progressionSignal, painRising } from '../../../shared/progression';
import { withUser } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { mapExercise, OV_COLS, OV_JOIN } from './exercises';
import { adherenceForPatient, loadAdherenceInputs } from '../lib/progress';
import { toISODate } from '../../../shared/adherence';
import { heroState } from './hero';
import type { VillageHome } from '../../../shared/practiceVillage';
import { checkLayout, type Placed } from '../../../shared/homeDecor';

export const dashboard = new Hono<AppEnv>();

/** One reason to look at a patient, with its date and numbers so the next step is clear. */
type Signal = { reason: string; date: string | null; value?: number; planned?: number; completed?: number; area?: string };
type Attention = { patientId: string; name: string; reasons: string[]; signals: Signal[] };

dashboard.get('/', async (c) => {
  const { user, practiceId } = requireStaff(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      // "My patients" = patients assigned to me in the active practice.
      const pts = await tx.query(
        `SELECT pt.id, pt.first_name, pt.last_name, app.user_activated(pt.user_id) AS activated, pt.invited_at,
                (SELECT count(*) FROM programs p WHERE p.patient_id = pt.id AND p.status = 'active') AS active_programs,
                (SELECT min(p.end_date) FROM programs p WHERE p.patient_id = pt.id AND p.status = 'active' AND p.end_date >= current_date) AS next_end,
                (SELECT max(completed_at) FROM workout_sessions s WHERE s.patient_id = pt.id) AS last_activity
           FROM patients pt JOIN patient_therapists a ON a.patient_id = pt.id AND a.therapist_id = app.uid()
          WHERE pt.practice_id = $1 AND pt.archived_at IS NULL`,
        [practiceId],
      );
      const ids = pts.rows.map((r) => r.id);
      const inputs = await loadAdherenceInputs(tx, ids);
      const recentPain = await tx.query(
        `WITH x AS (
           SELECT s.patient_id, s.completed_at, s.reviewed_at,
                  greatest(coalesce(s.pain,0), coalesce((SELECT max(l.pain) FROM exercise_logs l WHERE l.session_id = s.id),0)) AS pain,
                  (s.feedback IS NOT NULL OR EXISTS (SELECT 1 FROM exercise_logs l WHERE l.session_id = s.id AND l.feedback IS NOT NULL)) AS has_feedback
             FROM workout_sessions s
            WHERE s.patient_id = ANY($1) AND s.completed_at > now() - interval '14 days')
         SELECT patient_id, max(pain) AS max_pain, max(completed_at) FILTER (WHERE pain >= 6) AS pain_at,
                count(*) FILTER (WHERE reviewed_at IS NULL AND has_feedback) AS unreviewed,
                max(completed_at) FILTER (WHERE reviewed_at IS NULL AND has_feedback) AS feedback_at
           FROM x GROUP BY patient_id`,
        [ids],
      );
      const painBy = new Map(recentPain.rows.map((r) => [r.patient_id, r]));
      // The last few scored workouts per patient, for the progression signal.
      const recentScores = await tx.query(
        `SELECT patient_id, difficulty, pain, completed_at FROM (
           SELECT s.patient_id, s.difficulty, s.pain, s.completed_at,
                  row_number() OVER (PARTITION BY s.patient_id ORDER BY s.completed_at DESC) AS n
             FROM workout_sessions s WHERE s.patient_id = ANY($1) AND s.completed_at > now() - interval '28 days') x
          WHERE n <= 4 ORDER BY patient_id, completed_at DESC`,
        [ids],
      );
      const scoresBy = new Map<string, { difficulty: number | null; pain: number | null; at: string }[]>();
      for (const r of recentScores.rows) scoresBy.set(r.patient_id, [...(scoresBy.get(r.patient_id) ?? []), { difficulty: r.difficulty, pain: r.pain, at: r.completed_at }]);
      // Coaches and personal accounts are not medical: the app draws no conclusions from how someone feels.
      const clinical = (await tx.query('SELECT kind FROM practices WHERE id = $1', [practiceId])).rows[0]?.kind === 'physio';
      // Pain map check-ins of the last two weeks, for "same spot getting worse" (physio only).
      const areaRows = clinical
        ? (await tx.query(`SELECT patient_id, area, score, recorded_at FROM pain_map_entries WHERE patient_id = ANY($1) AND recorded_at > now() - interval '14 days'`, [ids])).rows
        : [];
      const areasBy = new Map<string, { area: string; score: number; at: string }[]>();
      for (const r of areaRows) areasBy.set(r.patient_id, [...(areasBy.get(r.patient_id) ?? []), { area: r.area, score: r.score, at: r.recorded_at }]);
      const soon = new Date();
      soon.setDate(soon.getDate() + 7);
      const bossRows = ids.length
        ? (await tx.query(
            `SELECT g.patient_id, max(g.defeated_at) AS at FROM phase_boss_goals g
              WHERE g.patient_id = ANY($1) AND g.active AND g.defeated_at IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM phase_boss_goals o
                   WHERE o.program_id = g.program_id AND o.active AND o.defeated_at IS NULL
                )
              GROUP BY g.patient_id
             HAVING max(g.defeated_at) > now() - interval '21 days'`,
            [ids],
          )).rows
        : [];
      const bossIds = new Set(bossRows.map((r) => r.patient_id as string));
      const bossAt = new Map(bossRows.map((r) => [r.patient_id as string, r.at as string]));
      const attention: Attention[] = [];
      let planned = 0;
      let completed = 0;
      for (const p of pts.rows) {
        const signals: Signal[] = [];
        const a = adherenceForPatient(inputs, p.id, 7);
        planned += a.planned;
        completed += a.completed;
        const pain = painBy.get(p.id);
        if (clinical && pain && pain.max_pain >= 6) signals.push({ reason: 'high_pain', date: pain.pain_at, value: pain.max_pain });
        if (pain && pain.unreviewed > 0) signals.push({ reason: 'new_feedback', date: pain.feedback_at, value: pain.unreviewed });
        if (!p.activated) {
          // Without an activated account a patient cannot register anything: say that, not "low adherence".
          if (p.invited_at && Date.now() - new Date(p.invited_at).getTime() > 3 * 86400_000) signals.push({ reason: 'not_activated', date: p.invited_at });
        } else if (p.active_programs > 0 && p.last_activity && Date.now() - new Date(p.last_activity).getTime() >= 21 * 86400_000) {
          // Three weeks or more without any workout, also with a programme of once a week.
          signals.push({ reason: 'inactive_long', date: p.last_activity, value: Math.floor((Date.now() - new Date(p.last_activity).getTime()) / 86400_000) });
        } else if (p.active_programs > 0 && a.planned >= 2 && a.completed === 0) {
          signals.push({ reason: 'no_registration', date: p.last_activity, planned: a.planned, completed: 0 });
        } else if (p.active_programs > 0 && a.planned >= 2 && (a.rate ?? 0) < 0.5) {
          signals.push({ reason: 'low_adherence', date: p.last_activity, planned: a.planned, completed: a.completed });
        }
        const prog = p.active_programs > 0 ? progressionSignal(scoresBy.get(p.id) ?? []) : null;
        if (prog) signals.push({ reason: prog.kind, date: scoresBy.get(p.id)?.[0]?.at ?? null, value: prog.avgDifficulty, completed: prog.sessions });
        // Pain going up workout after workout, before it reaches "high pain".
        const rising = clinical && p.active_programs > 0 && !signals.some((x) => x.reason === 'high_pain') ? painRising(scoresBy.get(p.id) ?? []) : null;
        if (rising) signals.push({ reason: 'pain_rising', date: scoresBy.get(p.id)?.[0]?.at ?? null, value: rising.to, planned: rising.from });
        const worse = areaPainRising(areasBy.get(p.id) ?? [])[0];
        if (worse) signals.push({ reason: 'area_pain_rising', date: null, value: worse.to, planned: worse.from, area: worse.area });
        if (p.next_end && p.next_end <= toISODate(soon)) signals.push({ reason: 'program_ending', date: p.next_end });
        if (bossIds.has(p.id)) signals.push({ reason: 'boss_met', date: bossAt.get(p.id) ?? null });
        if (p.active_programs === 0) signals.push({ reason: 'no_active_program', date: null });
        if (signals.length) attention.push({ patientId: p.id, name: `${p.first_name} ${p.last_name}`, reasons: signals.map((x) => x.reason), signals });
      }
      const order = ['high_pain', 'boss_met', 'pain_rising', 'area_pain_rising', 'new_feedback', 'too_heavy', 'inactive_long', 'no_registration', 'low_adherence', 'ready_heavier', 'program_ending', 'not_activated', 'no_active_program'];
      attention.sort((x, y) => order.indexOf(x.reasons[0]) - order.indexOf(y.reasons[0]));

      const activity = await tx.query(
        `SELECT s.id, s.patient_id, s.completed_at, s.pain, s.difficulty, (s.feedback IS NOT NULL) AS has_feedback,
                pt.first_name, pt.last_name, pr.title
           FROM workout_sessions s JOIN patients pt ON pt.id = s.patient_id JOIN programs pr ON pr.id = s.program_id
          WHERE s.patient_id = ANY($1) AND s.completed_at IS NOT NULL
          ORDER BY s.completed_at DESC LIMIT 10`,
        [ids],
      );
      const favs = await tx.query(
        `SELECT e.*, ${OV_COLS}, true AS favorite FROM exercise_favorites f JOIN exercises e ON e.id = f.exercise_id
           ${OV_JOIN('$1::uuid')}
          WHERE f.user_id = app.uid() AND e.archived_at IS NULL ORDER BY f.created_at DESC LIMIT 8`,
        [practiceId],
      );
      const activePrograms = await tx.query(
        `SELECT count(*) AS n FROM programs p WHERE p.patient_id = ANY($1) AND p.status = 'active'`,
        [ids],
      );
      const sessions7d = await tx.query(
        `SELECT count(*) AS n FROM workout_sessions WHERE patient_id = ANY($1) AND completed_at > now() - interval '7 days'`,
        [ids],
      );
      const daily = await tx.query(
        `SELECT d::date AS day,
                (SELECT count(*) FROM workout_sessions w
                  WHERE w.patient_id = ANY($1) AND w.completed_at IS NOT NULL AND w.completed_at::date = d::date) AS n,
                (SELECT coalesce(json_agg(json_build_object('id', w.id, 'patientId', w.patient_id, 'name', pt.first_name || ' ' || pt.last_name,
                          'at', w.completed_at, 'pain', w.pain, 'program', pr.title) ORDER BY w.completed_at), '[]')
                   FROM (SELECT * FROM workout_sessions w WHERE w.patient_id = ANY($1) AND w.completed_at IS NOT NULL
                          AND w.completed_at::date = d::date ORDER BY w.completed_at LIMIT 25) w
                   JOIN patients pt ON pt.id = w.patient_id JOIN programs pr ON pr.id = w.program_id) AS list
           FROM generate_series(current_date - 13, current_date, interval '1 day') d ORDER BY d`,
        [ids],
      );
      // Safety and AVG first: open red-flag reports and deletion requests (RLS limits them to my patients / admins).
      const alerts = await tx.query(
        `SELECT 'red_flag' AS kind, r.created_at, p.id AS patient_id, p.first_name, p.last_name
           FROM red_flag_reports r JOIN patients p ON p.id = r.patient_id WHERE r.handled_at IS NULL
         UNION ALL
         SELECT 'deletion_request', d.created_at, p.id, p.first_name, p.last_name
           FROM deletion_requests d JOIN patients p ON p.id = d.patient_id WHERE d.handled_at IS NULL
         ORDER BY created_at DESC LIMIT 20`,
      );
      // "Get started" for a new professional: what they did themselves so far (first month only).
      const start = (
        await tx.query(
          `SELECT (SELECT created_at FROM users WHERE id = app.uid()) AS since,
                  (SELECT count(*)::int FROM patients WHERE created_by = app.uid()) AS patients,
                  (SELECT count(*)::int FROM programs WHERE created_by = app.uid() AND patient_id IS NOT NULL) AS programs,
                  (SELECT count(*)::int FROM patients WHERE created_by = app.uid() AND invited_at IS NOT NULL) AS invited`,
        )
      ).rows[0];
      const aclRows = clinical
        ? (await tx.query(
            `SELECT pt.id, pt.first_name, pt.last_name, p.phase_no, p.phase_name,
                    count(*) FILTER (WHERE g.active AND g.defeated_at IS NOT NULL)::int AS met,
                    count(*) FILTER (WHERE g.active)::int AS total
               FROM programs p
               JOIN patients pt ON pt.id = p.patient_id
               LEFT JOIN phase_boss_goals g ON g.program_id = p.id
              WHERE p.patient_id = ANY($1) AND p.series_key = 'acl_vkb_flagship' AND p.status = 'active' AND NOT p.is_template
              GROUP BY pt.id, pt.first_name, pt.last_name, p.phase_no, p.phase_name
              ORDER BY pt.last_name, pt.first_name`,
            [ids],
          )).rows
        : [];
      return {
        aclPatients: aclRows.map((r) => ({
          patientId: r.id, name: `${r.first_name} ${r.last_name}`, phaseNo: Number(r.phase_no), phaseName: r.phase_name,
          met: Number(r.met), total: Number(r.total),
        })),
        start: { since: start.since, patients: start.patients, programs: start.programs, invited: start.invited },
        alerts: alerts.rows.map((r) => ({ kind: r.kind, createdAt: r.created_at, patientId: r.patient_id, name: `${r.first_name} ${r.last_name}` })),
        daily: daily.rows.map((r) => ({ day: r.day, sessions: r.n, list: r.list })),
        stats: {
          patients: ids.length,
          activePrograms: activePrograms.rows[0].n,
          adherence7d: planned ? completed / planned : null,
          // Same definition as the patient record and the patient app: completed / planned training days.
          adherence: { completed, planned, days: 7 },
          sessions7d: sessions7d.rows[0].n,
          attention: attention.length,
        },
        attention: attention.slice(0, 12),
        activity: activity.rows.map((r) => ({
          id: r.id,
          patientId: r.patient_id,
          patientName: `${r.first_name} ${r.last_name}`,
          programTitle: r.title,
          completedAt: r.completed_at,
          pain: r.pain,
          difficulty: r.difficulty,
          hasFeedback: r.has_feedback,
        })),
        favorites: favs.rows.map((r) => mapExercise(r)),
      };
    }),
  );
});

/**
 * The practice village: one home per patient this member may see, with the hero's level. A home has a
 * number (the order in which patients joined) and the id for the link to the record. Names are left
 * out unless the member asks for them (`?names=1`): the village is often on a screen others can see.
 */
dashboard.get('/village', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const names = c.req.query('names') === '1';
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT pt.id, pt.first_name, pt.last_name,
                (SELECT count(*)::int FROM workout_sessions s WHERE s.patient_id = pt.id AND s.completed_at > now() - interval '7 days') AS week
           FROM patients pt
          WHERE pt.practice_id = $1 AND pt.archived_at IS NULL AND app.can_manage_patient(pt.id)
          ORDER BY pt.created_at, pt.id
          LIMIT 80`,
        [practiceId],
      );
      const homes: VillageHome[] = [];
      for (const [i, r] of rows.entries()) {
        const level = (await heroState(tx, r.id)).level;
        homes.push({ id: r.id, no: i + 1, level: level.level, progress: level.progress, week: Number(r.week), ...(names ? { name: `${r.first_name} ${r.last_name}`.trim() } : {}) });
      }
      return { homes };
    }),
  );
});

/**
 * Inside one home of the practice village: where the patient put the furniture. Only for a member who
 * may manage this patient; what was paid for it and the coins stay the patient's own business.
 */
dashboard.get('/village/:patientId/home', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const patientId = c.req.param('patientId');
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) return c.json({ error: 'not_found' }, 404);
  const out = await withUser(user.id, async (tx) => {
    const ok = (await tx.query('SELECT 1 FROM patients WHERE id = $1 AND practice_id = $2 AND archived_at IS NULL AND app.can_manage_patient(id)', [patientId, practiceId])).rows[0];
    if (!ok) return null;
    const row = (await tx.query('SELECT layout FROM hero_homes WHERE patient_id = $1', [patientId])).rows[0];
    const stored = (Array.isArray(row?.layout) ? row.layout : []) as Placed[];
    // The same rules as in the patient's own view; what stands there counts as owned.
    const owned = new Set(stored.map((it) => it?.key).filter((k): k is string => typeof k === 'string'));
    const kept: Placed[] = [];
    for (const it of stored) {
      const next = checkLayout([...kept, it], owned);
      if (next.ok) kept.push(next.items[next.items.length - 1]);
    }
    return { layout: kept };
  });
  return out ? c.json(out) : c.json({ error: 'not_found' }, 404);
});
