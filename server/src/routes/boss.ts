import { Hono } from 'hono';
import { z } from 'zod';
import { isClinical } from '../../../shared/accountKind';
import { MOBILITY_TEST_KEYS } from '../../../shared/mobilityTests';
import { withUser } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { audit } from '../lib/audit';
import { ACL_SERIES_KEY } from '../../../shared/aclRoute';
import { refreshBosses } from '../lib/boss';
import { installAclRoute } from '../lib/aclInstall';
import { aclBoard, saveAclReadings } from '../lib/aclView';
import { previewAclSession, type AclSessionInput } from '../../../shared/aclSession';

export const bossProgram = new Hono<AppEnv>();
export const bossPatient = new Hono<AppEnv>();

const goalBody = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('outcome'),
    domain: z.enum(['rom', 'strength', 'function', 'confidence']),
    metric: z.string().trim().min(1).max(80),
    unit: z.enum(['degrees', 'kg', 'N', 'score_0_10', 'percent']),
    side: z.enum(['left', 'right', 'bilateral', 'not_applicable']).default('not_applicable'),
    comparator: z.enum(['gte', 'lte']),
    target: z.number().finite().min(0).max(100000),
    labelNl: z.string().trim().min(1).max(80),
    labelEn: z.string().trim().min(1).max(80),
  }),
  z.object({
    source: z.literal('mobility'),
    testKey: z.enum(MOBILITY_TEST_KEYS),
    side: z.enum(['left', 'right', 'none']).default('none'),
    comparator: z.enum(['gte', 'lte']),
    target: z.number().finite().min(-60).max(80),
    labelNl: z.string().trim().min(1).max(80),
    labelEn: z.string().trim().min(1).max(80),
  }),
]).superRefine((v, ctx) => {
  if (v.source === 'outcome' && v.unit === 'score_0_10' && v.target > 10) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'score above 10', path: ['target'] });
  if (v.source === 'outcome' && v.unit === 'percent' && v.target > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'percent above 100', path: ['target'] });
  if (v.source === 'outcome' && v.domain === 'rom' && v.unit !== 'degrees') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'rom unit', path: ['unit'] });
  if (v.source === 'outcome' && v.domain === 'strength' && v.unit !== 'kg' && v.unit !== 'N') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'strength unit', path: ['unit'] });
  if (v.source === 'outcome' && (v.domain === 'function' || v.domain === 'confidence') && v.unit !== 'score_0_10' && v.unit !== 'percent') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'score unit', path: ['unit'] });
});

function mapGoal(r: Record<string, unknown> | undefined) {
  if (!r) return null;
  return {
    programId: r.program_id,
    slot: Number(r.slot ?? 1),
    source: r.source,
    domain: r.domain,
    metric: r.metric,
    unit: r.unit,
    side: r.side,
    testKey: r.test_key,
    comparator: r.comparator,
    target: Number(r.target),
    labelNl: r.label_nl,
    labelEn: r.label_en,
    bossNl: r.boss_nl ?? '',
    bossEn: r.boss_en ?? '',
    clinicalNl: r.clinical_nl ?? '',
    clinicalEn: r.clinical_en ?? '',
    measureKey: r.measure_key,
    involvedSide: r.involved_side,
    mode: r.mode ?? 'value',
    defeatedAt: r.defeated_at,
  };
}

bossProgram.get('/:id/boss', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(await withUser(user.id, async (tx) => {
    const prog = (await tx.query('SELECT id, patient_id, is_template FROM programs WHERE id = $1', [id])).rows[0];
    if (!prog || prog.is_template || !prog.patient_id) throw notFound();
    const rows = (await tx.query('SELECT * FROM phase_boss_goals WHERE program_id = $1 ORDER BY slot', [id])).rows;
    return { goal: mapGoal(rows[0]), goals: rows.map((r) => mapGoal(r)) };
  }));
});

const criteriaPatch = z.object({
  phaseName: z.string().trim().min(1).max(60).optional(),
  criteria: z.array(z.object({
    slot: z.number().int().min(1).max(12),
    comparator: z.enum(['gte', 'lte', 'recorded']),
    target: z.number().finite().min(-60).max(100000),
    labelNl: z.string().trim().min(1).max(80),
    labelEn: z.string().trim().min(1).max(80),
    active: z.boolean().optional(),
  })).min(1).max(12),
});

bossProgram.put('/:id/boss', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const raw = await c.req.json();
  if (raw && typeof raw === 'object' && 'criteria' in raw) {
    const patch = parse(criteriaPatch, raw);
    return c.json(await withUser(user.id, async (tx) => {
      const prog = (await tx.query('SELECT id, patient_id, is_template FROM programs WHERE id = $1', [id])).rows[0];
      if (!prog || prog.is_template || !prog.patient_id) throw notFound();
      for (const row of patch.criteria) {
        const cur = (await tx.query('SELECT mode FROM phase_boss_goals WHERE program_id = $1 AND slot = $2', [id, row.slot])).rows[0];
        if (!cur) throw notFound();
        const comparator = cur.mode === 'recorded' ? 'recorded' : row.comparator === 'recorded' ? 'gte' : row.comparator;
        await tx.query(
          `UPDATE phase_boss_goals
              SET comparator = $3, target = $4, label_nl = $5, label_en = $6, active = $7,
                  defeated_at = NULL, notified_at = NULL
            WHERE program_id = $1 AND slot = $2`,
          [id, row.slot, comparator, row.target, row.labelNl, row.labelEn, row.active !== false],
        );
      }
      if (patch.phaseName) {
        await tx.query('UPDATE programs SET phase_name = $2, updated_at = now() WHERE id = $1 AND NOT is_template', [id, patch.phaseName]);
      }
      await tx.query('UPDATE phase_boss_goals SET notified_at = NULL WHERE program_id = $1', [id]);
      await audit(tx, user.id, (await tx.query('SELECT practice_id FROM programs WHERE id = $1', [id])).rows[0].practice_id, 'boss_goal', 'program', id, { slots: patch.criteria.length });
      await refreshBosses(tx, prog.patient_id);
      const rows = (await tx.query('SELECT * FROM phase_boss_goals WHERE program_id = $1 ORDER BY slot', [id])).rows;
      return { goal: mapGoal(rows[0]), goals: rows.map((r) => mapGoal(r)) };
    }));
  }
  const b = parse(goalBody, raw);
  return c.json(await withUser(user.id, async (tx) => {
    const prog = (await tx.query(
      `SELECT p.id, p.patient_id, p.practice_id, p.is_template, pr.kind
         FROM programs p JOIN practices pr ON pr.id = p.practice_id WHERE p.id = $1`,
      [id],
    )).rows[0];
    if (!prog || prog.is_template || !prog.patient_id) throw notFound();
    if (b.source === 'outcome' && !isClinical(prog.kind)) throw badRequest('clinical_measure');
    const keyed = await tx.query('SELECT 1 FROM phase_boss_goals WHERE program_id = $1 AND measure_key IS NOT NULL', [id]);
    if (keyed.rows[0]) throw badRequest('acl_goal');
    const values = b.source === 'outcome'
      ? [b.domain, b.metric, b.unit, b.side, null]
      : [null, null, 'cm', b.side, b.testKey];
    await tx.query(
      `INSERT INTO phase_boss_goals(practice_id, patient_id, program_id, source, domain, metric, unit, side, test_key, comparator, target, label_nl, label_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (program_id, slot) DO UPDATE SET
         source = EXCLUDED.source, domain = EXCLUDED.domain, metric = EXCLUDED.metric, unit = EXCLUDED.unit,
         side = EXCLUDED.side, test_key = EXCLUDED.test_key, comparator = EXCLUDED.comparator, target = EXCLUDED.target,
         label_nl = EXCLUDED.label_nl, label_en = EXCLUDED.label_en,
         defeated_at = NULL, notified_at = NULL`,
      [prog.practice_id, prog.patient_id, id, b.source, ...values, b.comparator, b.target, b.labelNl, b.labelEn],
    );
    await audit(tx, user.id, prog.practice_id, 'boss_goal', 'program', id, { source: b.source });
    await refreshBosses(tx, prog.patient_id);
    const rows = (await tx.query('SELECT * FROM phase_boss_goals WHERE program_id = $1 ORDER BY slot', [id])).rows;
    return { goal: mapGoal(rows[0]), goals: rows.map((r) => mapGoal(r)) };
  }));
});

bossPatient.get('/:id/acl-route', async (c) => {
  const { user } = requireStaff(c);
  const patientId = parse(uuidParam, c.req.param('id'));
  return c.json(await withUser(user.id, async (tx) => {
    const patient = (await tx.query('SELECT id FROM patients WHERE id = $1', [patientId])).rows[0];
    if (!patient) throw notFound();
    const rows = (await tx.query(
      `SELECT id, phase_no, phase_name, status FROM programs
        WHERE patient_id = $1 AND series_key = $2 AND NOT is_template ORDER BY phase_no`,
      [patientId, ACL_SERIES_KEY],
    )).rows;
    return { assigned: rows.length > 0, phases: rows.map((r) => ({ programId: r.id, no: Number(r.phase_no), name: r.phase_name, status: r.status })) };
  }));
});

bossPatient.post('/:id/acl-route', async (c) => {
  const { user } = requireStaff(c);
  const patientId = parse(uuidParam, c.req.param('id'));
  const b = parse(z.object({
    side: z.enum(['left', 'right']),
    surgeryOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    startOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  }), await c.req.json());
  return c.json(await withUser(user.id, async (tx) => {
    const patient = (await tx.query(
      `SELECT p.id, p.practice_id, pr.kind FROM patients p JOIN practices pr ON pr.id = p.practice_id WHERE p.id = $1`,
      [patientId],
    )).rows[0];
    if (!patient) throw notFound();
    if (!isClinical(patient.kind)) throw badRequest('clinical_measure');
    const made = await installAclRoute(tx, {
      practiceId: patient.practice_id, patientId, therapistId: user.id, side: b.side,
      surgeryOn: b.surgeryOn ?? null, startOn: b.startOn ?? null,
    });
    if (made.already) throw badRequest('already_assigned');
    await audit(tx, user.id, patient.practice_id, 'acl_route', 'patient', patientId, { side: b.side });
    await refreshBosses(tx, patientId);
    return { ok: true, programIds: made.programIds };
  }), 201);
});

const sidePair = z.object({ left: z.number().finite().optional(), right: z.number().finite().optional() }).partial();
const sessionBody = z.object({
  measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  device: z.string().trim().max(80).optional(),
  strengthUnit: z.enum(['kg', 'Nm']).optional(),
  extension: sidePair.optional(),
  flexion: sidePair.optional(),
  extensionLag: sidePair.optional(),
  effusion: sidePair.optional(),
  quad: sidePair.optional(),
  hamstring: sidePair.optional(),
  hopSingle: sidePair.optional(),
  hopTriple: sidePair.optional(),
  hopCrossover: sidePair.optional(),
  hopTimed: sidePair.optional(),
  aclRsi: z.number().finite().min(0).max(100).nullable().optional(),
});

async function sessionFor(tx: import('../db').Tx, patientId: string, body: AclSessionInput) {
  const patient = (await tx.query(
    `SELECT p.id, p.practice_id, pr.kind, COALESCE(r.side, 'right') AS side
       FROM patients p JOIN practices pr ON pr.id = p.practice_id
       LEFT JOIN acl_routes r ON r.patient_id = p.id
      WHERE p.id = $1`,
    [patientId],
  )).rows[0];
  if (!patient) throw notFound();
  if (!isClinical(patient.kind)) throw badRequest('clinical_measure');
  return { patient, preview: previewAclSession(body, patient.side === 'left' ? 'left' : 'right') };
}

bossPatient.get('/:id/acl-criteria', async (c) => {
  const { user } = requireStaff(c);
  const patientId = parse(uuidParam, c.req.param('id'));
  return c.json(await withUser(user.id, async (tx) => {
    const patient = (await tx.query('SELECT id FROM patients WHERE id = $1', [patientId])).rows[0];
    if (!patient) throw notFound();
    return aclBoard(tx, patientId);
  }));
});

bossPatient.post('/:id/acl-tests/preview', async (c) => {
  const { user } = requireStaff(c);
  const patientId = parse(uuidParam, c.req.param('id'));
  const body = parse(sessionBody, await c.req.json());
  return c.json(await withUser(user.id, async (tx) => {
    const { preview } = await sessionFor(tx, patientId, body);
    return { indexes: preview.indexes };
  }));
});

bossPatient.post('/:id/acl-tests', async (c) => {
  const { user } = requireStaff(c);
  const patientId = parse(uuidParam, c.req.param('id'));
  const body = parse(sessionBody, await c.req.json());
  return c.json(await withUser(user.id, async (tx) => {
    const { patient, preview } = await sessionFor(tx, patientId, body);
    if (!preview.readings.length) throw badRequest('empty_session');
    await saveAclReadings(tx, patientId, patient.practice_id, body.measuredOn, preview.readings);
    await refreshBosses(tx, patientId);
    await audit(tx, user.id, patient.practice_id, 'acl_tests', 'patient', patientId, { n: preview.readings.length });
    return { ok: true, indexes: preview.indexes, saved: preview.readings.length };
  }), 201);
});

bossPatient.post('/:id/mobility-tests/:testId/confirm', async (c) => {
  const { user } = requireStaff(c);
  const patientId = parse(uuidParam, c.req.param('id'));
  const testId = parse(uuidParam, c.req.param('testId'));
  return c.json(await withUser(user.id, async (tx) => {
    const test = (await tx.query('SELECT id, practice_id, patient_id FROM mobility_tests WHERE id = $1 AND patient_id = $2', [testId, patientId])).rows[0];
    if (!test) throw notFound();
    await tx.query(
      `INSERT INTO mobility_confirmations(test_id, practice_id, confirmed_by) VALUES ($1,$2,app.uid())
       ON CONFLICT (test_id) DO NOTHING`,
      [testId, test.practice_id],
    );
    await refreshBosses(tx, patientId);
    return { ok: true };
  }));
});
