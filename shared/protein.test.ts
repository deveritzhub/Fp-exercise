import { describe, expect, it } from 'vitest';
import { proteinTargets, proteinZone, referenceWeight } from './protein';

describe('protein targets', () => {
  it('80 kg adult: 65 / 95 / 130 g, useful up to 175 g, ~30 g per meal', () => {
    expect(proteinTargets(80, 180, false)).toMatchObject({ minimum: 65, suboptimal: 95, optimal: 130, optimalUpper: 175, perMeal: 30, adjusted: false });
  });
  it('65+ raises the minimum to 1.0 g/kg', () => {
    expect(proteinTargets(70, null, true).minimum).toBe(70);
    expect(proteinTargets(70, null, false).minimum).toBe(55);
  });
  it('uses an adjusted weight with BMI above 30', () => {
    const r = referenceWeight(120, 170); // BMI 41.5; weight at BMI 25 = 72.25
    expect(r.adjusted).toBe(true);
    expect(r.kg).toBeCloseTo(84.2, 1);
    expect(referenceWeight(80, 180)).toEqual({ kg: 80, adjusted: false });
  });
  it('zones', () => {
    const t = proteinTargets(80, null, false);
    expect(proteinZone(40, t)).toBe('below');
    expect(proteinZone(70, t)).toBe('minimum');
    expect(proteinZone(100, t)).toBe('suboptimal');
    expect(proteinZone(140, t)).toBe('optimal');
  });
});
