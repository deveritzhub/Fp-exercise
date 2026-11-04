import { describe, it, expect } from 'vitest';
import { MOBILITY_TESTS, mobilityTest, mobilityTrends, sideDifference, validMobilityValue, roundCm, type MobilityResult } from './mobilityTests';

const r = (test: MobilityResult['test'], side: MobilityResult['side'], day: string, cm: number): MobilityResult => ({ test, side, day, cm });

describe('mobility self-tests', () => {
  it('has four tests with steps, a source and a caution, in both languages', () => {
    expect(MOBILITY_TESTS.map((x) => x.key)).toEqual(['knee_to_wall', 'fingertip_floor', 'back_scratch', 'chair_sit_reach']);
    for (const x of MOBILITY_TESTS) {
      expect(x.steps.length).toBeGreaterThanOrEqual(3);
      expect(x.source.length).toBeGreaterThan(5);
      expect(x.caution[0] && x.caution[1]).toBeTruthy();
      // Tests that can come short have a minus/plus choice, the others cannot go below 0.
      expect(!!x.sign).toBe(x.min < 0);
    }
  });

  it('checks sides and ranges', () => {
    expect(validMobilityValue('knee_to_wall', 'left', 9.5)).toBe(true);
    expect(validMobilityValue('knee_to_wall', 'none', 9.5)).toBe(false);
    expect(validMobilityValue('knee_to_wall', 'left', 40)).toBe(false);
    expect(validMobilityValue('fingertip_floor', 'none', 0)).toBe(true);
    expect(validMobilityValue('fingertip_floor', 'left', 5)).toBe(false);
    expect(validMobilityValue('back_scratch', 'right', -12)).toBe(true);
    expect(validMobilityValue('fingertip_floor', 'none', -3)).toBe(false);
    expect(roundCm(8.26)).toBe(8.5);
  });

  it('shows the change since the first measurement, positive is always more mobile', () => {
    const kw = mobilityTest('knee_to_wall')!;
    const t = mobilityTrends(kw, [r('knee_to_wall', 'left', '2026-10-01', 7), r('knee_to_wall', 'left', '2026-11-01', 10), r('knee_to_wall', 'right', '2026-10-01', 9), r('knee_to_wall', 'right', '2026-11-01', 9.5)]);
    expect(t.find((x) => x.side === 'left')).toMatchObject({ first: 7, latest: 10, gain: 3, verdict: 'better' });
    // Half a centimetre is within the published measurement error.
    expect(t.find((x) => x.side === 'right')).toMatchObject({ gain: 0.5, verdict: 'same' });
    expect(sideDifference(t)).toBe(0.5);

    // Fingertip-to-floor: fewer cm is better.
    const ftf = mobilityTest('fingertip_floor')!;
    const f = mobilityTrends(ftf, [r('fingertip_floor', 'none', '2026-10-01', 20), r('fingertip_floor', 'none', '2026-10-20', 12)]);
    expect(f[0].gain).toBe(8);
    // No published threshold: the app does not call it better or worse.
    expect(f[0].verdict).toBe('unknown');
  });

  it('needs two measurements for a change', () => {
    const t = mobilityTrends(mobilityTest('back_scratch')!, [r('back_scratch', 'left', '2026-10-01', -6)]);
    expect(t[0]).toMatchObject({ latest: -6, gain: null, verdict: 'unknown' });
    expect(t[1].latest).toBeNull();
    expect(sideDifference(t)).toBeNull();
  });
});
