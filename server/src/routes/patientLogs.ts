import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { PROTEIN, SELF_LIMITS, TRAINING_KIND_KEYS, minutesOk } from '../../../shared/patientLogs';
import { proteinTargets } from '../../../shared/protein';
import { WATER } from '../../../shared/survival';

/** Own workouts and protein grams. Patient only; see migration 017. */
export const patientLogs = new Hono<AppEnv>();

const noteOrNull = (s: string | undefined, max: number) => {
  const t = (s ?? '').trim();
  return t ? t.slice(0, max) : null;
};

/**
 * The daily protein goal: a level (minimum / suboptimal / optimal, follows the weight; needs a
 * weight) or an own number of grams.
 */
patientLogs.put('/logs/protein-goal', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(
    z.union([
      z.object({ tier: z.enum(['minimum', 'suboptimal', 'optimal']) }),
      z.object({ grams: z.number().int().min(PROTEIN.min).max(PROTEIN.max) }),
    ]),
    await c.req.json(),
  );
  await withUser(user.id, async (tx) => {
    let grams: number;
    let tier: string | null = null;
    if ('tier' in b) {
      const body = (await tx.query('SELECT weight_kg, height_cm, older_adult FROM patient_body_metrics WHERE patient_id = $1', [patient.id])).rows[0];
      if (!body?.weight_kg) throw badRequest('weight_required');
      const t = proteinTargets(Number(body.weight_kg), body.height_cm ? Number(body.height_cm) : null, !!body.older_adult);
      grams = Math.min(PROTEIN.max, Math.max(PROTEIN.min, t[b.tier]));
      tier = b.tier;
    } else grams = b.grams;
    await tx.query(
      `INSERT INTO protein_goals(patient_id, practice_id, grams, tier) VALUES ($1, app.patient_practice($1), $2, $3)
       ON CONFLICT (patient_id) DO UPDATE SET grams = EXCLUDED.grams, tier = EXCLUDED.tier, updated_at = now()`,
      [patient.id, grams, tier],
    );
  });
  return c.json({ ok: true });
});

/** Today's weight (one per day, the latest counts). No XP: weighing yourself is not a game. */
patientLogs.post('/logs/weight', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ kg: z.number().min(20).max(300) }), await c.req.json());
  const kg = Math.round(b.kg * 10) / 10;
  await withUser(user.id, async (tx) => {
    await tx.query(
      `INSERT INTO weight_logs(patient_id, practice_id, day, kg) VALUES ($1, app.patient_practice($1), now()::date, $2)
       ON CONFLICT (patient_id, day) DO UPDATE SET kg = EXCLUDED.kg`,
      [patient.id, kg],
    );
    await tx.query(
      `INSERT INTO patient_body_metrics(patient_id, practice_id, weight_kg) VALUES ($1, app.patient_practice($1), $2)
       ON CONFLICT (patient_id) DO UPDATE SET weight_kg = EXCLUDED.weight_kg, updated_at = now()`,
      [patient.id, kg],
    );
  });
  return c.json({ ok: true }, 201);
});

/** A glass or bottle of water. A daily maximum guards against drinking far too much. */
patientLogs.post('/logs/water', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ ml: z.number().int().min(50).max(WATER.maxEntry) }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const sum = Number((await tx.query('SELECT coalesce(sum(ml), 0) AS s FROM water_logs WHERE patient_id = $1 AND day = now()::date', [patient.id])).rows[0].s);
    if (sum + b.ml > WATER.maxPerDay) throw badRequest('too_much_water');
    await tx.query('INSERT INTO water_logs(patient_id, practice_id, day, ml) VALUES ($1, app.patient_practice($1), now()::date, $2)', [patient.id, b.ml]);
  });
  return c.json({ ok: true }, 201);
});

patientLogs.delete('/logs/water/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  const n = await withUser(user.id, (tx) => tx.query('DELETE FROM water_logs WHERE id = $1 AND patient_id = $2', [id, patient.id]));
  if (!n.rowCount) throw notFound();
  return c.json({ ok: true });
});

/** Last night's sleep (stored on this morning's date; can be changed the same day). */
patientLogs.put('/logs/sleep', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ hours: z.number().min(0).max(16), quality: z.number().int().min(1).max(5) }), await c.req.json());
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO sleep_logs(patient_id, practice_id, day, hours, quality) VALUES ($1, app.patient_practice($1), now()::date, $2, $3)
       ON CONFLICT (patient_id, day) DO UPDATE SET hours = EXCLUDED.hours, quality = EXCLUDED.quality`,
      [patient.id, Math.round(b.hours * 2) / 2, b.quality],
    ),
  );
  return c.json({ ok: true });
});

/** 65 or older: a higher minimum (PROT-AGE / ESPEN). */
patientLogs.put('/logs/older-adult', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ olderAdult: z.boolean() }), await c.req.json());
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO patient_body_metrics(patient_id, practice_id, older_adult) VALUES ($1, app.patient_practice($1), $2)
       ON CONFLICT (patient_id) DO UPDATE SET older_adult = EXCLUDED.older_adult, updated_at = now()`,
      [patient.id, b.olderAdult],
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
