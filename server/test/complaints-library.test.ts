import { describe, it, expect } from 'vitest';
import { FP_BUNDLES, readFpBundle } from '../src/lib/fpLibrary';
import { toBundle } from '../src/lib/libraryImport';
import { exerciseKind, musclesOf, nerveOf } from '../../shared/muscleAtlas';
import { COMPLAINTS, proposeExercises, type ProposalExercise } from '../../shared/complaints';

const lib: ProposalExercise[] = (() => {
  const seen = new Map<string, ProposalExercise>();
  for (const b of FP_BUNDLES)
    for (const e of toBundle(readFpBundle(b.file)).exercises) {
      const input = { name: e.nameNl, muscles: e.muscles, training: e.training, movement: e.movement, sourceKey: e.key, tags: e.tags };
      seen.set(e.key, { id: e.key, nameNl: e.nameNl, nameEn: e.nameEn, kind: exerciseKind(input), muscles: musclesOf(input), nerve: nerveOf(input) });
    }
  return [...seen.values()];
})();

describe('complaint guide with the FP library', () => {
  it('proposes at least two exercises for every complaint', () => {
    for (const c of COMPLAINTS) {
      const p = proposeExercises(c, lib);
      expect(p.calm.length + p.activate.length + p.function.length, c.key).toBeGreaterThanOrEqual(2);
    }
  });

  it('TFL overuse: side-lying abduction yes, seated machine abduction no', () => {
    const p = proposeExercises(COMPLAINTS.find((c) => c.key === 'itbs')!, lib);
    const names = [...p.calm, ...p.activate, ...p.function].map((e) => e.nameNl);
    expect(names).toContain('Zijlig heupabductie met de hiel voorop');
    expect(names.some((n) => /machine/i.test(n))).toBe(false);
  });

  it('tennis elbow starts with the wrist extensors, radiating back pain gets nerve sliders', () => {
    expect(proposeExercises(COMPLAINTS.find((c) => c.key === 'tennisarm')!, lib).activate[0].id).toBe('kt_pols_excentrisch_strek');
    expect(proposeExercises(COMPLAINTS.find((c) => c.key === 'rug_uitstraling')!, lib).calm.some((e) => e.kind === 'zenuw')).toBe(true);
  });
});
