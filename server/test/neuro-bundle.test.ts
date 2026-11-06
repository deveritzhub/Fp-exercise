import { describe, it, expect } from 'vitest';
import { FP_BUNDLES, readFpBundle } from '../src/lib/fpLibrary';
import { toBundle } from '../src/lib/libraryImport';
import { nerveOf, NERVES } from '../../shared/muscleAtlas';

/** Nerves of the arm and leg for which a common neurodynamic slider exists. */
const WITH_SLIDER = ['medianus', 'ulnaris', 'radialis', 'musculocutaneus', 'femoralis', 'obturatorius', 'ischiadicus', 'tibialis', 'fibularis'] as const;

describe('nerve sliders in the FP library', () => {
  const exercises = FP_BUNDLES.flatMap((b) => toBundle(readFpBundle(b.file)).exercises);
  const covered = new Map<string, string[]>();
  for (const e of exercises) {
    const n = nerveOf({ name: e.nameNl, muscles: e.muscles, training: e.training, movement: e.movement, sourceKey: e.key, tags: e.tags });
    if (n) covered.set(n, [...(covered.get(n) ?? []), e.key]);
  }

  it('every limb nerve with a common slider has at least one exercise in the atlas', () => {
    for (const n of WITH_SLIDER) {
      expect(NERVES.some((x) => x.key === n), n).toBe(true);
      expect(covered.get(n)?.length ?? 0, `${n} has no slider`).toBeGreaterThan(0);
    }
  });

  it('links each new slider to its own nerve', () => {
    const of = (k: string) => [...covered].find(([, keys]) => keys.includes(k))?.[0];
    expect(of('nd_tibial_slider')).toBe('tibialis');
    expect(of('nd_fibular_slider')).toBe('fibularis');
    expect(of('nd_musculocutaneous_slider')).toBe('musculocutaneus');
    expect(of('nd_obturator_slider')).toBe('obturatorius');
  });
});
