import { describe, it, expect } from 'vitest';
import { FP_BUNDLES, readFpBundle } from '../src/lib/fpLibrary';
import { libraryFileSchema, toBundle } from '../src/lib/libraryImport';
import { MOBILITY_GOALS, GOAL_GROUPS, programsForGoal } from '../../shared/mobilityGoals';
import { mobilityTest } from '../../shared/mobilityTests';

const all = FP_BUNDLES.map((b) => toBundle(readFpBundle(b.file)));
const templateKeys = new Set(all.flatMap((b) => b.templates.map((t) => t.key)));

describe('mobility goals by chain (fp-mobiliteit-v3)', () => {
  const file = readFpBundle('fp-mobiliteit-v3.json');
  const bundle = toBundle(file);

  it('is a valid library file with its own exercises and seven goal programmes', () => {
    expect(libraryFileSchema.safeParse(file).success).toBe(true);
    expect(bundle.templates.map((t) => t.key).sort()).toEqual(['mb3_achter_rug', 'mb3_heupen_open', 'mb3_nek', 'mb3_opstaan', 'mb3_spagaat_voor', 'mb3_spagaat_zij', 'mb3_tenen']);
    const known = new Set(all.flatMap((b) => [...b.exercises.map((e) => e.key), ...b.templates.flatMap((t) => t.items.map((i) => i.ex))]));
    const defined = new Set(all.flatMap((b) => b.exercises.map((e) => e.key)));
    for (const tp of bundle.templates) {
      expect(tp.module).toBe('mobiliteit');
      expect(tp.seriesKey).toBeNull();
      expect(tp.items.length).toBeGreaterThanOrEqual(4);
      for (const i of tp.items) {
        expect(known.has(i.ex) || defined.has(i.ex), `${tp.key}: ${i.ex}`).toBe(true);
        if (i.holdS) expect(i.holdS).toBe(30);
      }
    }
  });

  it('touching the toes works on the whole back line: calf, hamstrings, buttock and back', () => {
    const tp = bundle.templates.find((t) => t.key === 'mb3_tenen')!;
    expect(tp.items.map((i) => i.ex)).toEqual(['mb3_kuitrek_muur', 'mb3_soleus_rek', 'mb_hamstring_stretch', 'mb3_figuur4', 'mb_child_pose', 'mb3_afrollen']);
    const goal = MOBILITY_GOALS.find((g) => g.key === 'tenen')!;
    expect(goal.chain.map((c) => c[0])).toEqual(['Kuit', 'Hamstrings', 'Bil', 'Rugstrekkers']);
  });

  it('every goal points at shipped programmes and a real test, in a known group', () => {
    const groups = new Set(GOAL_GROUPS.map((g) => g.key));
    expect(new Set(MOBILITY_GOALS.map((g) => g.key)).size).toBe(MOBILITY_GOALS.length);
    for (const g of MOBILITY_GOALS) {
      expect(groups.has(g.group), g.key).toBe(true);
      expect(g.programs.length, g.key).toBeGreaterThan(0);
      for (const p of g.programs) expect(templateKeys.has(p), `${g.key}: ${p}`).toBe(true);
      if (g.test) expect(mobilityTest(g.test), g.key).not.toBeNull();
      expect(g.chain.length, g.key).toBeGreaterThanOrEqual(3);
    }
    for (const k of ['tenen', 'spagaat_voor', 'spagaat_zij', 'heupen_open', 'nek', 'opstaan']) expect(MOBILITY_GOALS.some((g) => g.key === k)).toBe(true);
  });

  it('only offers the programmes a practice has, in the goal’s order', () => {
    const goal = MOBILITY_GOALS.find((g) => g.key === 'tenen')!;
    const tps = [{ id: 'b', sourceKey: 'mb2_heup_onderrug' }, { id: 'x', sourceKey: 'other' }, { id: 'a', sourceKey: 'mb3_tenen' }];
    expect(programsForGoal(goal, tps).map((t) => t.id)).toEqual(['a', 'b']);
    expect(programsForGoal(goal, [])).toEqual([]);
  });
});
