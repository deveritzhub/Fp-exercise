import { Hono } from 'hono';
import { withUser } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { mapExercise, OV_COLS, OV_JOIN } from './exercises';
import { adherenceForPatient, loadAdherenceInputs } from '../lib/progress';
import { toISODate } from '../../../shared/adherence';

export const dashboard = new Hono<AppEnv>();

/** One reason to look at a patient, with its date and numbers so the next step is clear. */
type Signal = { reason: string; date: string | null; value?: number; planned?: number; completed?: number };
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
      const soon = new Date();
      soon.setDate(soon.getDate() + 7);
      const attention: Attention[] = [];
      let planned = 0;
      let completed = 0;
      for (const p of pts.rows) {
        const signals: Signal[] = [];
        const a = adherenceForPatient(inputs, p.id, 7);
        planned += a.planned;
        completed += a.completed;
        const pain = painBy.get(p.id);
        if (pain && pain.max_pain >= 6) signals.push({ reason: 'high_pain', date: pain.pain_at, value: pain.max_pain });
        if (pain && pain.unreviewed > 0) signals.push({ reason: 'new_feedback', date: pain.feedback_at, value: pain.unreviewed });
        if (!p.activated) {
          // Without an activated account a patient cannot register anything: say that, not "low adherence".
          if (p.invited_at && Date.now() - new Date(p.invited_at).getTime() > 3 * 86400_000) signals.push({ reason: 'not_activated', date: p.invited_at });
        } else if (p.active_programs > 0 && a.planned >= 2 && a.completed === 0) {
          signals.push({ reason: 'no_registration', date: p.last_activity, planned: a.planned, completed: 0 });
        } else if (p.active_programs > 0 && a.planned >= 2 && (a.rate ?? 0) < 0.5) {
          signals.push({ reason: 'low_adherence', date: p.last_activity, planned: a.planned, completed: a.completed });
        }
        if (p.next_end && p.next_end <= toISODate(soon)) signals.push({ reason: 'program_ending', date: p.next_end });
        if (p.active_programs === 0) signals.push({ reason: 'no_active_program', date: null });
        if (signals.length) attention.push({ patientId: p.id, name: `${p.first_name} ${p.last_name}`, reasons: signals.map((x) => x.reason), signals });
      }
      const order = ['high_pain', 'new_feedback', 'no_registration', 'low_adherence', 'program_ending', 'not_activated', 'no_active_program'];
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
      return {
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
