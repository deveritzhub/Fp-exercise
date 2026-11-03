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
import { isClinical } from '../../../shared/accountKind';

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
      const p = (await tx.query('SELECT active_mode, strength_cleared_at, self_check_at, self_check_outcome FROM patients WHERE id = $1', [patient.id])).rows[0];
      if (!isClinical(patient.kind) && p.active_mode === 'revalidatie') p.active_mode = 'kracht';
      const consents = (await tx.query('SELECT module, granted_at FROM patient_module_consents WHERE patient_id = $1 AND revoked_at IS NULL', [patient.id])).rows;
      // Start templates of the own practice via a definer function (patients cannot read templates under RLS).
      const templates = (await tx.query('SELECT * FROM app.patient_module_templates()')).rows;
      return {
        active: p.active_mode,
        kind: patient.kind,
        modules: isClinical(patient.kind) ? MODULES : SHARED,
        strengthCleared: !!p.strength_cleared_at,
        selfCheck: patient.kind === 'personal' ? { at: p.self_check_at, outcome: p.self_check_outcome } : null,
        consents: Object.fromEntries(SHARED.map((m) => [m, consents.find((x) => x.module === m)?.granted_at ?? null])),
        templates: templates.map((t) => ({
          id: t.id,
          title: t.title,
          patientInstructions: t.patient_instructions,
          module: t.module,
          phase: t.phase_no ? { seriesTitle: t.series_title, no: t.phase_no, count: t.phase_count, name: t.phase_name, weeks: t.phase_weeks, goal: t.phase_goal } : null,
          redFlags: t.red_flags ?? [],
          itemCount: t.item_count,
        })),
      };
    }),
  );
});

patientModules.put('/mode', async (c) => {
  const { user, patient } = requirePatient(c);
  const { mode } = parse(z.object({ mode: z.enum(MODULES) }), await c.req.json());
  if (mode === 'revalidatie' && !isClinical(patient.kind)) throw new HttpError(409, 'rehab_needs_physio');
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

/**
 * Self-check before strength training, for personal accounts (no physiotherapist to clear it).
 * Only the outcome is stored, never the answers.
 */
patientModules.post('/self-check', async (c) => {
  const { user, patient } = requirePatient(c);
  if (patient.kind !== 'personal') throw new HttpError(403, 'forbidden');
  const b = parse(z.object({ anyYes: z.boolean(), doctorOk: z.boolean().default(false) }), await c.req.json());
  const outcome = await withUser(user.id, async (tx) => {
    const r = (await tx.query('SELECT app.patient_self_check($1, $2) AS o', [b.anyYes, b.doctorOk])).rows[0].o as string;
    await audit(tx, user.id, patient.practiceId, 'self_check', 'patient', patient.id, { outcome: r });
    return r;
  });
  return c.json({ outcome });
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
  // Warning-sign reports go to a physiotherapist; other accounts get general safety advice instead.
  if (!isClinical(patient.kind)) throw new HttpError(409, 'red_flag_needs_physio');
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
        [t.therapist_id, patient.practiceId, `Rode vlag gemeld door ${user.fullName}`, 'Het programma staat stil tot je de melding afhandelt. Neem contact op met de patiënt.', `/app/patienten/${patient.id}?tab=modules`],
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
      outcomeMeasurements: await q('SELECT measured_on, domain, metric, value, unit, side, note, created_at FROM patient_outcomes WHERE patient_id = $1 ORDER BY measured_on DESC'),
      gymSets: await q('SELECT day, exercise_name, set_no, weight_kg, reps, rpe, rir, place, created_at FROM gym_sets WHERE patient_id = $1 ORDER BY day, created_at'),
      gymRoutines: await q('SELECT name, items, created_at, updated_at FROM gym_routines WHERE patient_id = $1 ORDER BY created_at'),
      consents: await q('SELECT module, granted_at, revoked_at FROM patient_module_consents WHERE patient_id = $1'),
      redFlagReports: await q('SELECT flags, note, created_at, handled_at FROM red_flag_reports WHERE patient_id = $1'),
      deletionRequests: await q('SELECT created_at, handled_at, outcome FROM deletion_requests WHERE patient_id = $1'),
      hero: (await q('SELECT hero_name, frame, build, skin, hair, hair_color, eye_color, beard, glasses, outfit, sport, sports, created_at, updated_at FROM patient_heroes WHERE patient_id = $1'))[0] ?? null,
      bodyMetrics: (await q('SELECT weight_kg, body_fat_pct, height_cm, updated_at FROM patient_body_metrics WHERE patient_id = $1'))[0] ?? null,
      painMap: await q(`SELECT batch, area, score, recorded_at FROM pain_map_entries WHERE patient_id = $1 AND area <> 'none' ORDER BY recorded_at`),
      proteinGoal: (await q('SELECT grams, updated_at FROM protein_goals WHERE patient_id = $1'))[0] ?? null,
      proteinLogs: await q('SELECT day, grams, label, created_at FROM protein_logs WHERE patient_id = $1 ORDER BY created_at'),
      selfTrainings: await q('SELECT day, kind, minutes, pain, stopped_for_pain, note, created_at FROM self_trainings WHERE patient_id = $1 ORDER BY created_at'),
      stepGoal: (await q('SELECT steps, updated_at FROM step_goals WHERE patient_id = $1'))[0] ?? null,
      stepDays: await q('SELECT day, steps, source, updated_at FROM step_days WHERE patient_id = $1 ORDER BY day'),
      fitnessConnections: await q(`SELECT provider, external_user_id, scope, connected_at, synced_at FROM fitness_connections WHERE patient_id = $1`),
      heroSharing: (await q('SELECT share_with_friends, friend_code, shared_stats, stats_updated_at, team_opt_in, team_week, team_done FROM patient_heroes WHERE patient_id = $1'))[0] ?? null,
      heroShop: {
        purchases: await q('SELECT item, price, bought_at FROM hero_purchases WHERE patient_id = $1 ORDER BY bought_at'),
        dayChests: await q('SELECT day, coins, opened_at FROM hero_daily_chests WHERE patient_id = $1 ORDER BY day'),
      },
      heroFriends: (await q('SELECT kind, hero_name, since FROM app.hero_friends($1)')).map((f) => ({ kind: f.kind, heroName: f.hero_name, since: f.since })),
    };
    await audit(tx, user.id, patient.practiceId, 'export_self', 'patient', patient.id);
    return out;
  });
  c.header('Content-Disposition', 'attachment; filename="mijn-fp-flow-gegevens.json"');
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
        [t.therapist_id, patient.practiceId, `Verwijderverzoek van ${user.fullName}`, 'De praktijkeigenaar of -beheerder handelt dit af.', `/app/patienten/${patient.id}?tab=modules`],
      );
    }
    await audit(tx, user.id, patient.practiceId, 'deletion_requested', 'patient', patient.id);
  });
  return c.json({ ok: true }, 201);
});
