import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requireStaff, requireUser, type AppEnv } from '../middleware';
import { parse, uuidParam, nullableInt } from '../lib/validate';
import { audit } from '../lib/audit';
import { notFound, badRequest } from '../lib/errors';
import { uuid } from '../lib/crypto';
import { BODY_REGIONS, EQUIPMENT, MOVEMENT_CATEGORIES, TRAINING_CATEGORIES, isKey } from '../../../shared/taxonomy';
import { synonymsFor } from '../../../shared/synonyms';

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
    // A practice's own video/thumbnail (exercise_media_overrides) takes precedence over the library's.
    videoMediaId: r.ov_video ?? r.video_media_id,
    thumbnailMediaId: r.ov_thumb ?? r.thumbnail_media_id,
    practiceMedia: !!(r.ov_video || r.ov_thumb),
    // Clinical review is per practice: content counts as reviewed once a therapist of this practice approved it.
    reviewStatus: r.rv_at ? 'reviewed' : r.review_status,
    reviewedAt: r.rv_at ?? null,
    reviewedBy: r.rv_by ?? null,
    favorite: r.favorite ?? false,
    createdBy: r.created_by,
    updatedAt: r.updated_at,
    archived: !!r.archived_at,
    ...(opts.includeNotes ? { clinicalNotes: r.clinical_notes ?? '', physitrackId: r.physitrack_id ?? null, externalVideoUrl: r.external_video_url ?? null } : {}),
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
    // Everyday/clinical synonyms in both languages ("kuit" → calf, hielheffen; "bridge" → brug).
    for (const syn of synonymsFor(w)) if (/^[\p{L}\p{N}]+$/u.test(syn)) alts.add(`${syn}:*`);
    for (const l of all) {
      const nl = l.nl.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const en = l.en.toLowerCase();
      if (nl.includes(w) || en.includes(w)) alts.add('(' + l.key.split('_').join(' & ') + ')');
    }
    return '(' + [...alts].join(' | ') + ')';
  });
  return groups.join(' & ');
}

/** Practice whose media overrides apply: the active practice for staff, the patient's practice for patients. */
export function mediaPracticeId(c: Context<AppEnv>): string | null {
  const user = c.get('user');
  if (!user) return null;
  const wanted = c.req.header('x-practice-id');
  const m = (wanted && user.memberships.find((x) => x.practiceId === wanted)) || user.memberships[0];
  return m?.practiceId ?? user.patient?.practiceId ?? null;
}

/** Practice-specific layers on top of an exercise: own media and clinical review. */
export const OV_JOIN = (param: string) =>
  `LEFT JOIN exercise_media_overrides ov ON ov.exercise_id = e.id AND ov.practice_id = ${param}
   LEFT JOIN exercise_reviews rv ON rv.exercise_id = e.id AND rv.practice_id = ${param}
   LEFT JOIN users rvu ON rvu.id = rv.reviewed_by`;
export const OV_COLS =
  'ov.video_media_id AS ov_video, ov.thumbnail_media_id AS ov_thumb, rv.reviewed_at AS rv_at, rvu.full_name AS rv_by';

const NORM = (col: string) => `lower(regexp_replace(${col}, '[^[:alnum:]]', '', 'g'))`;
const VARIANT_COUNT = `(SELECT count(*) FROM exercises v WHERE v.id <> e.id AND v.archived_at IS NULL
   AND (${NORM('v.name_nl')} = ${NORM('e.name_nl')} OR ${NORM('v.name_en')} = ${NORM('e.name_en')}))::int`;

const listQuery = z.object({
  q: z.string().max(100).optional().default(''),
  region: z.string().max(40).optional(),
  category: z.string().max(40).optional(),
  equipment: z.string().max(40).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  // Legacy single filter (old links); the three filters below combine freely.
  scope: z.enum(['all', 'global', 'practice', 'favorites', 'mine', 'unreviewed', 'reviewed']).optional().default('all'),
  source: z.enum(['all', 'global', 'practice', 'mine']).optional().default('all'),
  review: z.enum(['all', 'reviewed', 'unreviewed']).optional().default('all'),
  favorites: z.enum(['0', '1']).optional().default('0'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(48),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

exercises.get('/', async (c) => {
  const user = requireUser(c);
  const f = parse(listQuery, c.req.query());
  const tsq = buildTsQuery(f.q);
  const source = ['global', 'practice', 'mine'].includes(f.scope) ? f.scope : f.source;
  const review = ['reviewed', 'unreviewed'].includes(f.scope) ? f.scope : f.review;
  const favorites = f.scope === 'favorites' || f.favorites === '1';
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT e.*, ${OV_COLS}, (fav.user_id IS NOT NULL) AS favorite, count(*) OVER() AS total, ${VARIANT_COUNT} AS variant_count,
                ${tsq ? "ts_rank(e.search, to_tsquery('simple', $1))" : '0'} AS rank
           FROM exercises e
           LEFT JOIN exercise_favorites fav ON fav.exercise_id = e.id AND fav.user_id = app.uid()
           ${OV_JOIN('$10::uuid')}
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
                 OR ($9 = 'mine' AND e.created_by = app.uid()))
            AND ($11 = 'all'
                 OR ($11 = 'unreviewed' AND rv.exercise_id IS NULL)
                 OR ($11 = 'reviewed' AND rv.exercise_id IS NOT NULL))
            AND (NOT $12 OR fav.user_id IS NOT NULL)
          ORDER BY ($8 <> '' AND (e.name_nl ILIKE $8 || '%' OR e.name_en ILIKE $8 || '%')) DESC,
                   ($8 <> '' AND (e.name_nl ILIKE '%' || $8 || '%' OR e.name_en ILIKE '%' || $8 || '%')) DESC,
                   rank DESC, e.name_nl
          LIMIT $6 OFFSET $7`,
        [tsq, f.region ?? null, f.category ?? null, f.equipment ?? null, f.difficulty ?? null, f.limit, f.offset, f.q.trim().slice(0, 60), source, mediaPracticeId(c), review, favorites],
      );
      return { items: rows.map((r) => ({ ...mapExercise(r), variantCount: r.variant_count })), total: rows[0]?.total ?? 0 };
    }),
  );
});

async function loadExercise(tx: Tx, id: string, includeNotes: boolean, practiceId: string | null) {
  const { rows } = await tx.query(
    `SELECT e.*, ${OV_COLS}, (fav.user_id IS NOT NULL) AS favorite, n.notes AS clinical_notes
       FROM exercises e
       LEFT JOIN exercise_favorites fav ON fav.exercise_id = e.id AND fav.user_id = app.uid()
       ${OV_JOIN('$2::uuid')}
       LEFT JOIN exercise_clinical_notes n ON n.exercise_id = e.id
      WHERE e.id = $1`,
    [id, practiceId],
  );
  if (!rows[0]) return null;
  const rel = await tx.query(
    `SELECT r.kind, x.id, x.name_nl, x.name_en, x.difficulty, x.body_region,
            coalesce(rov.thumbnail_media_id, x.thumbnail_media_id) AS thumbnail_media_id,
            coalesce(rov.video_media_id, x.video_media_id) AS video_media_id
       FROM exercise_relations r JOIN exercises x ON x.id = r.related_id
       LEFT JOIN exercise_media_overrides rov ON rov.exercise_id = x.id AND rov.practice_id = $2::uuid
      WHERE r.exercise_id = $1 AND x.archived_at IS NULL ORDER BY x.difficulty`,
    [id, practiceId],
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
      videoMediaId: r.video_media_id,
      bodyRegion: r.body_region,
    })),
  };
}

/**
 * Variants: other visible exercises with the same Dutch or English name (e.g. a central "Dead bug"
 * and a practice "Dead bug", or "Bilbrug" and "Bekkenbrug" = "Glute bridge"). Shown side by side
 * with their differences; nothing is merged or deleted.
 */
exercises.get('/:id/variants', async (c) => {
  const user = requireUser(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT e.*, ${OV_COLS}, (fav.user_id IS NOT NULL) AS favorite
           FROM exercises e JOIN exercises me ON me.id = $1
           LEFT JOIN exercise_favorites fav ON fav.exercise_id = e.id AND fav.user_id = app.uid()
           ${OV_JOIN('$2::uuid')}
          WHERE e.archived_at IS NULL AND (${NORM('e.name_nl')} = ${NORM('me.name_nl')} OR ${NORM('e.name_en')} = ${NORM('me.name_en')})
          ORDER BY e.id = $1 DESC, e.practice_id IS NULL, e.name_nl`,
        [id, mediaPracticeId(c)],
      );
      if (!rows.length) throw notFound();
      return { items: rows.map((r) => mapExercise(r)) };
    }),
  );
});

exercises.get('/:id', async (c) => {
  const user = requireUser(c);
  const id = parse(uuidParam, c.req.param('id'));
  const ex = await withUser(user.id, (tx) => loadExercise(tx, id, user.memberships.length > 0, mediaPracticeId(c)));
  if (!ex) throw notFound();
  return c.json(ex);
});

const keyArray = (kind: 'training' | 'equipment') =>
  z.array(z.string()).max(12).refine((a) => a.every((k) => isKey(kind, k)), 'unknown_key');

const exerciseBody = z.object({
  // W14: external references, stored only (no integration, no media copied).
  physitrackId: z.string().trim().max(80).nullable().optional(),
  externalVideoUrl: z.string().trim().max(500).regex(/^https:\/\//, 'https_only').nullable().optional().or(z.literal('').transform(() => null)),
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
         default_rest_s, default_tempo, default_frequency, tags, video_media_id, thumbnail_media_id, physitrack_id, external_video_url)
       VALUES ($1,$2,app.uid(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
      [
        id, practiceId, b.nameNl, b.nameEn, b.altNames, b.bodyRegion, b.targetMuscles, b.movementCategory ?? null,
        b.trainingCategories, b.equipment, b.difficulty, b.startingPositionNl, b.startingPositionEn, b.movementNl,
        b.movementEn, b.instructionsNl, b.instructionsEn, b.defaults.sets ?? null, b.defaults.reps ?? null,
        b.defaults.holdS ?? null, b.defaults.restS ?? null, b.defaults.tempo ?? null, b.defaults.frequency ?? null,
        b.tags, b.videoMediaId ?? null, b.thumbnailMediaId ?? null, b.physitrackId || null, b.externalVideoUrl || null,
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
         video_media_id=$24, thumbnail_media_id=$25, physitrack_id=$26, external_video_url=$27
       WHERE id = $1`,
      [
        id, b.nameNl, b.nameEn, b.altNames, b.bodyRegion, b.targetMuscles, b.movementCategory ?? null, b.trainingCategories,
        b.equipment, b.difficulty, b.startingPositionNl, b.startingPositionEn, b.movementNl, b.movementEn, b.instructionsNl,
        b.instructionsEn, b.defaults.sets ?? null, b.defaults.reps ?? null, b.defaults.holdS ?? null, b.defaults.restS ?? null,
        b.defaults.tempo ?? null, b.defaults.frequency ?? null, b.tags, b.videoMediaId ?? null, b.thumbnailMediaId ?? null,
        b.physitrackId || null, b.externalVideoUrl || null,
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

/**
 * Set the practice's own video/thumbnail for an exercise. For library (global) exercises this is
 * stored as a practice override; for the practice's own exercises the exercise itself is updated.
 */
exercises.put('/:id/media', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(z.object({ videoMediaId: z.string().uuid().nullable(), thumbnailMediaId: z.string().uuid().nullable() }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const cur = await tx.query('SELECT practice_id FROM exercises WHERE id = $1', [id]);
    if (!cur.rows[0]) throw notFound();
    await assertMediaKind(tx, b.videoMediaId, 'video', practiceId);
    await assertMediaKind(tx, b.thumbnailMediaId, 'image', practiceId);
    if (cur.rows[0].practice_id) {
      if (cur.rows[0].practice_id !== practiceId) throw notFound();
      const r = await tx.query('UPDATE exercises SET video_media_id = $2, thumbnail_media_id = $3 WHERE id = $1', [id, b.videoMediaId, b.thumbnailMediaId]);
      if (!r.rowCount) throw notFound();
    } else if (!b.videoMediaId && !b.thumbnailMediaId) {
      await tx.query('DELETE FROM exercise_media_overrides WHERE practice_id = $1 AND exercise_id = $2', [practiceId, id]);
    } else {
      await tx.query(
        `INSERT INTO exercise_media_overrides(practice_id, exercise_id, video_media_id, thumbnail_media_id, updated_by)
         VALUES ($1,$2,$3,$4,app.uid())
         ON CONFLICT (practice_id, exercise_id) DO UPDATE SET video_media_id = EXCLUDED.video_media_id,
           thumbnail_media_id = EXCLUDED.thumbnail_media_id, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [practiceId, id, b.videoMediaId, b.thumbnailMediaId],
      );
    }
    await audit(tx, user.id, practiceId, 'media', 'exercise', id, { video: !!b.videoMediaId, thumbnail: !!b.thumbnailMediaId });
  });
  return c.json({ ok: true });
});

/** A therapist of the active practice approves the exercise content for use in this practice. */
exercises.post('/:id/review', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(z.object({ note: z.string().trim().max(1000).default('') }), await c.req.json().catch(() => ({})));
  await withUser(user.id, async (tx) => {
    const ex = await tx.query('SELECT 1 FROM exercises WHERE id = $1', [id]);
    if (!ex.rowCount) throw notFound();
    await tx.query(
      `INSERT INTO exercise_reviews(practice_id, exercise_id, reviewed_by, note) VALUES ($1,$2,app.uid(),$3)
       ON CONFLICT (practice_id, exercise_id) DO UPDATE SET reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now(), note = EXCLUDED.note`,
      [practiceId, id, b.note],
    );
    await audit(tx, user.id, practiceId, 'review', 'exercise', id);
  });
  return c.json({ ok: true });
});

exercises.delete('/:id/review', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    await tx.query('DELETE FROM exercise_reviews WHERE practice_id = $1 AND exercise_id = $2', [practiceId, id]);
    await audit(tx, user.id, practiceId, 'unreview', 'exercise', id);
  });
  return c.json({ ok: true });
});
