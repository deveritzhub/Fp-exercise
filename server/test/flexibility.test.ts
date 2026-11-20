import { describe, it, expect, beforeAll } from 'vitest';
import { FP_BUNDLES, readFpBundle } from '../src/lib/fpLibrary';
import { libraryFileSchema, toBundle } from '../src/lib/libraryImport';
import { EX_NAMES, FLEX_PATHS, FORM_CHECKS, autoMet, formChecks, phaseSourceKey } from '../../shared/flexibilityPaths';
import { CHECKS, LIMITERS, scoreCheck } from '../../shared/flexibilityCheck';
import { MOBILITY_GOALS, pathKeysForGoal } from '../../shared/mobilityGoals';
import { seedDb, login } from './helpers';

const all = FP_BUNDLES.map((b) => toBundle(readFpBundle(b.file)));
const libraryKeys = new Set(all.flatMap((b) => b.exercises.map((e) => e.key)));

describe('flexibility build-ups (fp-mobiliteit-v4)', () => {
  const file = readFpBundle('fp-mobiliteit-v4.json');
  const bundle = toBundle(file);

  it('is a valid library file whose phases follow shared/flexibilityPaths exactly', () => {
    expect(libraryFileSchema.safeParse(file).success).toBe(true);
    for (const p of FLEX_PATHS) {
      p.phases.forEach((ph, i) => {
        const tp = bundle.templates.find((t) => t.key === phaseSourceKey(p, i));
        expect(tp, `${p.key} phase ${i + 1}`).toBeTruthy();
        expect(tp!.seriesKey).toBe(p.series);
        expect(tp!.phaseNo).toBe(i + 1);
        expect(tp!.items.map((x) => x.ex)).toEqual(ph.items.map((x) => x.ex));
        // Therapists see the same criteria in the programme builder.
        expect(tp!.criteria.flatMap((c) => c.items).length).toBe(ph.criteria.length);
      });
    }
  });

  it('uses only library exercises, each with a name and a form checklist; static holds are 30 s', () => {
    for (const p of FLEX_PATHS) {
      for (const ph of p.phases) {
        expect(new Set(ph.criteria.map((c) => c.key)).size).toBe(ph.criteria.length);
        for (const it of ph.items) {
          expect(libraryKeys.has(it.ex), `${p.key}: ${it.ex}`).toBe(true);
          expect(EX_NAMES[it.ex], it.ex).toBeTruthy();
          expect(FORM_CHECKS[it.ex]?.length ?? 0, it.ex).toBeGreaterThanOrEqual(2);
          if (it.holdS) expect(it.holdS).toBe(30);
        }
      }
    }
  });

  it('builds up: later phases ask more and every phase but the last checks pain, nerves and practice', () => {
    for (const p of FLEX_PATHS) {
      expect(p.phases.length).toBeGreaterThanOrEqual(3);
      p.phases.slice(0, -1).forEach((ph) => {
        expect(ph.criteria.map((c) => c.key)).toEqual(expect.arrayContaining(['pijn', 'zenuw', 'trouw']));
        expect(ph.minWeeks).toBeGreaterThanOrEqual(3);
      });
      expect(p.phases.at(-1)!.criteria.map((c) => c.key)).toContain('onderhoud');
    }
    expect(FLEX_PATHS.map((p) => p.key).sort()).toEqual(['pancake', 'spagaat_voor', 'spagaat_zij', 'tenen']);
  });

  it('the goal menu links pancake, splits and toe touch to their build-up', () => {
    for (const k of ['pancake', 'spagaat_voor', 'spagaat_zij', 'tenen']) {
      const g = MOBILITY_GOALS.find((x) => x.key === k)!;
      expect(g.path).toBe(k);
      expect(pathKeysForGoal(g)[0]).toBe(`mb4_${k}#1`);
    }
  });

  it('ticks a measured criterion from the latest result only', () => {
    const c = FLEX_PATHS.find((p) => p.key === 'tenen')!.phases[0].criteria.find((x) => x.key === 'ff15')!;
    expect(autoMet(c, [])).toBe(false);
    expect(autoMet(c, [{ test: 'fingertip_floor', side: 'none', cm: 12, day: '2026-11-01' }])).toBe(true);
    expect(autoMet(c, [{ test: 'fingertip_floor', side: 'none', cm: 12, day: '2026-11-01' }, { test: 'fingertip_floor', side: 'none', cm: 20, day: '2026-11-10' }])).toBe(false);
    const csr = FLEX_PATHS.find((p) => p.key === 'tenen')!.phases[2].criteria.find((x) => x.key === 'csr')!;
    // One-sided test: both sides must reach it.
    expect(autoMet(csr, [{ test: 'chair_sit_reach', side: 'left', cm: 2, day: '2026-11-10' }, { test: 'chair_sit_reach', side: 'right', cm: -3, day: '2026-11-10' }])).toBe(false);
    expect(formChecks('mb_hip_flexor_stretch').length).toBeGreaterThan(0);
  });
});

describe('what holds you back', () => {
  it('every limiter has advice and only library exercises', () => {
    for (const [k, l] of Object.entries(LIMITERS)) {
      expect(l.exercises.length, k).toBeGreaterThan(0);
      for (const e of l.exercises) {
        expect(libraryKeys.has(e), `${k}: ${e}`).toBe(true);
        expect(EX_NAMES[e], e).toBeTruthy();
      }
    }
    for (const qs of Object.values(CHECKS)) expect(qs.at(-1)!.key).toBe('tintel');
  });

  it('touching the toes: a feeling that changes with the head points at the sciatic nerve, not the hamstrings', () => {
    const r = scoreCheck('tenen', { waar: 'knieholte', knieen: 'ja', hoofd: 'ja', voet: 'ja', kat: 'ja', knieborst: 'makkelijk', tintel: 'nee' });
    expect(r.complete).toBe(true);
    expect(r.limiters[0]).toMatchObject({ key: 'zenuw_ischiadicus', level: 'waarschijnlijk' });
    expect(LIMITERS.zenuw_ischiadicus.nerve).toBe(true);
  });

  it('touching the toes: easy with bent knees and stiff low back points at the back', () => {
    const r = scoreCheck('tenen', { waar: 'rug', knieen: 'nee', hoofd: 'nee', voet: 'nee', kat: 'nee', knieborst: 'makkelijk', tintel: 'nee' });
    expect(r.limiters[0].key).toBe('rug');
  });

  it('pancake: spreading clearly further with bent knees points at the muscles across the knee', () => {
    const r = scoreCheck('pancake', { waar: 'binnen', knieen: 'ja', rechtop: 'ja', hoofd: 'nee', actief: 'ja', tintel: 'nee' });
    expect(r.limiters[0]).toMatchObject({ key: 'binnen_tweegewricht', level: 'waarschijnlijk' });
    const pinch = scoreCheck('pancake', { waar: 'knel', knieen: 'nee', rechtop: 'ja', hoofd: 'nee', actief: 'ja', tintel: 'nee' });
    expect(pinch.limiters[0].key).toBe('heupgewricht');
  });

  it('tingling, numbness or shooting pain stops the stretch', () => {
    expect(scoreCheck('spagaat_zij', { tintel: 'ja' }).stop).toBe(true);
    expect(scoreCheck('spagaat_zij', { tintel: 'ja' }).complete).toBe(false);
  });
});

describe('ticking off criteria', () => {
  beforeAll(async () => { await seedDb(); });

  it('stores only real, non-measured criteria, privately for the patient', async () => {
    const pat = await login('patientA');
    expect((await pat.put('/patient/flex-checks', { path: 'pancake', phase: 1, item: 'rechtop' })).body.checks).toEqual([expect.objectContaining({ path: 'pancake', phase: 1, item: 'rechtop' })]);
    // Twice is fine.
    expect((await pat.put('/patient/flex-checks', { path: 'pancake', phase: 1, item: 'rechtop' })).status).toBe(200);
    expect((await pat.put('/patient/flex-checks', { path: 'pancake', phase: 1, item: 'bestaat_niet' })).status).toBe(400);
    expect((await pat.put('/patient/flex-checks', { path: 'pancake', phase: 9, item: 'rechtop' })).status).toBe(400);
    // A measured criterion is ticked by the measurement, not by hand.
    expect((await pat.put('/patient/flex-checks', { path: 'tenen', phase: 1, item: 'ff15' })).status).toBe(400);
    const other = await login('patientB');
    expect((await other.get('/patient/flex-checks')).body.checks).toEqual([]);
    expect((await pat.del('/patient/flex-checks?path=pancake&phase=1&item=rechtop')).body.checks).toEqual([]);
    // Part of the patient's own data export.
    await pat.put('/patient/flex-checks', { path: 'tenen', phase: 1, item: 'gebogen' });
    expect((await pat.get('/patient/export')).body.flexibilityChecks).toEqual([expect.objectContaining({ path: 'tenen', item: 'gebogen' })]);
    // Staff cannot use the patient endpoint.
    expect((await (await login('therapistA')).get('/patient/flex-checks')).status).toBe(403);
  });
});
