import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requirePatient, requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { audit } from '../lib/audit';
import { notifyPatientMeasure } from '../lib/notify';
import { MOBILITY_TEST_KEYS, roundCm, validMobilityValue, type MobilityResult } from '../../../shared/mobilityTests';

/** Mobility self-tests (migration 033). Patients log their own; staff read them when shared. */
export const mobilityPatient = new Hono<AppEnv>();
export const mobilityStaff = new Hono<AppEnv>();

async function load(tx: Tx, patientId: string) {
  const { rows } = await tx.query(
    `SELECT id, test, side, to_char(day, 'YYYY-MM-DD') AS day, cm FROM mobility_tests
      WHERE patient_id = $1 AND day > now()::date - 730 ORDER BY day, test, side`,
    [patientId],
  );
  return rows.map((r) => ({ id: r.id as string, test: r.test, side: r.side, day: r.day as string, cm: Number(r.cm) })) as (MobilityResult & { id: string })[];
}

mobilityPatient.get('/mobility-tests', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(await withUser(user.id, async (tx) => ({ results: await load(tx, patient.id) })));
});

const body = z.object({
  test: z.enum(MOBILITY_TEST_KEYS),
  // One or two sides at once; a later result on the same day replaces the earlier one.
  values: z.array(z.object({ side: z.enum(['left', 'right', 'none']), cm: z.number() })).min(1).max(2),
});

mobilityPatient.post('/mobility-tests', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(body, await c.req.json());
  if (new Set(b.values.map((v) => v.side)).size !== b.values.length) throw badRequest('duplicate_side');
  for (const v of b.values) if (!validMobilityValue(b.test, v.side, v.cm)) throw badRequest('invalid_value');
  return c.json(
    await withUser(user.id, async (tx) => {
      for (const v of b.values) {
        await tx.query(
          `INSERT INTO mobility_tests(patient_id, practice_id, test, side, day, cm)
           VALUES ($1, app.patient_practice($1), $2, $3, now()::date, $4)
           ON CONFLICT (patient_id, test, side, day) DO UPDATE SET cm = EXCLUDED.cm, created_at = now()`,
          [patient.id, b.test, v.side, roundCm(v.cm)],
        );
      }
      return { results: await load(tx, patient.id) };
    }),
    201,
  );
});

mobilityPatient.delete('/mobility-tests/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    const r = await tx.query('DELETE FROM mobility_tests WHERE id = $1 AND patient_id = $2', [id, patient.id]);
    if (!r.rowCount) throw notFound();
  });
  return c.json({ ok: true });
});

/** Staff: the patient's results when the patient shares the mobility part; otherwise empty. */
mobilityStaff.get('/:id/mobility-tests', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const ok = (await tx.query('SELECT app.can_manage_patient($1) AS ok', [id])).rows[0].ok;
      if (!ok) throw notFound();
      const shared = (await tx.query("SELECT app.staff_sees_module($1, 'mobiliteit') AS s", [id])).rows[0].s as boolean;
      return { results: shared ? await load(tx, id) : [], sharedByPatient: shared };
    }),
  );
});

/** Staff ask the patient to measure (a notification with a link). Works whether or not mobility is shared. */
mobilityStaff.post('/:id/mobility-tests/request', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(z.object({ note: z.string().trim().max(200).default('') }), await c.req.json().catch(() => ({})));
  return c.json(
    await withUser(user.id, async (tx) => {
      const p = (await tx.query('SELECT id, practice_id FROM patients WHERE id = $1 AND archived_at IS NULL AND app.can_manage_patient(id)', [id])).rows[0];
      if (!p) throw notFound();
      const delivered = await notifyPatientMeasure(tx, p.id, p.practice_id, b.note);
      await audit(tx, user.id, p.practice_id, 'create', 'mobility_measure_requested', p.id, {});
      return { ok: true, delivered };
    }),
  );
});
