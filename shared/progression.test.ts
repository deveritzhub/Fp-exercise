import { describe, it, expect } from 'vitest';
import { painRising, progressionSignal } from './progression';

const s = (difficulty: number | null, pain: number | null = 0) => ({ difficulty, pain });

describe('progression signal', () => {
  it('three light workouts with little pain: ready for heavier', () => {
    expect(progressionSignal([s(2), s(3, 1), s(1, 2), s(9)])).toMatchObject({ kind: 'ready_heavier', sessions: 3, avgDifficulty: 2, maxPain: 2 });
  });
  it('two very heavy workouts: too heavy (newest first)', () => {
    expect(progressionSignal([s(9, 3), s(8, 2), s(2)])).toMatchObject({ kind: 'too_heavy', sessions: 2 });
  });
  it('nothing when scores are mixed, missing, too few, or pain is high', () => {
    expect(progressionSignal([s(2), s(6), s(2)])).toBeNull();
    expect(progressionSignal([s(2), s(2)])).toBeNull();
    expect(progressionSignal([s(null), s(null), s(null)])).toBeNull();
    // High pain is not "ready", and very heavy with high pain is the pain signal, not this one.
    expect(progressionSignal([s(2, 5), s(2), s(2)])).toBeNull();
    expect(progressionSignal([s(9, 7), s(9, 7)])).toBeNull();
  });
  it('skips workouts without scores', () => {
    expect(progressionSignal([s(null), s(2), s(1), s(3)])?.kind).toBe('ready_heavier');
  });
});

describe('pain rising', () => {
  const sc = (...pains: (number | null)[]) => pains.map((pain) => ({ difficulty: 5, pain }));
  it('three workouts in a row with more pain each time, ending at 4 or more', () => {
    expect(painRising(sc(5, 3, 1))).toEqual({ from: 1, to: 5 });
    expect(painRising(sc(4, 3, 2, 8))).toEqual({ from: 2, to: 4 });
  });
  it('not when it levels off, goes down, stays low or there are too few scores', () => {
    expect(painRising(sc(5, 5, 2))).toBeNull();
    expect(painRising(sc(2, 4, 5))).toBeNull();
    expect(painRising(sc(3, 2, 1))).toBeNull();
    expect(painRising(sc(5, 3))).toBeNull();
    expect(painRising(sc(5, null, 3, 1))).toEqual({ from: 1, to: 5 });
  });
});
