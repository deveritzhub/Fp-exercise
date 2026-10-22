import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requireStaff, requireUser, type AppEnv } from '../middleware';
import { parse, uuidParam, nullableInt } from '../lib/validate';
import { audit } from '../lib/audit';
import { notFound, badRequest } from '../lib/errors';
import { uuid } from '../lib/crypto';
import { BODY_REGIONS, EQUIPMENT, MOVEMENT_CATEGORIES, TRAINING_CATEGORIES, isKey } from '../../../shared/taxonomy';

export const exercises = new Hono<AppEnv>();

export function mapExercise(r: Record<string, any>, opts: { includeNotes?: boolean } = {}) {
  return {
    id: r.id,
    practiceId: r.practice_id,
    scope: r.practice_id ? 'practice' : 'global',
    nameNl: r.name_nl,
    nameEn: r.name_en,
    altNames: r.alt_names,
    bodyRegion: r.body_region,
    targetMuscles: r.target_muscles,
    movementCategory: r.movement_category,
    trainingCategories: r.training_categories,
    equipment: r.equipment,
    difficulty: r.difficulty,
    startingPositionNl: r.starting_position_nl,
    startingPositionEn: r.starting_position_en,
    movementNl: r.movement_nl,
    movementEn: r.movement_en,
    instructionsNl: r.instructions_nl,
    instructionsEn: r.instructions_en,
    defaults: {
      sets: r.default_sets,
      reps: r.default_reps,
      holdS: r.default_hold_s,
      restS: r.default_rest_s,
      tempo: r.default_tempo,
      frequency: r.default_frequency,
    },
    tags: r.tags,
    videoMediaId: r.video_media_id,
    thumbnailMediaId: r.thumbnail_media_id,
    reviewStatus: r.review_status,
    favorite: r.favorite ?? false,
    createdBy: r.created_by,
    updatedAt: r.updated_at,
    archived: !!r.archived_at,
    ...(opts.includeNotes ? { clinicalNotes: r.clinical_notes ?? '' } : {}),
  };
}

/** Build a prefix tsquery; taxonomy labels in either language expand to their stored keys. */
export function buildTsQuery(q: string): string | null {
  const words = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2)
    .slice(0, 8);
  if (!words.length) return null;
  const all = [...BODY_REGIONS, ...TRAINING_CATEGORIES, ...MOVEMENT_CATEGORIES, ...EQUIPMENT];
  const groups = words.map((w) => {
    const alts = new Set<string>([`${w}:*`]);
    for (const l of all) {
      const nl = l.nl.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const en = l.en.toLowerCase();
      if (nl.includes(w) || en.includes(w)) alts.add('(' + l.key.split('_').join(' & ') + ')');
    }
    return '(' + [...alts].join(' | ') + ')';
  });
  return groups.join(' & ');
}

const listQuery = z.object({
  q: z.string().max(100).optional().default(''),
  region: z.string().max(40).optional(),
  category: z.string().max(40).optional(),
  equipment: z.string().max(40).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  scope: z.enum(['all', 'global', 'practice', 'favorites', 'mine']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(48),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

exercises.get('/', async (c) => {
  const user = requireUser(c);
  const f = parse(listQuery, c.req.query());
  const tsq = buildTsQuery(f.q);
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT e.*, (fav.user_id IS NOT NULL) AS favorite, count(*) OVER() AS total,
                ${tsq ? "ts_rank(e.search, to_tsquery('simple', $1))" : '0'} AS rank
           FROM exercises e
           LEFT JOIN exercise_favorites fav ON fav.exercise_id = e.id AND fav.user_id = app.uid()
          WHERE e.archived_at IS NULL
            AND ($1::text IS NULL OR e.search @@ to_tsquery('simple', $1)
                 OR e.name_nl ILIKE '%' || $8 || '%' OR e.name_en ILIKE '%' || $8 || '%'
                 OR array_to_string(e.alt_names, ' ') ILIKE '%' || $8 || '%')
            AND ($2::text IS NULL OR e.body_region = $2)
            AND ($3::text IS NULL OR $3 = ANY(e.training_categories) OR e.movement_category = $3)
            AND ($4::text IS NULL OR $4 = ANY(e.equipment))
            AND ($5::int IS NULL OR e.difficulty = $5)
            AND ($9 = 'all'
                 OR ($9 = 'global' AND e.practice_id IS NULL)
                 OR ($9 = 'practice' AND e.practice_id IS NOT NULL)
                 OR ($9 = 'mine' AND e.created_by = app.uid())
                 OR ($9 = 'favorites' AND fav.user_id IS NOT NULL))
          ORDER BY rank DESC, e.name_nl
          LIMIT $6 OFFSET $7`,
        [tsq, f.region ?? null, f.category ?? null, f.equipment ?? null, f.difficulty ?? null, f.limit, f.offset, f.q.trim().slice(0, 60), f.scope],
      );
      return { items: rows.map((r) => mapExercise(r)), total: rows[0]?.total ?? 0 };
    }),
  );
});

async function loadExercise(tx: Tx, id: string, includeNotes: boolean) {
  const { rows } = await tx.query(
    `SELECT e.*, (fav.user_id IS NOT NULL) AS favorite, n.notes AS clinical_notes
       FROM exercises e
       LEFT JOIN exercise_favorites fav ON fav.exercise_id = e.id AND fav.user_id = app.uid()
       LEFT JOIN exercise_clinical_notes n ON n.exercise_id = e.id
      WHERE e.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const rel = await tx.query(
    `SELECT r.kind, x.id, x.name_nl, x.name_en, x.difficulty, x.thumbnail_media_id, x.body_region
       FROM exercise_relations r JOIN exercises x ON x.id = r.related_id
      WHERE r.exercise_id = $1 AND x.archived_at IS NULL ORDER BY x.difficulty`,
    [id],
  );
  return {
    ...mapExercise(rows[0], { includeNotes }),
    relations: rel.rows.map((r) => ({
      kind: r.kind,
      id: r.id,
      nameNl: r.name_nl,
      nameEn: r.name_en,
      difficulty: r.difficulty,
      thumbnailMediaId: r.thumbnail_media_id,
      bodyRegion: r.body_region,
    })),
  };
}

exercises.get('/:id', async (c) => {
  const user = requireUser(c);
  const id = parse(uuidParam, c.req.param('id'));
  const ex = await withUser(user.id, (tx) => loadExercise(tx, id, user.memberships.length > 0));
  if (!ex) throw notFound();
  return c.json(ex);
});

const keyArray = (kind: 'training' | 'equipment') =>
  z.array(z.string()).max(12).refine((a) => a.every((k) => isKey(kind, k)), 'unknown_key');

const exerciseBody = z.object({
  nameNl: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  altNames: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  bodyRegion: z.string().refine((k) => isKey('region', k), 'unknown_region'),
  targetMuscles: z.array(z.string().trim().min(1).max(80)).max(15).default([]),
  movementCategory: z.string().refine((k) => isKey('movement', k), 'unknown_movement').nullable().optional(),
  trainingCategories: keyArray('training').default([]),
  equipment: keyArray('equipment').default([]),
  difficulty: z.number().int().min(1).max(5).default(2),
  startingPositionNl: z.string().max(3000).default(''),
  startingPositionEn: z.string().max(3000).default(''),
  movementNl: z.string().max(3000).default(''),
  movementEn: z.string().max(3000).default(''),
  instructionsNl: z.string().max(3000).default(''),
  instructionsEn: z.string().max(3000).default(''),
  defaults: z
    .object({
      sets: nullableInt(1, 20),
      reps: nullableInt(1, 200),
      holdS: nullableInt(1, 600),
      restS: nullableInt(0, 900),
      tempo: z.string().max(20).nullable().optional(),
      frequency: z.string().max(80).nullable().optional(),
    })
    .default({}),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  clinicalNotes: z.string().max(5000).default(''),
  videoMediaId: z.string().uuid().nullable().optional(),
  thumbnailMediaId: z.string().uuid().nullable().optional(),
  relations: z
    .array(z.object({ kind: z.enum(['regression', 'progression', 'alternative']), id: z.string().uuid() }))
    .max(20)
    .optional(),
});

async function assertMediaKind(tx: Tx, id: string | null | undefined, kind: 'video' | 'image', practiceId: string) {
  if (!id) return;
  const { rows } = await tx.query('SELECT kind, practice_id FROM media WHERE id = $1', [id]);
  if (!rows[0] || rows[0].kind !== kind || (rows[0].practice_id && rows[0].practice_id !== practiceId)) {
    throw badRequest('invalid_media');
  }
}

async function writeRelations(tx: Tx, exerciseId: string, practiceId: string, rels: { kind: string; id: string }[]) {
  await tx.query('DELETE FROM exercise_relations WHERE exercise_id = $1 AND practice_id = $2', [exerciseId, practiceId]);
  for (const r of rels) {
    if (r.id === exerciseId) continue;
    const vis = await tx.query('SELECT 1 FROM exercises WHERE id = $1', [r.id]);
    if (!vis.rowCount) throw badRequest('invalid_relation');
    await tx.query(
      'INSERT INTO exercise_relations(exercise_id, related_id, kind, practice_id) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [exerciseId, r.id, r.kind, practiceId],
    );
  }
}

exercises.post('/', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const b = parse(exerciseBody, await c.req.json());
  const id = uuid();
  await withUser(user.id, async (tx) => {
    await assertMediaKind(tx, b.videoMediaId, 'video', practiceId);
    await assertMediaKind(tx, b.thumbnailMediaId, 'image', practiceId);
    await tx.query(
      `INSERT INTO exercises(id, practice_id, created_by, name_nl, name_en, alt_names, body_region, target_muscles,
         movement_category, training_categories, equipment, difficulty, starting_position_nl, starting_position_en,
         movement_nl, movement_en, instructions_nl, instructions_en, default_sets, default_reps, default_hold_s,
         default_rest_s, default_tempo, default_frequency, tags, video_media_id, thumbnail_media_id)
       VALUES ($1,$2,app.uid(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
      [
        id, practiceId, b.nameNl, b.nameEn, b.altNames, b.bodyRegion, b.targetMuscles, b.movementCategory ?? null,
        b.trainingCategories, b.equipment, b.difficulty, b.startingPositionNl, b.startingPositionEn, b.movementNl,
        b.movementEn, b.instructionsNl, b.instructionsEn, b.defaults.sets ?? null, b.defaults.reps ?? null,
        b.defaults.holdS ?? null, b.defaults.restS ?? null, b.defaults.tempo ?? null, b.defaults.frequency ?? null,
        b.tags, b.videoMediaId ?? null, b.thumbnailMediaId ?? null,
      ],
    );
    await tx.query('INSERT INTO exercise_clinical_notes(exercise_id, practice_id, notes) VALUES ($1,$2,$3)', [id, practiceId, b.clinicalNotes]);
    if (b.relations) await writeRelations(tx, id, practiceId, b.relations);
    await audit(tx, user.id, practiceId, 'create', 'exercise', id);
  });
  return c.json({ id }, 201);
});

exercises.patch('/:id', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(exerciseBody, await c.req.json());
  await withUser(user.id, async (tx) => {
    const cur = await tx.query('SELECT practice_id FROM exercises WHERE id = $1', [id]);
    if (!cur.rows[0]) throw notFound();
    if (cur.rows[0].practice_id !== practiceId) throw badRequest('global_exercise_readonly');
    await assertMediaKind(tx, b.videoMediaId, 'video', practiceId);
    await assertMediaKind(tx, b.thumbnailMediaId, 'image', practiceId);
    const r = await tx.query(
      `UPDATE exercises SET name_nl=$2, name_en=$3, alt_names=$4, body_region=$5, target_muscles=$6, movement_category=$7,
         training_categories=$8, equipment=$9, difficulty=$10, starting_position_nl=$11, starting_position_en=$12,
         movement_nl=$13, movement_en=$14, instructions_nl=$15, instructions_en=$16, default_sets=$17, default_reps=$18,
         default_hold_s=$19, default_rest_s=$20, default_tempo=$21, default_frequency=$22, tags=$23,
         video_media_id=$24, thumbnail_media_id=$25
       WHERE id = $1`,
      [
        id, b.nameNl, b.nameEn, b.altNames, b.bodyRegion, b.targetMuscles, b.movementCategory ?? null, b.trainingCategories,
        b.equipment, b.difficulty, b.startingPositionNl, b.startingPositionEn, b.movementNl, b.movementEn, b.instructionsNl,
        b.instructionsEn, b.defaults.sets ?? null, b.defaults.reps ?? null, b.defaults.holdS ?? null, b.defaults.restS ?? null,
        b.defaults.tempo ?? null, b.defaults.frequency ?? null, b.tags, b.videoMediaId ?? null, b.thumbnailMediaId ?? null,
      ],
    );
    if (!r.rowCount) throw notFound(); // RLS: not creator and not practice admin
    await tx.query(
      `INSERT INTO exercise_clinical_notes(exercise_id, practice_id, notes) VALUES ($1,$2,$3)
       ON CONFLICT (exercise_id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now()`,
      [id, practiceId, b.clinicalNotes],
    );
    if (b.relations) await writeRelations(tx, id, practiceId, b.relations);
    await audit(tx, user.id, practiceId, 'update', 'exercise', id);
  });
  return c.json({ ok: true });
});

exercises.post('/:id/archive', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    const r = await tx.query('UPDATE exercises SET archived_at = now() WHERE id = $1 AND practice_id = $2', [id, practiceId]);
    if (!r.rowCount) throw notFound();
    await audit(tx, user.id, practiceId, 'archive', 'exercise', id);
  });
  return c.json({ ok: true });
});

exercises.post('/:id/favorite', async (c) => {
  const user = requireUser(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    const vis = await tx.query('SELECT 1 FROM exercises WHERE id = $1', [id]);
    if (!vis.rowCount) throw notFound();
    await tx.query('INSERT INTO exercise_favorites(user_id, exercise_id) VALUES (app.uid(), $1) ON CONFLICT DO NOTHING', [id]);
  });
  return c.json({ ok: true });
});

exercises.delete('/:id/favorite', async (c) => {
  const user = requireUser(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, (tx) => tx.query('DELETE FROM exercise_favorites WHERE user_id = app.uid() AND exercise_id = $1', [id]));
  return c.json({ ok: true });
});
