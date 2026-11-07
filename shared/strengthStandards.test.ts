import { describe, expect, it } from 'vitest';
import { BASE_STRENGTH_CAP, compoundLift, strengthCap } from './strengthStandards';

describe('Strength level ceiling', () => {
  it('recognises the compound lifts, not their easier variants', () => {
    expect(compoundLift('Back squat')).toBe('squat');
    expect(compoundLift('Conventional deadlift')).toBe('deadlift');
    expect(compoundLift('Bankdrukken')).toBe('bench');
    expect(compoundLift('Overhead press')).toBe('ohp');
    expect(compoundLift('Bulgarian split squat')).toBeNull();
    expect(compoundLift('Romanian deadlift')).toBeNull();
    expect(compoundLift('Squat met lichaamsgewicht')).toBeNull();
    expect(compoundLift('Leg press')).toBeNull();
  });

  it('needs a compound lift and a body weight; without them the ceiling is the base', () => {
    expect(strengthCap({ frame: 'm', bodyweightKg: 80, lifts: [{ name: 'Leg press', oneRmKg: 300 }] })).toMatchObject({ cap: BASE_STRENGTH_CAP, reason: 'no_compound' });
    expect(strengthCap({ frame: 'm', bodyweightKg: null, lifts: [{ name: 'Squat', oneRmKg: 200 }] })).toMatchObject({ cap: BASE_STRENGTH_CAP, reason: 'no_weight' });
  });

  it('only elite lifting reaches 99, and every kilo moves the ceiling', () => {
    const at = (kg: number, frame = 'm', name = 'Back squat') => strengthCap({ frame, bodyweightKg: 80, lifts: [{ name, oneRmKg: kg }] });
    expect(at(200).cap).toBe(99); // 2.5 × body weight: elite
    expect(at(199).cap).toBeLessThan(99);
    expect(at(160).cap).toBe(85); // 2.0 ×: advanced
    expect(at(120).cap).toBe(72); // 1.5 ×: intermediate
    expect(at(125).cap).toBeGreaterThan(at(120).cap);
    expect(at(40).cap).toBeLessThan(55);
    expect(at(40).cap).toBeGreaterThanOrEqual(BASE_STRENGTH_CAP);
    // Women have their own table: 2.0 × body weight squat is elite.
    expect(at(160, 'f').cap).toBe(99);
    // The next step names the lift and the kilos.
    expect(at(120).next).toEqual({ lift: 'squat', kg: 160, cap: 85 });
  });

  it('takes the best of several lifts', () => {
    const c = strengthCap({ frame: 'm', bodyweightKg: 100, lifts: [{ name: 'Squat', oneRmKg: 100 }, { name: 'Deadlift', oneRmKg: 250 }] });
    expect(c.best).toMatchObject({ lift: 'deadlift', ratio: 2.5 });
    expect(c.cap).toBe(85);
  });
});
