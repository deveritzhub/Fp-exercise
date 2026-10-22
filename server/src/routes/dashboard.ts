import { Hono } from 'hono';
import { withUser } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { mapExercise, OV_COLS } from './exercises';
import { adherenceForPatient, loadAdherenceInputs } from '../lib/progress';
import { toISODate } from '../../../shared/adherence';

export const dashboard = new Hono<AppEnv>();

type Attention = { patientId: string; name: string; reasons: string[] };

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
        `SELECT patient_id, max(greatest(coalesce(s.pain,0), coalesce((SELECT max(l.pain) FROM exercise_logs l WHERE l.session_id = s.id),0))) AS max_pain,
                count(*) FILTER (WHERE s.reviewed_at IS NULL AND (s.feedback IS NOT NULL OR EXISTS (
                   SELECT 1 FROM exercise_logs l WHERE l.session_id = s.id AND l.feedback IS NOT NULL))) AS unreviewed
           FROM workout_sessions s
          WHERE s.patient_id = ANY($1) AND s.completed_at > now() - interval '14 days'
          GROUP BY patient_id`,
        [ids],
      );
      const painBy = new Map(recentPain.rows.map((r) => [r.patient_id, r]));
      const soon = new Date();
      soon.setDate(soon.getDate() + 7);
      const attention: Attention[] = [];
      let planned = 0;
      let completed = 0;
      for (const p of pts.rows) {
        const reasons: string[] = [];
        const a = adherenceForPatient(inputs, p.id, 7);
        planned += a.planned;
        completed += a.completed;
        const pain = painBy.get(p.id);
        if (pain && pain.max_pain >= 6) reasons.push('high_pain');
        if (pain && pain.unreviewed > 0) reasons.push('new_feedback');
        if (p.active_programs > 0 && a.planned >= 2 && (a.rate ?? 0) < 0.5) reasons.push('low_adherence');
        if (p.next_end && p.next_end <= toISODate(soon)) reasons.push('program_ending');
        if (!p.activated && p.invited_at && Date.now() - new Date(p.invited_at).getTime() > 3 * 86400_000) reasons.push('not_activated');
        if (p.active_programs === 0) reasons.push('no_active_program');
        if (reasons.length) attention.push({ patientId: p.id, name: `${p.first_name} ${p.last_name}`, reasons });
      }
      const order = ['high_pain', 'new_feedback', 'low_adherence', 'program_ending', 'not_activated', 'no_active_program'];
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
           LEFT JOIN exercise_media_overrides ov ON ov.exercise_id = e.id AND ov.practice_id = $1
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
      return {
        stats: {
          patients: ids.length,
          activePrograms: activePrograms.rows[0].n,
          adherence7d: planned ? completed / planned : null,
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
