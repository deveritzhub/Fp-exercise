import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requirePatient, requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { GYM_LIMITS, GYM_PLACES, gymKey, setEstimate, summariseGym, type GymRoutine, type GymSet } from '../../../shared/gymLog';

/**
 * Krachtlog with 1RM meter for every patient (migration 023). The patient logs in the gym, at home or
 * in the practice; a professional of the practice logs in the practice. Reads follow RLS.
 */
export const gymPatient = new Hono<AppEnv>();
export const gymStaff = new Hono<AppEnv>();

const setBody = z.object({
  exerciseId: z.string().uuid().nullable().optional(),
  exerciseName: z.string().trim().min(GYM_LIMITS.nameMin).max(GYM_LIMITS.nameMax),
  weightKg: z.number().min(0).max(GYM_LIMITS.weightMax),
  reps: z.number().int().min(1).max(GYM_LIMITS.repsMax),
  rpe: z.number().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).max(GYM_LIMITS.rirMax).nullable().optional(),
  place: z.enum(GYM_PLACES).optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });

async function load(tx: Tx, patientId: string, userId: string) {
  const { rows } = await tx.query(
    `SELECT g.*, (g.logged_by = p.user_id) AS by_patient
       FROM gym_sets g JOIN patients p ON p.id = g.patient_id
      WHERE g.patient_id = $1 AND g.day >= current_date - 365
      ORDER BY g.day DESC, g.created_at DESC LIMIT 1500`,
    [patientId],
  );
  const sets: GymSet[] = rows.map((r) => ({
    id: r.id, day: r.day instanceof Date ? r.day.toLocaleDateString('sv-SE') : String(r.day), exerciseId: r.exercise_id, exerciseName: r.exercise_name,
    setNo: r.set_no, weightKg: Number(r.weight_kg), reps: r.reps, rpe: r.rpe === null ? null : Number(r.rpe), rir: r.rir ?? null, place: r.place,
    byPatient: !!r.by_patient, mine: r.logged_by === userId, createdAt: r.created_at,
  }));
  // Strength exercises from the libraries the user can see, as suggestions.
  const lib = (
    await tx.query(
      `SELECT id, name_nl, name_en FROM exercises
        WHERE archived_at IS NULL AND ('strength' = ANY(training_categories) OR 'krachttraining' = ANY(tags))
        ORDER BY practice_id NULLS LAST, name_nl LIMIT 400`,
    )
  ).rows.map((r) => ({ id: r.id as string, nameNl: r.name_nl as string, nameEn: r.name_en as string }));
  return { sets: sets.slice(0, 300), exercises: summariseGym(sets), library: lib };
}

async function addSet(tx: Tx, patientId: string, b: z.infer<typeof setBody>, place: string) {
  const day = b.day ?? today();
  if (day > today()) throw badRequest('future_day');
  const name = b.exerciseName.trim().replace(/\s+/g, ' ');
  if (b.exerciseId) {
    const ok = (await tx.query('SELECT 1 FROM exercises WHERE id = $1', [b.exerciseId])).rowCount;
    if (!ok) throw badRequest('unknown_exercise');
  }
  const prior = (
    await tx.query('SELECT exercise_name, weight_kg, reps FROM gym_sets WHERE patient_id = $1 AND day < $2', [patientId, day])
  ).rows.filter((r) => gymKey(r.exercise_name) === gymKey(name));
  const sameDay = (await tx.query('SELECT exercise_name FROM gym_sets WHERE patient_id = $1 AND day = $2', [patientId, day])).rows;
  if (sameDay.length >= GYM_LIMITS.setsPerDay * 4) throw badRequest('too_many_sets');
  const setNo = Math.min(GYM_LIMITS.setsPerDay, sameDay.filter((r) => gymKey(r.exercise_name) === gymKey(name)).length + 1);
  const r = await tx.query(
    `INSERT INTO gym_sets(patient_id, practice_id, day, exercise_id, exercise_name, set_no, weight_kg, reps, rpe, rir, place, logged_by)
     VALUES ($1, app.patient_practice($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, app.uid()) RETURNING id`,
    [patientId, day, b.exerciseId ?? null, name, setNo, b.weightKg, b.reps, b.rpe ?? null, b.rir ?? null, place],
  );
  const estimate = setEstimate(b.weightKg, b.reps);
  const bestBefore = prior.reduce((m, s) => Math.max(m, setEstimate(Number(s.weight_kg), s.reps) ?? 0), 0);
  return { id: r.rows[0].id as string, setNo, estimate, pr: estimate !== null && bestBefore > 0 && estimate > bestBefore };
}

// ---------------------------------------------------------------- patient
gymPatient.get('/gym', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(await withUser(user.id, (tx) => load(tx, patient.id, user.id)));
});

gymPatient.post('/gym/sets', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(setBody, await c.req.json());
  return c.json(await withUser(user.id, (tx) => addSet(tx, patient.id, b, b.place ?? 'gym')), 201);
});

gymPatient.delete('/gym/sets/:setId', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('setId'));
  await withUser(user.id, async (tx) => {
    const r = await tx.query('DELETE FROM gym_sets WHERE id = $1 AND patient_id = $2', [id, patient.id]);
    if (!r.rowCount) throw notFound();
  });
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- own routines ("Mijn schema's")
const routineBody = z.object({
  name: z.string().trim().min(2).max(60),
  items: z
    .array(
      z
        .object({
          exerciseId: z.string().uuid().nullable().optional(),
          exerciseName: z.string().trim().min(GYM_LIMITS.nameMin).max(GYM_LIMITS.nameMax),
          sets: z.number().int().min(1).max(GYM_LIMITS.routineSets),
          repsMin: z.number().int().min(1).max(GYM_LIMITS.repsMax),
          repsMax: z.number().int().min(1).max(GYM_LIMITS.repsMax),
          restS: z.number().int().min(0).max(600).nullable().optional(),
        })
        .refine((i) => i.repsMax >= i.repsMin, 'reps_range'),
    )
    .min(1)
    .max(GYM_LIMITS.routineItems),
});
const mapRoutine = (r: { id: string; name: string; items: unknown; updated_at: Date }): GymRoutine => ({ id: r.id, name: r.name, items: r.items as GymRoutine['items'], updatedAt: r.updated_at.toISOString() });
const cleanItems = (items: z.infer<typeof routineBody>['items']) =>
  items.map((i) => ({ exerciseId: i.exerciseId ?? null, exerciseName: i.exerciseName.replace(/\s+/g, ' '), sets: i.sets, repsMin: i.repsMin, repsMax: i.repsMax, restS: i.restS ?? null }));

gymPatient.get('/gym/routines', async (c) => {
  const { user, patient } = requirePatient(c);
  const rows = await withUser(user.id, async (tx) => (await tx.query('SELECT * FROM gym_routines WHERE patient_id = $1 ORDER BY updated_at DESC', [patient.id])).rows);
  return c.json(rows.map(mapRoutine));
});

gymPatient.post('/gym/routines', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(routineBody, await c.req.json());
  const row = await withUser(user.id, async (tx) => {
    const n = (await tx.query('SELECT count(*)::int AS n FROM gym_routines WHERE patient_id = $1', [patient.id])).rows[0].n as number;
    if (n >= 30) throw badRequest('too_many_routines');
    return (await tx.query('INSERT INTO gym_routines (patient_id, name, items) VALUES ($1, $2, $3) RETURNING *', [patient.id, b.name, JSON.stringify(cleanItems(b.items))])).rows[0];
  });
  return c.json(mapRoutine(row), 201);
});

gymPatient.put('/gym/routines/:rid', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('rid'));
  const b = parse(routineBody, await c.req.json());
  const row = await withUser(user.id, async (tx) =>
    (await tx.query('UPDATE gym_routines SET name = $3, items = $4, updated_at = now() WHERE id = $1 AND patient_id = $2 RETURNING *', [id, patient.id, b.name, JSON.stringify(cleanItems(b.items))])).rows[0],
  );
  if (!row) throw notFound();
  return c.json(mapRoutine(row));
});

gymPatient.delete('/gym/routines/:rid', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('rid'));
  const n = await withUser(user.id, async (tx) => (await tx.query('DELETE FROM gym_routines WHERE id = $1 AND patient_id = $2', [id, patient.id])).rowCount);
  if (!n) throw notFound();
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- staff (in the practice)
async function staffPatient(tx: Tx, id: string) {
  const ok = (await tx.query('SELECT app.can_manage_patient($1) AS ok', [id])).rows[0].ok;
  if (!ok) throw notFound();
}

gymStaff.get('/:id/gym', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      await staffPatient(tx, id);
      const shared = (await tx.query("SELECT app.staff_sees_module($1, 'kracht') AS s", [id])).rows[0].s as boolean;
      return { ...(await load(tx, id, user.id)), sharedByPatient: shared };
    }),
  );
});

gymStaff.post('/:id/gym/sets', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(setBody, await c.req.json());
  return c.json(
    await withUser(user.id, async (tx) => {
      await staffPatient(tx, id);
      return addSet(tx, id, b, 'practice');
    }),
    201,
  );
});

gymStaff.delete('/:id/gym/sets/:setId', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const setId = parse(uuidParam, c.req.param('setId'));
  await withUser(user.id, async (tx) => {
    const r = await tx.query('DELETE FROM gym_sets WHERE id = $1 AND patient_id = $2', [setId, id]);
    if (!r.rowCount) throw notFound();
  });
  return c.json({ ok: true });
});
