import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { audit } from '../lib/audit';
import { badRequest, HttpError, notFound } from '../lib/errors';
import { loadStrength } from '../lib/strengthData';
import { oneRmTestAllowed, ONE_RM_SCREENING } from '../../../shared/strength';
import { patientProgram } from './programs';

/**
 * Patient side of the FP app update: mode switch, consent per module, self-started kracht/mobiliteit
 * programmes, red-flag reports, strength log, 1RM tests, export and deletion requests.
 */
export const patientModules = new Hono<AppEnv>();

const MODULES = ['revalidatie', 'kracht', 'mobiliteit'] as const;
const SHARED = ['kracht', 'mobiliteit'] as const;

patientModules.get('/modes', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const p = (await tx.query('SELECT active_mode, strength_cleared_at FROM patients WHERE id = $1', [patient.id])).rows[0];
      const consents = (await tx.query('SELECT module, granted_at FROM patient_module_consents WHERE patient_id = $1 AND revoked_at IS NULL', [patient.id])).rows;
      const templates = (
        await tx.query(
          `SELECT p.*, (SELECT count(*) FROM program_items i WHERE i.program_id = p.id) AS item_count
             FROM programs p
            WHERE p.is_template AND p.status <> 'archived' AND p.module IN ('kracht','mobiliteit')
              AND p.practice_id = $1 AND (p.series_key IS NULL OR p.phase_no = 1)
            ORDER BY p.module, p.title`,
          [patient.practiceId],
        )
      ).rows;
      return {
        active: p.active_mode,
        strengthCleared: !!p.strength_cleared_at,
        consents: Object.fromEntries(SHARED.map((m) => [m, consents.find((x) => x.module === m)?.granted_at ?? null])),
        templates: templates.map((t) => ({ ...patientProgram(t), itemCount: t.item_count })),
      };
    }),
  );
});

patientModules.put('/mode', async (c) => {
  const { user } = requirePatient(c);
  const { mode } = parse(z.object({ mode: z.enum(MODULES) }), await c.req.json());
  await withUser(user.id, (tx) => tx.query('SELECT app.set_active_mode($1)', [mode]));
  return c.json({ ok: true });
});

/** The patient gives (or withdraws) consent for the practice to see one module. Dated; revoking hides, never deletes. */
patientModules.post('/consents/:module', async (c) => {
  const { user, patient } = requirePatient(c);
  const module = parse(z.enum(SHARED), c.req.param('module'));
  await withUser(user.id, async (tx) => {
    const open = await tx.query('SELECT 1 FROM patient_module_consents WHERE patient_id = $1 AND module = $2 AND revoked_at IS NULL', [patient.id, module]);
    if (open.rows[0]) return;
    await tx.query('INSERT INTO patient_module_consents(patient_id, practice_id, module, granted_by) VALUES ($1,$2,$3,app.uid())', [patient.id, patient.practiceId, module]);
    await audit(tx, user.id, patient.practiceId, 'consent_granted', 'patient', patient.id, { module });
  });
  return c.json({ ok: true });
});

patientModules.delete('/consents/:module', async (c) => {
  const { user, patient } = requirePatient(c);
  const module = parse(z.enum(SHARED), c.req.param('module'));
  await withUser(user.id, async (tx) => {
    const r = await tx.query(
      'UPDATE patient_module_consents SET revoked_at = now(), revoked_by = app.uid() WHERE patient_id = $1 AND module = $2 AND revoked_at IS NULL',
      [patient.id, module],
    );
    if (r.rowCount) await audit(tx, user.id, patient.practiceId, 'consent_revoked', 'patient', patient.id, { module });
  });
  return c.json({ ok: true });
});

patientModules.post('/programs/start', async (c) => {
  const { user, patient } = requirePatient(c);
  const { templateId } = parse(z.object({ templateId: z.string().uuid() }), await c.req.json());
  const id = await withUser(user.id, async (tx) => {
    try {
      const r = await tx.query("SELECT app.patient_start_program($1, (now() AT TIME ZONE 'Europe/Amsterdam')::date) AS id", [templateId]);
      await audit(tx, user.id, patient.practiceId, 'self_start', 'program', r.rows[0].id);
      return r.rows[0].id as string;
    } catch (e: any) {
      if (e.hint === 'strength_not_cleared') throw new HttpError(409, 'strength_not_cleared');
      if (e.code === '42501') throw notFound();
      throw e;
    }
  });
  return c.json({ id }, 201);
});

patientModules.post('/programs/:id/stop', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  const ok = await withUser(user.id, async (tx) => {
    const r = await tx.query('SELECT app.patient_stop_program($1) AS ok', [id]);
    if (r.rows[0].ok) await audit(tx, user.id, patient.practiceId, 'self_stop', 'program', id);
    return r.rows[0].ok as boolean;
  });
  if (!ok) throw notFound();
  return c.json({ ok: true });
});

/**
 * Red flag (W11): the patient reports one of the programme's red flags. Exercising stops (the
 * programme is paused until a therapist handles it) and the assigned therapists are notified.
 */
patientModules.post('/programs/:id/red-flag', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(
    z.object({ flags: z.array(z.string().trim().min(1).max(300)).max(20).default([]), note: z.string().trim().max(1000).optional(), sessionId: z.string().uuid().optional() }),
    await c.req.json(),
  );
  if (!b.flags.length && !b.note) throw badRequest('red_flag_empty');
  const reportId = await withUser(user.id, async (tx) => {
    const p = (await tx.query('SELECT id FROM programs WHERE id = $1 AND patient_id = $2', [id, patient.id])).rows[0];
    if (!p) throw notFound();
    const r = await tx.query(
      `INSERT INTO red_flag_reports(practice_id, patient_id, program_id, session_id, flags, note)
       VALUES ($1,$2,$3,(SELECT s.id FROM workout_sessions s WHERE s.id = $4 AND s.patient_id = $2),$5,$6) RETURNING id`,
      [patient.practiceId, patient.id, id, b.sessionId ?? null, JSON.stringify(b.flags), b.note || null],
    );
    // Notification text carries no clinical detail; the report itself is in the patient's record.
    const ther = await tx.query('SELECT therapist_id FROM patient_therapists WHERE patient_id = $1', [patient.id]);
    for (const t of ther.rows) {
      await tx.query(
        `INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,'red_flag',$3,$4,$5)`,
        [t.therapist_id, patient.practiceId, `Rode vlag gemeld door ${user.fullName}`, 'Het programma staat stil tot je de melding afhandelt. Neem contact op met de patiënt.', `/app/patienten/${patient.id}`],
      );
    }
    await audit(tx, user.id, patient.practiceId, 'red_flag', 'program', id);
    return r.rows[0].id as string;
  });
  return c.json({ id: reportId }, 201);
});

const setBody = z.object({
  programItemId: z.string().uuid(),
  setNo: z.number().int().min(1).max(30),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
  reps: z.number().int().min(0).max(200).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
  pain: z.number().int().min(0).max(10).nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
});

/** Log (or correct) one set: weight, reps, RPE, RIR and pain (W04). Idempotent per session/item/set. */
patientModules.post('/sessions/:id/sets', async (c) => {
  const { user, patient } = requirePatient(c);
  const sid = parse(uuidParam, c.req.param('id'));
  const b = parse(setBody, await c.req.json());
  await withUser(user.id, async (tx) => {
    const s = (await tx.query('SELECT program_id, practice_id, completed_at FROM workout_sessions WHERE id = $1 AND patient_id = $2', [sid, patient.id])).rows[0];
    if (!s) throw notFound();
    const item = (await tx.query('SELECT exercise_id FROM program_items WHERE id = $1 AND program_id = $2', [b.programItemId, s.program_id])).rows[0];
    if (!item) throw badRequest('invalid_item');
    await tx.query(
      `INSERT INTO strength_sets(session_id, practice_id, patient_id, program_item_id, exercise_id, set_no, weight_kg, reps, rpe, rir, pain, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (session_id, program_item_id, set_no) DO UPDATE SET weight_kg = EXCLUDED.weight_kg, reps = EXCLUDED.reps,
         rpe = EXCLUDED.rpe, rir = EXCLUDED.rir, pain = EXCLUDED.pain, note = EXCLUDED.note`,
      [sid, s.practice_id, patient.id, b.programItemId, item.exercise_id, b.setNo, b.weightKg ?? null, b.reps ?? null, b.rpe ?? null, b.rir ?? null, b.pain ?? null, b.note || null],
    );
  });
  return c.json({ ok: true });
});

patientModules.get('/strength', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(await withUser(user.id, (tx) => loadStrength(tx, patient.id)));
});

/**
 * Direct 1RM test (W08): screening first (any "yes" stops the test and advises to see the GP),
 * never in the first 4 weeks of the programme.
 */
patientModules.post('/one-rm-tests', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(
    z.object({
      programId: z.string().uuid(),
      exerciseId: z.string().uuid(),
      screening: z.object(Object.fromEntries(ONE_RM_SCREENING.map((q) => [q.key, z.boolean()])) as Record<(typeof ONE_RM_SCREENING)[number]['key'], z.ZodBoolean>),
      weightKg: z.number().min(1).max(1000).optional(),
    }),
    await c.req.json(),
  );
  const result = await withUser(user.id, async (tx) => {
    const p = (await tx.query(
      `SELECT coalesce(p.start_date, p.activated_at::date) AS start FROM programs p JOIN program_items i ON i.program_id = p.id
        WHERE p.id = $1 AND p.patient_id = $2 AND p.module = 'kracht' AND i.exercise_id = $3 LIMIT 1`,
      [b.programId, patient.id, b.exerciseId],
    )).rows[0];
    if (!p) throw notFound();
    if (!oneRmTestAllowed(p.start)) throw badRequest('one_rm_too_early');
    const ok = Object.values(b.screening).every((v) => v === false);
    if (ok && !b.weightKg) throw badRequest('weight_required');
    await tx.query(
      'INSERT INTO one_rm_tests(practice_id, patient_id, program_id, exercise_id, screening_ok, weight_kg) VALUES ($1,$2,$3,$4,$5,$6)',
      [patient.practiceId, patient.id, b.programId, b.exerciseId, ok, ok ? b.weightKg : null],
    );
    return { stopped: !ok };
  });
  return c.json(result, 201);
});

/** AVG (W15): the patient downloads everything stored about them, in all modules. */
patientModules.get('/export', async (c) => {
  const { user, patient } = requirePatient(c);
  const data = await withUser(user.id, async (tx) => {
    const q = async (sql: string) => (await tx.query(sql, [patient.id])).rows;
    const out = {
      exportedAt: new Date().toISOString(),
      account: { name: user.fullName, email: user.email },
      patient: (await q('SELECT id, first_name, last_name, email, locale, active_mode, created_at FROM patients WHERE id = $1'))[0],
      programs: (await q(`SELECT * FROM programs WHERE patient_id = $1`)).map(patientProgram),
      sessions: await q('SELECT * FROM workout_sessions WHERE patient_id = $1'),
      exerciseLogs: await q('SELECT * FROM exercise_logs WHERE patient_id = $1'),
      strengthSets: await q('SELECT * FROM strength_sets WHERE patient_id = $1'),
      oneRmTests: await q('SELECT * FROM one_rm_tests WHERE patient_id = $1'),
      consents: await q('SELECT module, granted_at, revoked_at FROM patient_module_consents WHERE patient_id = $1'),
      redFlagReports: await q('SELECT flags, note, created_at, handled_at FROM red_flag_reports WHERE patient_id = $1'),
      deletionRequests: await q('SELECT created_at, handled_at, outcome FROM deletion_requests WHERE patient_id = $1'),
    };
    await audit(tx, user.id, patient.practiceId, 'export_self', 'patient', patient.id);
    return out;
  });
  c.header('Content-Disposition', 'attachment; filename="mijn-fp-exercise-gegevens.json"');
  return c.json(data);
});

/** AVG (W15): request deletion; the practice (as data controller) handles it. */
patientModules.get('/deletion-request', async (c) => {
  const { user, patient } = requirePatient(c);
  const r = await withUser(user.id, (tx) =>
    tx.query('SELECT created_at, handled_at, outcome FROM deletion_requests WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1', [patient.id]),
  );
  return c.json({ request: r.rows[0] ?? null });
});

patientModules.post('/deletion-request', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ reason: z.string().trim().max(1000).optional() }), await c.req.json().catch(() => ({})));
  await withUser(user.id, async (tx) => {
    const open = await tx.query('SELECT 1 FROM deletion_requests WHERE patient_id = $1 AND handled_at IS NULL', [patient.id]);
    if (open.rows[0]) throw new HttpError(409, 'deletion_already_requested');
    await tx.query('INSERT INTO deletion_requests(practice_id, patient_id, requested_by, reason) VALUES ($1,$2,app.uid(),$3)', [patient.practiceId, patient.id, b.reason || null]);
    const ther = await tx.query('SELECT therapist_id FROM patient_therapists WHERE patient_id = $1', [patient.id]);
    for (const t of ther.rows) {
      await tx.query(
        `INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,'deletion_request',$3,$4,$5)`,
        [t.therapist_id, patient.practiceId, `Verwijderverzoek van ${user.fullName}`, 'De praktijkeigenaar of -beheerder handelt dit af.', `/app/patienten/${patient.id}`],
      );
    }
    await audit(tx, user.id, patient.practiceId, 'deletion_requested', 'patient', patient.id);
  });
  return c.json({ ok: true }, 201);
});
