import { describe, it, expect } from 'vitest';
import { best1RM, brzycki, epley, estimate1RM, oneRmTestAllowed, progressionAdvice, repRange } from './strength';

describe('1RM estimate (W05)', () => {
  it('uses Epley and Brzycki', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 2);
    expect(brzycki(100, 5)).toBeCloseTo(112.5, 2);
    expect(estimate1RM(100, 5)).toEqual({ epley: 116.7, brzycki: 112.5, value: 114.5 });
    expect(estimate1RM(80, 1)).toEqual({ epley: 80, brzycki: 80, value: 80 });
  });
  it('refuses estimates above 10 reps and without data', () => {
    expect(estimate1RM(60, 12)).toEqual({ warning: 'too_many_reps' });
    expect(estimate1RM(null, 5)).toEqual({ warning: 'no_data' });
    expect(estimate1RM(60, 0)).toEqual({ warning: 'no_data' });
    expect(best1RM([{ weightKg: 60, reps: 15 }, { weightKg: 50, reps: 8 }])).toBe(estimate1RM(50, 8) && (estimate1RM(50, 8) as any).value);
  });
});

describe('double progression (W07)', () => {
  const s = (...sets: [number, number][]) => ({ sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })) });
  it('advises +2.5–5 kg when all sets reach the top of the range', () => {
    expect(progressionAdvice([s([60, 8], [60, 8], [60, 8])], { min: 5, max: 8 })).toEqual({ kind: 'increase', fromKg: 60, toKgMin: 62.5, toKgMax: 65 });
    expect(progressionAdvice([s([60, 8], [60, 7], [60, 6])], { min: 5, max: 8 })).toEqual({ kind: 'keep' });
  });
  it('flags a plateau after 3 sessions without a higher estimated 1RM', () => {
    const flat = [s([60, 6]), s([60, 6]), s([60, 5]), s([60, 6])];
    expect(progressionAdvice(flat, { min: 5, max: 8 })).toEqual({ kind: 'plateau' });
    const better = [s([62.5, 6]), s([60, 6]), s([60, 5]), s([60, 6])];
    expect(progressionAdvice(better, { min: 5, max: 8 })).toEqual({ kind: 'keep' });
  });
  it('reads the rep range from the programme notes', () => {
    expect(repRange('Push A · 5-8 herhalingen · RPE 8', 8)).toEqual({ min: 5, max: 8 });
    expect(repRange('', 10)).toEqual({ min: 10, max: 10 });
  });
});

describe('direct 1RM test (W08)', () => {
  it('is not offered in the first 4 weeks', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    expect(oneRmTestAllowed('2026-10-01', now)).toBe(false);
    expect(oneRmTestAllowed('2026-09-20', now)).toBe(true);
    expect(oneRmTestAllowed(null, now)).toBe(false);
  });
});
