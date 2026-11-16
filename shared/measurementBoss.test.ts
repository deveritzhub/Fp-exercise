import { describe, expect, it } from 'vitest';
import { bossProgress, heirloomRatio, heirloomTier, meetsTarget } from './measurementBoss';

describe('measurement boss', () => {
  it('shows how far the latest value is from the first toward the target', () => {
    const p = bossProgress(
      [{ at: '2026-01-01', value: 90 }, { at: '2026-02-01', value: 105 }],
      120,
      'gte',
    );
    expect(p.baseline).toBe(90);
    expect(p.latest).toBe(105);
    expect(p.ratio).toBeCloseTo(0.5);
    expect(p.remaining).toBe(15);
    expect(p.defeated).toBe(false);
  });

  it('is defeated only when a measurement meets the target, and a later dip does not undo it', () => {
    const won = bossProgress(
      [{ at: '2026-01-01', value: 90 }, { at: '2026-02-01', value: 120 }, { at: '2026-03-01', value: 100 }],
      120,
      'gte',
    );
    expect(won.defeated).toBe(true);
    expect(won.latest).toBe(100);
    expect(won.best).toBe(120);
    expect(won.bestRatio).toBe(1);
    expect(meetsTarget(100, 120, 'gte')).toBe(false);
  });

  it('counts downward targets the same way', () => {
    const p = bossProgress(
      [{ at: '2026-01-01', value: 20 }, { at: '2026-02-01', value: 10 }],
      0,
      'lte',
    );
    expect(p.ratio).toBeCloseTo(0.5);
    expect(p.remaining).toBe(10);
    expect(bossProgress([{ at: '2026-01-01', value: 20 }, { at: '2026-03-01', value: 0 }], 0, 'lte').defeated).toBe(true);
  });

  it('does not move without measurements', () => {
    expect(bossProgress([], 120, 'gte')).toMatchObject({ ratio: 0, defeated: false, remaining: null });
  });
});

describe('heirloom tiers', () => {
  it('uses the best progress and never a worse day', () => {
    const dipped = bossProgress(
      [{ at: '2026-01-01', value: 0 }, { at: '2026-02-01', value: 80 }, { at: '2026-03-01', value: 10 }],
      100,
      'gte',
    );
    expect(heirloomTier(dipped.bestRatio)).toBe(4);
    expect(heirloomTier(1)).toBe(5);
    expect(heirloomTier(heirloomRatio([dipped.bestRatio, 1]))).toBe(4);
  });

  it('steps through five forms', () => {
    expect(heirloomTier(0)).toBe(1);
    expect(heirloomTier(0.24)).toBe(1);
    expect(heirloomTier(0.25)).toBe(2);
    expect(heirloomTier(0.5)).toBe(3);
    expect(heirloomTier(0.75)).toBe(4);
    expect(heirloomTier(1)).toBe(5);
  });
});
