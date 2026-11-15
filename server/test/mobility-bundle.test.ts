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
      const expected = Object.fromEntries(['fp-mobiliteit-v2.json', 'fp-kracht-v2.json'].flatMap((f) => toBundle(readFpBundle(f)).templates.map((t) => [t.key, t.items.length])));
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

describe('extra strength programmes (fp-kracht-v2)', () => {
  const bundle = toBundle(readFpBundle('fp-kracht-v2.json'));
  it('adds four strength programmes built from library exercises plus the push-up, spread over the week', () => {
    expect(bundle.exercises.map((e) => e.key)).toEqual(['kr_push_up']);
    expect(bundle.templates.map((t) => t.key).sort()).toEqual(['kr2_bilspieren_2d', 'kr2_fullbody_2d', 'kr2_fullbody_3d', 'kr2_thuis_3d']);
    const known = new Set([
      'kr_push_up',
      ...FP_BUNDLES.filter((b) => b.name !== 'fp-kracht-v2').flatMap((b) => toBundle(readFpBundle(b.file)).exercises.map((e) => e.key)),
    ]);
    for (const tp of bundle.templates) {
      expect(tp.module).toBe('kracht');
      expect(tp.redFlags).toContain('Pijn op de borst');
      for (const i of tp.items) expect(known.has(i.ex), `${tp.key}: ${i.ex}`).toBe(true);
    }
    // Two training days land on Monday and Thursday, three on Monday, Wednesday and Friday.
    const days = (k: string) => [...new Set(bundle.templates.find((t) => t.key === k)!.items.flatMap((i) => i.days))].sort();
    expect(days('kr2_fullbody_2d')).toEqual([1, 4]);
    expect(days('kr2_thuis_3d')).toEqual([1, 3, 5]);
  });
});

describe('hypertrophy schedules (fp-kracht-v5)', () => {
  const bundle = toBundle(readFpBundle('fp-kracht-v5.json'));
  const known = new Set(FP_BUNDLES.flatMap((b) => toBundle(readFpBundle(b.file)).exercises.map((e) => e.key)));
  const days = (k: string) => [...new Set(bundle.templates.find((t) => t.key === k)!.items.flatMap((i) => i.days))].sort();
  it('adds five schedules from library exercises plus six new ones (stretch-focused and stable machine work), with red flags and the training days spread over the week', () => {
    expect(bundle.exercises.map((e) => e.key).sort()).toEqual(['kr_bulgarian_split_squat', 'kr_cable_lateral_raise', 'kr_incline_db_curl', 'kr_machine_chest_press', 'kr_seated_calf_raise', 'kr_seated_leg_curl']);
    const elsewhere = new Set(FP_BUNDLES.filter((b) => b.name !== 'fp-kracht-v5').flatMap((b) => toBundle(readFpBundle(b.file)).exercises.map((e) => e.key)));
    for (const e of bundle.exercises) expect(elsewhere.has(e.key), e.key).toBe(false);
    expect(bundle.templates.map((t) => t.key).sort()).toEqual(['kr5_hyp_dumbbell_3d', 'kr5_hyp_fullbody_3d', 'kr5_hyp_minimaal_2d', 'kr5_hyp_ulppl_5d', 'kr5_hyp_upper_lower_4d']);
    for (const tp of bundle.templates) {
      expect(tp.module).toBe('kracht');
      expect(tp.redFlags).toContain('Pijn op de borst');
      for (const i of tp.items) {
        expect(known.has(i.ex), `${tp.key}: ${i.ex}`).toBe(true);
        expect(i.sets).toBeGreaterThanOrEqual(2);
        expect(i.restS).toBeGreaterThanOrEqual(60);
      }
    }
    expect(days('kr5_hyp_minimaal_2d')).toEqual([1, 4]);
    expect(days('kr5_hyp_fullbody_3d')).toEqual([1, 3, 5]);
    expect(days('kr5_hyp_upper_lower_4d')).toEqual([1, 2, 4, 5]);
    expect(days('kr5_hyp_ulppl_5d')).toEqual([1, 2, 4, 5, 6]);
    // Rest in minutes keeps its decimals: 2.5 min before a heavy row is 150 s, not 120.
    const row = bundle.templates.find((t) => t.key === 'kr5_hyp_upper_lower_4d')!.items.find((i) => i.ex === 'kr_barbell_row')!;
    expect(row.restS).toBe(150);
  });
  it('trains every big muscle group at least twice a week and only flags the minimal schedule as low volume', () => {
    const groups: Record<string, string[]> = {
      borst: ['kr_machine_chest_press', 'kr_bench_press', 'kr_db_bench_press', 'kr_incline_db_press', 'kr_dips', 'kr_push_up', 'kr_cable_fly'],
      rug: ['kr_barbell_row', 'kr_chest_supported_row', 'kr_seated_cable_row', 'kr_db_row', 'kr_lat_pulldown', 'kr_pull_up', 'kr_chin_up'],
      benen: ['kr_bulgarian_split_squat', 'kr_seated_leg_curl', 'kr_back_squat', 'kr_leg_press', 'kr_hack_squat', 'kr_goblet_squat', 'kr_walking_lunge', 'kr_reverse_lunge', 'kr_step_up', 'kr_leg_extension', 'kr_rdl', 'kr_leg_curl', 'kr_hip_thrust'],
    };
    for (const tp of bundle.templates) {
      for (const [g, ids] of Object.entries(groups)) {
        const onDays = new Set(tp.items.filter((i) => ids.includes(i.ex)).flatMap((i) => i.days));
        expect(onDays.size, `${tp.key}: ${g}`).toBeGreaterThanOrEqual(2);
      }
      const low = tp.warnings.some((w) => w.startsWith('Volume:'));
      expect(low, tp.key).toBe(tp.key === 'kr5_hyp_minimaal_2d');
    }
  });
});

describe('extra strength exercises (fp-kracht-v3)', () => {
  it('adds twenty strength exercises with valid regions and no programmes', async () => {
    const { BODY_REGIONS } = await import('../../shared/taxonomy');
    const b = toBundle(readFpBundle('fp-kracht-v3.json'));
    expect(b.exercises).toHaveLength(20);
    expect(b.templates).toHaveLength(0);
    const regions = new Set(BODY_REGIONS.map((r: { key: string }) => r.key));
    for (const e of b.exercises) {
      expect(regions.has(e.region), `${e.key}: ${e.region}`).toBe(true);
      expect(e.training).toEqual(['strength']);
      expect(e.cuesNl.length).toBeGreaterThan(20);
    }
    // No key clashes with earlier bundles.
    const earlier = new Set(FP_BUNDLES.filter((x) => x.name !== 'fp-kracht-v3').flatMap((x) => toBundle(readFpBundle(x.file)).exercises.map((e) => e.key)));
    for (const e of b.exercises) expect(earlier.has(e.key), e.key).toBe(false);
  });
});
