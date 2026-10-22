import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { importLibrary, libraryFileSchema, linkSharedVideos } from '../src/lib/libraryImport';

/**
 * Loads the Functional Performance library (seed-data/fp-library.json) into the demo practice,
 * once: if that practice already has imported exercises, only missing library videos are linked.
 * Later versions of the file are imported by the practice itself (Praktijk → Instellingen).
 */
export async function importFpLibrary(ownerUrl: string, slug = 'functional-performance-demo') {
  const db = new pg.Client({ connectionString: ownerUrl });
  await db.connect();
  try {
    const p = (await db.query(
      `SELECT p.id, (SELECT user_id FROM practice_members m WHERE m.practice_id = p.id AND m.role = 'owner' ORDER BY created_at LIMIT 1) AS owner,
              (SELECT count(*)::int FROM exercises e WHERE e.practice_id = p.id AND e.source_key IS NOT NULL) AS imported
         FROM practices p WHERE p.slug = $1`,
      [slug],
    )).rows[0];
    if (!p) return null;
    if (!p.imported) {
      const file = libraryFileSchema.parse(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'seed-data/fp-library.json'), 'utf8')));
      await db.query('BEGIN');
      try {
        const r = await importLibrary(db, p.id, p.owner, file);
        await db.query('COMMIT');
        console.log(`[library] imported ${r.exercises} exercises and ${r.templates} templates into ${slug}`);
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }
    }
    const linked = await linkSharedVideos(db);
    if (linked) console.log(`[library] linked ${linked} library videos`);
    return p.id as string;
  } finally {
    await db.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await importFpLibrary(process.env.DATABASE_OWNER_URL!);
}
