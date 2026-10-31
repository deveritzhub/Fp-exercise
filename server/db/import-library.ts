import 'dotenv/config';
import pg from 'pg';
import { importLibrary, linkSharedVideos } from '../src/lib/libraryImport';
import { FP_BUNDLES, readFpBundle } from '../src/lib/fpLibrary';

/**
 * Loads the Functional Performance library bundles into the demo practice, each bundle once
 * (recorded in library_imports). Later versions are imported by the practice itself
 * (Praktijk → Instellingen) or by adding a new bundle name here.
 */
const BUNDLES = FP_BUNDLES;

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
    const done = new Set((await db.query('SELECT bundle FROM library_imports WHERE practice_id = $1', [p.id])).rows.map((r) => r.bundle));
    // Imported before bundles were recorded: the first library is already there.
    if (p.imported && !done.size) {
      await db.query(`INSERT INTO library_imports(practice_id, bundle) VALUES ($1, 'fp-library-v1') ON CONFLICT DO NOTHING`, [p.id]);
      done.add('fp-library-v1');
    }
    for (const b of BUNDLES) {
      if (done.has(b.name)) continue;
      const file = readFpBundle(b.file);
      await db.query('BEGIN');
      try {
        const r = await importLibrary(db, p.id, p.owner, file);
        await db.query('INSERT INTO library_imports(practice_id, bundle) VALUES ($1,$2)', [p.id, b.name]);
        await db.query('COMMIT');
        console.log(`[library] ${b.name}: ${r.exercises} exercises and ${r.templates} templates into ${slug}`);
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
