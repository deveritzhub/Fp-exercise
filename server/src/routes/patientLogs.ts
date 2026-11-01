import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { PROTEIN, SELF_LIMITS, TRAINING_KIND_KEYS, minutesOk } from '../../../shared/patientLogs';

/** Own workouts and protein grams. Patient only; see migration 017. */
export const patientLogs = new Hono<AppEnv>();

const noteOrNull = (s: string | undefined, max: number) => {
  const t = (s ?? '').trim();
  return t ? t.slice(0, max) : null;
};

patientLogs.put('/logs/protein-goal', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ grams: z.number().int().min(PROTEIN.min).max(PROTEIN.max) }), await c.req.json());
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO protein_goals(patient_id, practice_id, grams) VALUES ($1, app.patient_practice($1), $2)
       ON CONFLICT (patient_id) DO UPDATE SET grams = EXCLUDED.grams, updated_at = now()`,
      [patient.id, b.grams],
    ),
  );
  return c.json({ ok: true });
});

patientLogs.post('/logs/protein', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ grams: z.number().int().min(PROTEIN.perEntryMin).max(PROTEIN.perEntryMax), label: z.string().max(40).optional() }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const n = (await tx.query('SELECT count(*)::int AS n FROM protein_logs WHERE patient_id = $1 AND day = now()::date', [patient.id])).rows[0].n as number;
    if (n >= PROTEIN.maxEntriesPerDay) throw badRequest('too_many_protein');
    await tx.query(
      `INSERT INTO protein_logs(patient_id, practice_id, day, grams, label) VALUES ($1, app.patient_practice($1), now()::date, $2, $3)`,
      [patient.id, b.grams, noteOrNull(b.label, 40)],
    );
  });
  return c.json({ ok: true }, 201);
});

patientLogs.delete('/logs/protein/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  const n = await withUser(user.id, (tx) => tx.query('DELETE FROM protein_logs WHERE id = $1 AND patient_id = $2', [id, patient.id]));
  if (!n.rowCount) throw notFound();
  return c.json({ ok: true });
});

patientLogs.post('/logs/trainings', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(
    z.object({
      kind: z.enum(TRAINING_KIND_KEYS),
      minutes: z.number().int(),
      pain: z.number().int().min(0).max(10).nullable().optional(),
      stoppedForPain: z.boolean().optional(),
      note: z.string().max(SELF_LIMITS.noteMax).optional(),
    }),
    await c.req.json(),
  );
  if (!minutesOk(b.minutes)) throw badRequest('bad_minutes');
  await withUser(user.id, async (tx) => {
    const n = (await tx.query('SELECT count(*)::int AS n FROM self_trainings WHERE patient_id = $1 AND day = now()::date', [patient.id])).rows[0].n as number;
    if (n >= SELF_LIMITS.maxLogsPerDay) throw badRequest('too_many_trainings');
    await tx.query(
      `INSERT INTO self_trainings(patient_id, practice_id, day, kind, minutes, pain, stopped_for_pain, note)
       VALUES ($1, app.patient_practice($1), now()::date, $2, $3, $4, $5, $6)`,
      [patient.id, b.kind, b.minutes, b.pain ?? null, b.stoppedForPain ?? false, noteOrNull(b.note, SELF_LIMITS.noteMax)],
    );
  });
  return c.json({ ok: true }, 201);
});

patientLogs.delete('/logs/trainings/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  const n = await withUser(user.id, (tx) => tx.query('DELETE FROM self_trainings WHERE id = $1 AND patient_id = $2', [id, patient.id]));
  if (!n.rowCount) throw notFound();
  return c.json({ ok: true });
});
