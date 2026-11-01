import { describe, it, expect } from 'vitest';
import { FP_BUNDLES, readFpBundle } from '../src/lib/fpLibrary';
import { libraryFileSchema, toBundle } from '../src/lib/libraryImport';

describe('extra mobility programmes (fp-mobiliteit-v2)', () => {
  const file = readFpBundle('fp-mobiliteit-v2.json');
  const bundle = toBundle(file);

  it('is a valid library file, loaded after the bundles it builds on', () => {
    expect(libraryFileSchema.safeParse(file).success).toBe(true);
    const names = FP_BUNDLES.map((b) => b.name);
    expect(names.indexOf('fp-mobiliteit-v2')).toBeGreaterThan(names.indexOf('fp-app-update-v1'));
  });

  it('adds seven self-startable mobility programmes made only of existing library exercises', () => {
    expect(bundle.exercises).toHaveLength(0);
    expect(bundle.templates).toHaveLength(7);
    // Exercises earlier bundles create (some mobility keys are reused from the first library).
    const known = new Set(
      FP_BUNDLES.filter((b) => b.name !== 'fp-mobiliteit-v2').flatMap((b) => {
        const x = toBundle(readFpBundle(b.file));
        return [...x.exercises.map((e) => e.key), ...x.templates.flatMap((t) => t.items.map((i) => i.ex))];
      }),
    );
    for (const tp of bundle.templates) {
      expect(tp.module).toBe('mobiliteit');
      expect(tp.seriesKey).toBeNull(); // no phases: every programme can be started directly
      expect(tp.items.length).toBeGreaterThanOrEqual(4);
      for (const i of tp.items) {
        expect(known.has(i.ex), `${tp.key}: ${i.ex}`).toBe(true);
        // Static holds of 30 s, as in the library's own guidance.
        if (i.holdS) expect(i.holdS).toBe(30);
      }
    }
  });
});

describe('importing the bundles into the demo practice', () => {
  it('stores every exercise of the new programmes and offers them to the practice’s patients', async () => {
    const pg = (await import('pg')).default;
    const { seedDb, login } = await import('./helpers');
    const { importFpLibrary } = await import('../db/import-library');
    await seedDb();
    const practiceId = await importFpLibrary(process.env.DATABASE_OWNER_URL!);
    expect(practiceId).toBeTruthy();
    const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db.connect();
    try {
      const expected = Object.fromEntries(toBundle(readFpBundle('fp-mobiliteit-v2.json')).templates.map((t) => [t.key, t.items.length]));
      const rows = (
        await db.query(
          `SELECT p.source_key, count(i.id)::int AS n FROM programs p LEFT JOIN program_items i ON i.program_id = p.id
            WHERE p.practice_id = $1 AND p.is_template AND p.source_key = ANY($2) GROUP BY 1 ORDER BY 1`,
          [practiceId, Object.keys(expected)],
        )
      ).rows;
      expect(Object.fromEntries(rows.map((r) => [r.source_key, r.n]))).toEqual(expected);
      // A patient of this practice sees them among the programmes they can start.
      const patientPractice = (await db.query("SELECT practice_id FROM patients WHERE email = 'patient@praktijk-a.test'")).rows[0]?.practice_id;
      if (patientPractice === practiceId) {
        const modes = (await (await login('patientA')).get('/patient/modes')).body;
        expect(modes.templates.filter((t: { module: string }) => t.module === 'mobiliteit').length).toBeGreaterThanOrEqual(9);
      }
    } finally {
      await db.end();
    }
  }, 120_000);
});
