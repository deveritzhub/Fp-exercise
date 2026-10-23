import 'dotenv/config';
import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { EXERCISE_TEXTS } from './seed-data/exercise-texts';

/**
 * Fills in starting position, execution and target muscles of the FP library exercises (by source_key)
 * where they are still empty. Never overwrites text that is already there; safe to run on every start.
 *   npm run db:complete-exercises
 */
export async function completeExerciseTexts(ownerUrl: string) {
  const db = new pg.Client({ connectionString: ownerUrl });
  await db.connect();
  let n = 0;
  try {
    for (const [key, t] of Object.entries(EXERCISE_TEXTS)) {
      const r = await db.query(
        `UPDATE exercises SET
           starting_position_nl = CASE WHEN coalesce(starting_position_nl, '') = '' THEN $2 ELSE starting_position_nl END,
           starting_position_en = CASE WHEN coalesce(starting_position_en, '') = '' THEN $3 ELSE starting_position_en END,
           movement_nl = CASE WHEN coalesce(movement_nl, '') = '' AND $4::text IS NOT NULL THEN $4 ELSE movement_nl END,
           movement_en = CASE WHEN coalesce(movement_en, '') = '' AND $5::text IS NOT NULL THEN $5 ELSE movement_en END,
           target_muscles = CASE WHEN cardinality(target_muscles) = 0 AND $6::text[] IS NOT NULL THEN $6 ELSE target_muscles END
         WHERE source_key = $1 AND (
           coalesce(starting_position_nl, '') = '' OR coalesce(starting_position_en, '') = ''
           OR ($4::text IS NOT NULL AND coalesce(movement_nl, '') = '') OR ($5::text IS NOT NULL AND coalesce(movement_en, '') = '')
           OR ($6::text[] IS NOT NULL AND cardinality(target_muscles) = 0))`,
        [key, t.start[0], t.start[1], t.move?.[0] ?? null, t.move?.[1] ?? null, t.muscles ?? null],
      );
      n += r.rowCount ?? 0;
    }
  } finally {
    await db.end();
  }
  console.log(`[library] completed texts of ${n} exercises`);
  return n;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  completeExerciseTexts(process.env.DATABASE_OWNER_URL!).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
