import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam, nullableInt } from '../lib/validate';
import { audit } from '../lib/audit';
import { badRequest, notFound } from '../lib/errors';
import { uuid } from '../lib/crypto';
import { notifyPatientUser } from '../lib/notify';

export const programs = new Hono<AppEnv>();

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  exerciseId: z.string().uuid(),
  alternativeExerciseId: z.string().uuid().nullable().optional(),
  sets: nullableInt(1, 20),
  reps: nullableInt(1, 200),
  holdS: nullableInt(1, 600),
  restS: nullableInt(0, 900),
  tempo: z.string().trim().max(20).nullable().optional(),
  load: z.string().trim().max(60).nullable().optional(),
  frequency: z.string().trim().max(80).nullable().optional(),
  days: z.array(z.number().int().min(1).max(7)).min(1).max(7).default([1, 2, 3, 4, 5, 6, 7]),
  notes: z.string().max(2000).default(''),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const programFields = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().max(4000).default(''),
  patientInstructions: z.string().max(4000).default(''),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  items: z.array(itemSchema).max(60),
});
const refineDates = <T extends { startDate?: string | null; endDate?: string | null }>(v: T) =>
  !v.startDate || !v.endDate || v.endDate >= v.startDate;

/**
 * What a patient may see of a programme. The description, criteria, evidence, warnings and
 * indication are the therapist's clinical notes and never leave the staff side.
 */
export function patientProgram(r: Record<string, any>) {
  const { description: _d, criteria: _c, evidence: _e, warnings: _w, indication: _i, ...rest } = mapProgram(r);
  return rest;
}

export function mapProgram(r: Record<string, any>) {
  return {
    id: r.id,
    practiceId: r.practice_id,
    patientId: r.patient_id,
    isTemplate: r.is_template,
    scope: r.is_template ? (r.practice_id ? 'practice' : 'global') : 'patient',
    title: r.title,
    description: r.description,
    patientInstructions: r.patient_instructions,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date,
    version: r.version,
    activatedAt: r.activated_at,
    sourceTemplateId: r.source_template_id,
    module: r.module ?? 'revalidatie',
    series: r.series_key
      ? { key: r.series_key, title: r.series_title, phaseNo: r.phase_no, phaseCount: r.phase_count, phaseName: r.phase_name, weeks: r.phase_weeks, goal: r.phase_goal }
      : null,
    indication: r.indication ?? '',
    criteria: r.criteria ?? [],
    redFlags: r.red_flags ?? [],
    warnings: r.warnings ?? [],
    evidence: r.evidence ?? '',
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function loadItems(tx: Tx, programId: string) {
  const { rows } = await tx.query(
    `SELECT i.*, e.name_nl, e.name_en, e.body_region,
            coalesce(ov.thumbnail_media_id, e.thumbnail_media_id) AS thumbnail_media_id,
            coalesce(ov.video_media_id, e.video_media_id) AS video_media_id, e.difficulty,
            e.instructions_nl, e.instructions_en, e.starting_position_nl, e.starting_position_en,
            e.movement_nl, e.movement_en, e.equipment,
            alt.name_nl AS alt_name_nl, alt.name_en AS alt_name_en,
            EXISTS (SELECT 1 FROM exercise_relations r WHERE r.exercise_id = i.exercise_id AND r.related_id = i.alternative_exercise_id
                     AND r.kind = 'progression') AS alt_is_progression
       FROM program_items i JOIN exercises e ON e.id = i.exercise_id
       LEFT JOIN exercise_media_overrides ov ON ov.exercise_id = e.id AND ov.practice_id = i.practice_id
       LEFT JOIN exercises alt ON alt.id = i.alternative_exercise_id
      WHERE i.program_id = $1 ORDER BY i.position`,
    [programId],
  );
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    alternativeExerciseId: r.alternative_exercise_id,
    // A progression is never presented as the easier substitute (older programmes may still hold one).
    alternative: r.alternative_exercise_id && !r.alt_is_progression ? { nameNl: r.alt_name_nl, nameEn: r.alt_name_en } : null,
    position: r.position,
    sets: r.sets,
    reps: r.reps,
    holdS: r.hold_s,
    restS: r.rest_s,
    tempo: r.tempo,
    load: r.load,
    frequency: r.frequency,
    days: r.days,
    notes: r.notes,
    exercise: {
      id: r.exercise_id,
      nameNl: r.name_nl,
      nameEn: r.name_en,
      bodyRegion: r.body_region,
      thumbnailMediaId: r.thumbnail_media_id,
      videoMediaId: r.video_media_id,
      difficulty: r.difficulty,
      instructionsNl: r.instructions_nl,
      instructionsEn: r.instructions_en,
      startingPositionNl: r.starting_position_nl,
      startingPositionEn: r.starting_position_en,
      movementNl: r.movement_nl,
      movementEn: r.movement_en,
      equipment: r.equipment,
    },
  }));
}

async function assertExercisesVisible(tx: Tx, items: z.infer<typeof itemSchema>[], practiceId: string | null) {
  const ids = [...new Set(items.flatMap((i) => [i.exerciseId, i.alternativeExerciseId].filter(Boolean) as string[]))];
  if (!ids.length) return;
  // Under RLS this only returns exercises the actor may see; additionally a program may only use
  // global exercises or exercises from its own practice.
  const { rows } = await tx.query(
    'SELECT id FROM exercises WHERE id = ANY($1) AND archived_at IS NULL AND (practice_id IS NULL OR practice_id IS NOT DISTINCT FROM $2)',
    [ids, practiceId],
  );
  if (rows.length !== ids.length) throw badRequest('invalid_exercise');
  // The substitute is shown when an exercise does not work out, so it must never be a progression.
  const pairs = items.filter((i) => i.alternativeExerciseId);
  if (pairs.length) {
    const bad = await tx.query(
      `SELECT 1 FROM exercise_relations r JOIN unnest($1::uuid[], $2::uuid[]) AS x(ex, alt) ON r.exercise_id = x.ex AND r.related_id = x.alt
        WHERE r.kind = 'progression' LIMIT 1`,
      [pairs.map((i) => i.exerciseId), pairs.map((i) => i.alternativeExerciseId)],
    );
    if (bad.rows[0]) throw badRequest('alternative_is_progression');
  }
}

async function writeItems(tx: Tx, programId: string, practiceId: string | null, items: z.infer<typeof itemSchema>[]) {
  const existing = new Set((await tx.query('SELECT id FROM program_items WHERE program_id = $1', [programId])).rows.map((r) => r.id));
  const keep = items.map((i) => i.id).filter((id): id is string => !!id && existing.has(id));
  await tx.query('DELETE FROM program_items WHERE program_id = $1 AND NOT (id = ANY($2))', [programId, keep]);
  for (const [position, i] of items.entries()) {
    const vals = [
      i.exerciseId, i.alternativeExerciseId ?? null, position, i.sets ?? null, i.reps ?? null, i.holdS ?? null,
      i.restS ?? null, i.tempo || null, i.load || null, i.frequency || null, [...new Set(i.days)].sort(), i.notes,
    ];
    if (i.id && existing.has(i.id)) {
      await tx.query(
        `UPDATE program_items SET exercise_id=$2, alternative_exercise_id=$3, position=$4, sets=$5, reps=$6, hold_s=$7,
           rest_s=$8, tempo=$9, load=$10, frequency=$11, days=$12, notes=$13 WHERE id = $1`,
        [i.id, ...vals],
      );
    } else {
      await tx.query(
        `INSERT INTO program_items(id, program_id, practice_id, exercise_id, alternative_exercise_id, position, sets, reps,
           hold_s, rest_s, tempo, load, frequency, days, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [uuid(), programId, practiceId, ...vals],
      );
    }
  }
}

async function snapshot(tx: Tx, programId: string, changeNote: string) {
  const { rows } = await tx.query('SELECT * FROM programs WHERE id = $1', [programId]);
  const p = rows[0];
  const items = await loadItems(tx, programId);
  await tx.query(
    `INSERT INTO program_versions(program_id, practice_id, version, snapshot, change_note, created_by)
     VALUES ($1,$2,$3,$4,$5,app.uid())`,
    [
      programId,
      p.practice_id,
      p.version,
      {
        program: mapProgram(p),
        items: items.map(({ exercise, ...i }) => ({ ...i, exerciseName: { nl: exercise.nameNl, en: exercise.nameEn } })),
      },
      changeNote.slice(0, 300),
    ],
  );
}

export async function loadProgram(tx: Tx, id: string) {
  const { rows } = await tx.query(
    `SELECT p.*, (tf.user_id IS NOT NULL) AS favorite,
            pt.first_name AS patient_first_name, pt.last_name AS patient_last_name
       FROM programs p
       LEFT JOIN template_favorites tf ON tf.program_id = p.id AND tf.user_id = app.uid()
       LEFT JOIN patients pt ON pt.id = p.patient_id
      WHERE p.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  return {
    ...mapProgram(rows[0]),
    favorite: rows[0].favorite,
    patient: rows[0].patient_id
      ? { id: rows[0].patient_id, firstName: rows[0].patient_first_name, lastName: rows[0].patient_last_name }
      : null,
    items: await loadItems(tx, id),
    criteriaChecks: rows[0].is_template ? [] : await loadChecks(tx, id),
  };
}

/** Ticked criteria of a patient programme (staff only; RLS hides them from everybody else). */
async function loadChecks(tx: Tx, programId: string) {
  const { rows } = await tx.query(
    `SELECT c.item_key, c.label, c.note, c.checked_at, u.full_name
       FROM program_criteria_checks c LEFT JOIN users u ON u.id = c.checked_by
      WHERE c.program_id = $1 ORDER BY c.item_key`,
    [programId],
  );
  return rows.map((r) => ({ key: r.item_key, label: r.label, note: r.note, checkedAt: r.checked_at, checkedBy: r.full_name }));
}

// ---------------------------------------------------------------------------

programs.get('/templates', async (c) => {
  const { user } = requireStaff(c);
  const q = (c.req.query('q') ?? '').trim().slice(0, 80);
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT p.*, (tf.user_id IS NOT NULL) AS favorite,
                (SELECT count(*) FROM program_items i WHERE i.program_id = p.id) AS item_count,
                (SELECT array_agg(DISTINCT e.body_region) FROM program_items i JOIN exercises e ON e.id = i.exercise_id
                  WHERE i.program_id = p.id) AS regions
           FROM programs p
           LEFT JOIN template_favorites tf ON tf.program_id = p.id AND tf.user_id = app.uid()
          WHERE p.is_template AND p.status <> 'archived'
            AND ($1 = '' OR p.title ILIKE '%' || $1 || '%' OR p.description ILIKE '%' || $1 || '%')
          ORDER BY (tf.user_id IS NOT NULL) DESC, (p.practice_id IS NOT NULL) DESC, p.title`,
        [q],
      );
      return {
        items: rows.map((r) => ({ ...mapProgram(r), favorite: r.favorite, itemCount: r.item_count, regions: r.regions ?? [] })),
      };
    }),
  );
});

programs.get('/recent', async (c) => {
  const { user, practiceId } = requireStaff(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT p.*, pt.first_name, pt.last_name,
                (SELECT count(*) FROM program_items i WHERE i.program_id = p.id) AS item_count
           FROM programs p LEFT JOIN patients pt ON pt.id = p.patient_id
          WHERE p.practice_id = $1 AND p.created_by = app.uid() AND p.status <> 'archived'
          ORDER BY p.updated_at DESC LIMIT 8`,
        [practiceId],
      );
      return {
        items: rows.map((r) => ({
          ...mapProgram(r),
          itemCount: r.item_count,
          patient: r.patient_id ? { id: r.patient_id, firstName: r.first_name, lastName: r.last_name } : null,
        })),
      };
    }),
  );
});

programs.get('/:id', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const p = await withUser(user.id, (tx) => loadProgram(tx, id));
  if (!p) throw notFound();
  return c.json(p);
});

programs.get('/:id/versions', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const rows = await withUser(user.id, async (tx) =>
    (
      await tx.query(
        `SELECT v.version, v.change_note, v.created_at, v.snapshot, u.full_name AS author
           FROM program_versions v LEFT JOIN users u ON u.id = v.created_by
          WHERE v.program_id = $1 ORDER BY v.version DESC`,
        [id],
      )
    ).rows,
  );
  return c.json({
    items: rows.map((r) => ({ version: r.version, changeNote: r.change_note, createdAt: r.created_at, author: r.author, snapshot: r.snapshot })),
  });
});

const createBody = programFields
  .extend({
    patientId: z.string().uuid().nullable().optional(),
    isTemplate: z.boolean().default(false),
    status: z.enum(['draft', 'active']).default('draft'),
    sourceTemplateId: z.string().uuid().nullable().optional(),
  })
  .refine(refineDates, 'end_before_start')
  .refine((v) => v.isTemplate !== !!v.patientId, 'patient_xor_template');

programs.post('/', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const b = parse(createBody, await c.req.json());
  if (b.status === 'active' && !b.items.length) throw badRequest('program_empty');
  const id = uuid();
  await withUser(user.id, async (tx) => {
    let progPractice: string = practiceId;
    if (b.patientId) {
      const pt = await tx.query('SELECT practice_id, archived_at FROM patients WHERE id = $1', [b.patientId]);
      if (!pt.rows[0]) throw notFound('patient_not_found');
      if (pt.rows[0].archived_at) throw badRequest('patient_archived');
      progPractice = pt.rows[0].practice_id;
    }
    await assertExercisesVisible(tx, b.items, progPractice);
    await tx.query(
      `INSERT INTO programs(id, practice_id, patient_id, is_template, title, description, patient_instructions, status,
         start_date, end_date, source_template_id, created_by, activated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,app.uid(), CASE WHEN $8 = 'active' THEN now() END)`,
      [
        id, progPractice, b.patientId ?? null, b.isTemplate, b.title, b.description, b.patientInstructions,
        b.isTemplate ? 'active' : b.status, b.startDate ?? null, b.endDate ?? null, b.sourceTemplateId ?? null,
      ],
    );
    await writeItems(tx, id, progPractice, b.items);
    if (b.sourceTemplateId) {
      // A programme made from a phased template keeps its phase, criteria and red flags.
      await tx.query(
        `UPDATE programs p SET module = t.module, series_key = t.series_key, series_title = t.series_title, indication = t.indication,
                phase_no = t.phase_no, phase_count = t.phase_count, phase_name = t.phase_name, phase_weeks = t.phase_weeks,
                phase_goal = t.phase_goal, criteria = t.criteria, red_flags = t.red_flags, warnings = t.warnings, evidence = t.evidence
           FROM programs t WHERE p.id = $1 AND t.id = $2 AND t.is_template`,
        [id, b.sourceTemplateId],
      );
    }
    await snapshot(tx, id, 'created');
    if (b.patientId && b.status === 'active') await notifyPatientUser(tx, b.patientId, progPractice, 'program_assigned', b.title);
    await audit(tx, user.id, progPractice, 'create', b.isTemplate ? 'template' : 'program', id, { items: b.items.length, status: b.status });
  });
  return c.json({ id }, 201);
});

programs.put('/:id', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(programFields.extend({ changeNote: z.string().max(300).default('') }).refine(refineDates, 'end_before_start'), await c.req.json());
  await withUser(user.id, async (tx) => {
    const cur = await tx.query('SELECT * FROM programs WHERE id = $1', [id]);
    const p = cur.rows[0];
    if (!p) throw notFound();
    if (p.status === 'active' && !b.items.length) throw badRequest('program_empty');
    await assertExercisesVisible(tx, b.items, p.practice_id);
    const r = await tx.query(
      `UPDATE programs SET title=$2, description=$3, patient_instructions=$4, start_date=$5, end_date=$6,
         version = version + 1, updated_at = now() WHERE id = $1`,
      [id, b.title, b.description, b.patientInstructions, b.startDate ?? null, b.endDate ?? null],
    );
    if (!r.rowCount) throw notFound(); // RLS: not editable by this user
    await writeItems(tx, id, p.practice_id, b.items);
    await snapshot(tx, id, b.changeNote);
    if (p.patient_id && p.status === 'active') await notifyPatientUser(tx, p.patient_id, p.practice_id, 'program_updated', b.title);
    await audit(tx, user.id, p.practice_id, 'update', p.is_template ? 'template' : 'program', id, { version: p.version + 1, items: b.items.length });
  });
  return c.json({ ok: true });
});

/** Quick add from the library: append one exercise (with its dose) to an existing programme or template. */
programs.post('/:id/items', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const item = parse(itemSchema.omit({ id: true }), await c.req.json());
  const result = await withUser(user.id, async (tx) => {
    const cur = await tx.query('SELECT * FROM programs WHERE id = $1', [id]);
    const p = cur.rows[0];
    if (!p) throw notFound();
    if (p.status === 'archived' || p.status === 'completed') throw badRequest('program_closed');
    const items = (await loadItems(tx, id)).map((i) => ({
      id: i.id, exerciseId: i.exerciseId, alternativeExerciseId: i.alternativeExerciseId, sets: i.sets, reps: i.reps, holdS: i.holdS,
      restS: i.restS, tempo: i.tempo, load: i.load, frequency: i.frequency, days: i.days, notes: i.notes,
    }));
    if (items.length >= 60) throw badRequest('program_full');
    const next = [...items, item];
    await assertExercisesVisible(tx, [item], p.practice_id);
    const r = await tx.query('UPDATE programs SET version = version + 1, updated_at = now() WHERE id = $1', [id]);
    if (!r.rowCount) throw notFound(); // RLS: not editable by this user
    await writeItems(tx, id, p.practice_id, next);
    const name = (await tx.query('SELECT name_nl FROM exercises WHERE id = $1', [item.exerciseId])).rows[0]?.name_nl ?? '';
    await snapshot(tx, id, `Oefening toegevoegd: ${name}`.slice(0, 300));
    if (p.patient_id && p.status === 'active') await notifyPatientUser(tx, p.patient_id, p.practice_id, 'program_updated', p.title);
    await audit(tx, user.id, p.practice_id, 'update', p.is_template ? 'template' : 'program', id, { version: p.version + 1, added: item.exerciseId });
    return { items: next.length, notifiedPatient: !!(p.patient_id && p.status === 'active') };
  });
  return c.json(result, 201);
});

const checkKey = z.string().regex(/^\d{1,2}\.\d{1,2}$/);

/** Tick a criterion for the next phase (therapist, with name and date). Nothing moves automatically. */
programs.put('/:id/criteria/:key', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const key = parse(checkKey, c.req.param('key'));
  const b = parse(z.object({ note: z.string().trim().max(300).default('') }), await c.req.json().catch(() => ({})));
  const checks = await withUser(user.id, async (tx) => {
    const { rows } = await tx.query('SELECT practice_id, is_template, criteria FROM programs WHERE id = $1', [id]);
    const p = rows[0];
    if (!p) throw notFound();
    if (p.is_template) throw badRequest('not_a_patient_program');
    const [g, i] = key.split('.').map(Number);
    const item = p.criteria?.[g]?.items?.[i];
    if (!item) throw notFound('criterion_not_found');
    await tx.query(
      `INSERT INTO program_criteria_checks(program_id, practice_id, item_key, label, note, checked_by) VALUES ($1,$2,$3,$4,$5,app.uid())
       ON CONFLICT (program_id, item_key) DO UPDATE SET note = EXCLUDED.note, checked_by = app.uid(), checked_at = now()`,
      [id, p.practice_id, key, String(item.label).slice(0, 300), b.note],
    );
    await audit(tx, user.id, p.practice_id, 'check', 'criterion', id, { key });
    return loadChecks(tx, id);
  });
  return c.json({ items: checks });
});

programs.delete('/:id/criteria/:key', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const key = parse(checkKey, c.req.param('key'));
  const checks = await withUser(user.id, async (tx) => {
    const { rows } = await tx.query('SELECT practice_id FROM programs WHERE id = $1', [id]);
    if (!rows[0]) throw notFound();
    await tx.query('DELETE FROM program_criteria_checks WHERE program_id = $1 AND item_key = $2', [id, key]);
    await audit(tx, user.id, rows[0].practice_id, 'uncheck', 'criterion', id, { key });
    return loadChecks(tx, id);
  });
  return c.json({ items: checks });
});

/** The template of the next phase in the same series (practice templates first). */
programs.get('/:id/next-phase', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const next = await withUser(user.id, async (tx) => {
    const { rows } = await tx.query(
      `SELECT t.id, t.title, t.phase_name, t.phase_weeks FROM programs p
         JOIN programs t ON t.is_template AND t.series_key = p.series_key AND t.phase_no = p.phase_no + 1 AND t.status <> 'archived'
        WHERE p.id = $1 AND p.series_key IS NOT NULL
        ORDER BY (t.practice_id IS NOT NULL) DESC LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  });
  return c.json({ next: next && { id: next.id, title: next.title, phaseName: next.phase_name, weeks: next.phase_weeks } });
});

programs.post('/:id/status', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const { status } = parse(z.object({ status: z.enum(['draft', 'active', 'completed', 'archived']) }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const cur = await tx.query(
      'SELECT p.*, (SELECT count(*) FROM program_items i WHERE i.program_id = p.id) AS n FROM programs p WHERE id = $1',
      [id],
    );
    const p = cur.rows[0];
    if (!p) throw notFound();
    if (status === 'active' && !p.n) throw badRequest('program_empty');
    if (status === 'draft' && p.status !== 'draft') throw badRequest('invalid_transition');
    const r = await tx.query(
      `UPDATE programs SET status = $2, updated_at = now(),
         activated_at = CASE WHEN $2 = 'active' THEN coalesce(activated_at, now()) ELSE activated_at END
       WHERE id = $1`,
      [id, status],
    );
    if (!r.rowCount) throw notFound();
    if (status === 'active' && p.status !== 'active' && p.patient_id) {
      await notifyPatientUser(tx, p.patient_id, p.practice_id, 'program_assigned', p.title);
    }
    await audit(tx, user.id, p.practice_id, 'status', 'program', id, { from: p.status, to: status });
  });
  return c.json({ ok: true });
});

const duplicateBody = z.object({
  patientId: z.string().uuid().nullable().optional(),
  asTemplate: z.boolean().default(false),
  title: z.string().trim().min(2).max(160).optional(),
});

/** Duplicate a program/template: template -> patient program, program -> template, program -> other patient. */
programs.post('/:id/duplicate', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const srcId = parse(uuidParam, c.req.param('id'));
  const b = parse(duplicateBody, await c.req.json());
  if (!b.asTemplate && !b.patientId) throw badRequest('patient_or_template_required');
  const id = uuid();
  await withUser(user.id, async (tx) => {
    const src = await loadProgram(tx, srcId);
    if (!src) throw notFound();
    let target = practiceId;
    if (b.patientId) {
      const pt = await tx.query('SELECT practice_id FROM patients WHERE id = $1 AND archived_at IS NULL', [b.patientId]);
      if (!pt.rows[0]) throw notFound('patient_not_found');
      target = pt.rows[0].practice_id;
    }
    const items = src.items.map((i) => ({
      exerciseId: i.exerciseId,
      alternativeExerciseId: i.alternativeExerciseId,
      sets: i.sets,
      reps: i.reps,
      holdS: i.holdS,
      restS: i.restS,
      tempo: i.tempo,
      load: i.load,
      frequency: i.frequency,
      days: i.days,
      notes: i.notes,
    }));
    await assertExercisesVisible(tx, items, target);
    await tx.query(
      `INSERT INTO programs(id, practice_id, patient_id, is_template, title, description, patient_instructions, status,
         source_template_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,app.uid())`,
      [
        id, target, b.asTemplate ? null : b.patientId, b.asTemplate,
        b.title ?? (src.isTemplate ? src.title : `${src.title} (kopie)`),
        src.description, src.patientInstructions, b.asTemplate ? 'active' : 'draft', src.isTemplate ? src.id : src.sourceTemplateId,
      ],
    );
    await writeItems(tx, id, target, items);
    await snapshot(tx, id, src.isTemplate ? `from template v${src.version}` : `copy of ${srcId}`);
    await audit(tx, user.id, target, 'duplicate', 'program', id, { source: srcId });
  });
  return c.json({ id }, 201);
});

programs.delete('/:id', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    const r = await tx.query('DELETE FROM programs WHERE id = $1 RETURNING practice_id, is_template', [id]);
    if (!r.rowCount) throw notFound(); // RLS: only drafts / own templates can be deleted
    await audit(tx, user.id, r.rows[0].practice_id, 'delete', r.rows[0].is_template ? 'template' : 'program', id);
  });
  return c.json({ ok: true });
});

programs.post('/:id/favorite', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    const vis = await tx.query('SELECT 1 FROM programs WHERE id = $1 AND is_template', [id]);
    if (!vis.rowCount) throw notFound();
    await tx.query('INSERT INTO template_favorites(user_id, program_id) VALUES (app.uid(), $1) ON CONFLICT DO NOTHING', [id]);
  });
  return c.json({ ok: true });
});

programs.delete('/:id/favorite', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, (tx) => tx.query('DELETE FROM template_favorites WHERE user_id = app.uid() AND program_id = $1', [id]));
  return c.json({ ok: true });
});
