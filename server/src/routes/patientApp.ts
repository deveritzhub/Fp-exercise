import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { audit } from '../lib/audit';
import { badRequest, notFound, HttpError } from '../lib/errors';
import { uuid } from '../lib/crypto';
import { loadItems, patientProgram } from './programs';
import { notifyTherapists } from '../lib/notify';
import { adherenceForPatient, loadAdherenceInputs, weeklyForPatient } from '../lib/progress';
import { streak, toISODate, weekStrip } from '../../../shared/adherence';
import { itemsForDate, nextSessionDate } from '../../../shared/schedule';

/** Endpoints for the patient app. Everything is scoped to the logged-in patient by RLS. */
export const patientApp = new Hono<AppEnv>();

const todayISO = () => toISODate(new Date());

patientApp.get('/home', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const today = todayISO();
      const progs = await tx.query(
        `SELECT p.*, u.full_name AS therapist_name FROM programs p LEFT JOIN users u ON u.id = p.created_by
          WHERE p.patient_id = $1 AND p.status = 'active' ORDER BY p.activated_at DESC NULLS LAST`,
        [patient.id],
      );
      const doneToday = await tx.query(
        `SELECT program_id, max(completed_at) AS completed_at FROM workout_sessions
          WHERE patient_id = $1 AND completed_at IS NOT NULL AND (completed_at AT TIME ZONE current_setting('TIMEZONE'))::date = $2::date
          GROUP BY program_id`,
        [patient.id, today],
      );
      const doneSet = new Set(doneToday.rows.map((r) => r.program_id));
      const paused = new Set(
        (await tx.query('SELECT DISTINCT program_id FROM red_flag_reports WHERE patient_id = $1 AND handled_at IS NULL', [patient.id])).rows.map((r) => r.program_id),
      );
      const mode = (await tx.query('SELECT active_mode FROM patients WHERE id = $1', [patient.id])).rows[0]?.active_mode ?? 'revalidatie';
      // Unfinished workouts (same 12-hour window as the session start, so resuming never duplicates).
      const open = new Map(
        (
          await tx.query(
            `SELECT DISTINCT ON (s.program_id) s.program_id, s.id, s.started_at,
                    (SELECT count(*) FROM exercise_logs l WHERE l.session_id = s.id)::int AS logged
               FROM workout_sessions s WHERE s.patient_id = $1 AND s.completed_at IS NULL AND s.started_at > now() - interval '12 hours'
              ORDER BY s.program_id, s.started_at DESC`,
            [patient.id],
          )
        ).rows.map((r) => [r.program_id, { id: r.id, startedAt: r.started_at, logged: r.logged }]),
      );
      const programs = [];
      for (const p of progs.rows) {
        const items = await loadItems(tx, p.id);
        const win = { startDate: p.start_date, endDate: p.end_date };
        const todayItems = itemsForDate(win, items, today);
        programs.push({
          ...patientProgram(p),
          therapistName: p.therapist_name,
          paused: paused.has(p.id),
          selfStarted: p.created_by === user.id,
          itemCount: items.length,
          today: { scheduled: todayItems.length, done: doneSet.has(p.id), items: todayItems.map((i) => ({ id: i.id, exercise: i.exercise, sets: i.sets, reps: i.reps, holdS: i.holdS })) },
          nextSession: nextSessionDate(win, items, today),
          openSession: open.get(p.id) ?? null,
          upcoming: p.start_date && p.start_date > today,
        });
      }
      const inputs = await loadAdherenceInputs(tx, [patient.id]);
      const recent = await tx.query(
        `SELECT s.id, s.completed_at, s.difficulty, s.pain, pr.title,
                (SELECT count(*) FROM exercise_logs l WHERE l.session_id = s.id AND l.completed) AS exercises_done
           FROM workout_sessions s JOIN programs pr ON pr.id = s.program_id
          WHERE s.patient_id = $1 AND s.completed_at IS NOT NULL ORDER BY s.completed_at DESC LIMIT 5`,
        [patient.id],
      );
      const notifications = await tx.query(
        'SELECT id, kind, title, body, link, read_at, created_at FROM notifications WHERE user_id = app.uid() AND read_at IS NULL ORDER BY created_at DESC LIMIT 5',
      );
      const total = await tx.query('SELECT count(*) AS n FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL', [patient.id]);
      return {
        patient: { firstName: user.fullName.split(' ')[0], practiceName: patient.practiceName },
        mode,
        programs,
        stats: {
          week: weekStrip(inputs.schedules.get(patient.id) ?? [], inputs.done.get(patient.id) ?? new Map(), new Date()),
          streak: streak(inputs.schedules.get(patient.id) ?? [], inputs.done.get(patient.id) ?? new Map(), new Date()),
          completedSessions: total.rows[0].n,
          adherence7d: adherenceForPatient(inputs, patient.id, 7),
          weekly: weeklyForPatient(inputs, patient.id, 4),
        },
        recent: recent.rows.map((r) => ({
          id: r.id,
          completedAt: r.completed_at,
          programTitle: r.title,
          difficulty: r.difficulty,
          pain: r.pain,
          exercisesDone: r.exercises_done,
        })),
        notifications: notifications.rows.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, createdAt: n.created_at })),
      };
    }),
  );
});

patientApp.get('/programs/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT p.*, u.full_name AS therapist_name FROM programs p LEFT JOIN users u ON u.id = p.created_by
          WHERE p.id = $1 AND p.patient_id = $2`,
        [id, patient.id],
      );
      if (!rows[0]) throw notFound();
      const open = await tx.query(
        `SELECT s.id, (SELECT coalesce(json_agg(l.program_item_id), '[]') FROM exercise_logs l WHERE l.session_id = s.id) AS logged
           FROM workout_sessions s WHERE s.program_id = $1 AND s.patient_id = $2 AND s.completed_at IS NULL
            AND s.started_at > now() - interval '12 hours' ORDER BY s.started_at DESC LIMIT 1`,
        [id, patient.id],
      );
      // The description is the therapists' internal note (criteria, evidence): never sent to patients.
      const program = patientProgram(rows[0]);
      const paused = (await tx.query('SELECT 1 FROM red_flag_reports WHERE program_id = $1 AND handled_at IS NULL', [id])).rows.length > 0;
      return {
        ...program,
        paused,
        selfStarted: rows[0].created_by === user.id,
        therapistName: rows[0].therapist_name,
        items: await loadItems(tx, id),
        openSession: open.rows[0] ? { id: open.rows[0].id, loggedItemIds: open.rows[0].logged } : null,
      };
    }),
  );
});

patientApp.post('/sessions', async (c) => {
  const { user, patient } = requirePatient(c);
  // `id` + `startedAt` are sent when the workout was started offline and is synced later.
  const { programId, id: clientId, startedAt } = parse(
    z.object({ programId: z.string().uuid(), id: z.string().uuid().optional(), startedAt: z.string().datetime().optional() }),
    await c.req.json(),
  );
  return c.json(
    await withUser(user.id, async (tx) => {
      const p = await tx.query(`SELECT version, practice_id FROM programs WHERE id = $1 AND patient_id = $2 AND status = 'active'`, [
        programId,
        patient.id,
      ]);
      if (!p.rows[0]) throw notFound();
      // Red flag reported (W11): no exercising until the therapist has handled it.
      const flagged = await tx.query('SELECT 1 FROM red_flag_reports WHERE program_id = $1 AND handled_at IS NULL', [programId]);
      if (flagged.rows[0]) throw new HttpError(409, 'paused_red_flag');
      if (clientId) {
        // 168 hours, not '7 days': a calendar interval spans 7 days + 1 h across a DST change.
        const ins = await tx.query(
          `INSERT INTO workout_sessions(id, practice_id, patient_id, program_id, program_version, started_at)
           VALUES ($1,$2,$3,$4,$5, least(now(), greatest(now() - interval '168 hours', coalesce($6::timestamptz, now()))))
           ON CONFLICT (id) DO NOTHING`,
          [clientId, p.rows[0].practice_id, patient.id, programId, p.rows[0].version, startedAt ?? null],
        );
        if (ins.rowCount === 0) {
          // Replayed sync: fine if it is this patient's session, otherwise the id is taken.
          const own = await tx.query('SELECT 1 FROM workout_sessions WHERE id = $1 AND patient_id = $2 AND program_id = $3', [clientId, patient.id, programId]);
          if (!own.rows[0]) throw new HttpError(409, 'conflict');
        }
        return { id: clientId, resumed: ins.rowCount === 0 };
      }
      // Resume an unfinished session from the last 12 hours instead of creating duplicates.
      const open = await tx.query(
        `SELECT id FROM workout_sessions WHERE program_id = $1 AND patient_id = $2 AND completed_at IS NULL
           AND started_at > now() - interval '12 hours' ORDER BY started_at DESC LIMIT 1`,
        [programId, patient.id],
      );
      if (open.rows[0]) return { id: open.rows[0].id, resumed: true };
      const id = uuid();
      await tx.query(
        'INSERT INTO workout_sessions(id, practice_id, patient_id, program_id, program_version) VALUES ($1,$2,$3,$4,$5)',
        [id, p.rows[0].practice_id, patient.id, programId, p.rows[0].version],
      );
      return { id, resumed: false };
    }),
    201,
  );
});

const score = z.number().int().min(0).max(10).nullable().optional();

const logBody = z.object({
  programItemId: z.string().uuid(),
  completed: z.boolean().default(true),
  setsDone: z.number().int().min(0).max(50).nullable().optional(),
  repsDone: z.number().int().min(0).max(500).nullable().optional(),
  difficulty: score,
  pain: score,
  feedback: z.string().trim().max(2000).nullable().optional(),
});

async function loadOpenSession(tx: Tx, sessionId: string, patientId: string) {
  const { rows } = await tx.query('SELECT * FROM workout_sessions WHERE id = $1 AND patient_id = $2', [sessionId, patientId]);
  if (!rows[0]) throw notFound();
  if (rows[0].completed_at) throw badRequest('session_completed');
  return rows[0];
}

patientApp.post('/sessions/:id/logs', async (c) => {
  const { user, patient } = requirePatient(c);
  const sid = parse(uuidParam, c.req.param('id'));
  const b = parse(logBody, await c.req.json());
  await withUser(user.id, async (tx) => {
    const s = await loadOpenSession(tx, sid, patient.id);
    const item = await tx.query('SELECT exercise_id FROM program_items WHERE id = $1 AND program_id = $2', [b.programItemId, s.program_id]);
    if (!item.rows[0]) throw badRequest('invalid_item');
    await tx.query(
      `INSERT INTO exercise_logs(session_id, practice_id, patient_id, program_item_id, exercise_id, completed, sets_done,
         reps_done, difficulty, pain, feedback)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (session_id, program_item_id) DO UPDATE SET completed = EXCLUDED.completed, sets_done = EXCLUDED.sets_done,
         reps_done = EXCLUDED.reps_done, difficulty = EXCLUDED.difficulty, pain = EXCLUDED.pain, feedback = EXCLUDED.feedback`,
      [sid, s.practice_id, patient.id, b.programItemId, item.rows[0].exercise_id, b.completed, b.setsDone ?? null,
        b.repsDone ?? null, b.difficulty ?? null, b.pain ?? null, b.feedback || null],
    );
  });
  return c.json({ ok: true });
});

patientApp.post('/sessions/:id/complete', async (c) => {
  const { user, patient } = requirePatient(c);
  const sid = parse(uuidParam, c.req.param('id'));
  const b = parse(
    z.object({
      difficulty: score,
      pain: score,
      feedback: z.string().trim().max(2000).nullable().optional(),
      completedAt: z.string().datetime().optional(), // when finished offline
    }),
    await c.req.json(),
  );
  await withUser(user.id, async (tx) => {
    const cur = await tx.query('SELECT completed_at FROM workout_sessions WHERE id = $1 AND patient_id = $2', [sid, patient.id]);
    if (cur.rows[0]?.completed_at) return; // replayed sync: already done
    const s = await loadOpenSession(tx, sid, patient.id);
    await tx.query(
      `UPDATE workout_sessions SET completed_at = least(now(), greatest(started_at, coalesce($5::timestamptz, now()))),
              difficulty = $2, pain = $3, feedback = $4 WHERE id = $1`,
      [sid, b.difficulty ?? null, b.pain ?? null, b.feedback || null, b.completedAt ?? null],
    );
    const maxPain = await tx.query('SELECT max(pain) AS m, bool_or(feedback IS NOT NULL) AS fb FROM exercise_logs WHERE session_id = $1', [sid]);
    const highPain = Math.max(b.pain ?? 0, maxPain.rows[0].m ?? 0) >= 6;
    if (highPain || b.feedback || maxPain.rows[0].fb) {
      await notifyTherapists(tx, patient.id, s.practice_id, user.fullName, highPain);
    }
    await audit(tx, user.id, s.practice_id, 'complete', 'workout_session', sid);
  });
  return c.json({ ok: true });
});

patientApp.get('/history', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const inputs = await loadAdherenceInputs(tx, [patient.id]);
      const { rows } = await tx.query(
        `SELECT s.id, s.completed_at, s.difficulty, s.pain, s.feedback, pr.title,
                (SELECT count(*) FROM exercise_logs l WHERE l.session_id = s.id AND l.completed) AS exercises_done,
                (SELECT count(*) FROM program_items i WHERE i.program_id = s.program_id) AS exercises_total
           FROM workout_sessions s JOIN programs pr ON pr.id = s.program_id
          WHERE s.patient_id = $1 AND s.completed_at IS NOT NULL ORDER BY s.completed_at DESC LIMIT 200`,
        [patient.id],
      );
      return {
        weekly: weeklyForPatient(inputs, patient.id, 8),
        sessions: rows.map((r) => ({
          id: r.id,
          completedAt: r.completed_at,
          programTitle: r.title,
          difficulty: r.difficulty,
          pain: r.pain,
          feedback: r.feedback,
          exercisesDone: r.exercises_done,
          exercisesTotal: r.exercises_total,
        })),
      };
    }),
  );
});
