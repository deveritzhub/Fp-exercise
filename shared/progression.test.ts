import { describe, it, expect } from 'vitest';
import { areaPainRising, painRising, progressionSignal } from './progression';

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

describe('pain map: same spot worse within two weeks', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const ago = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString();
  it('2+ points worse on the same spot, a week or more apart', () => {
    expect(areaPainRising([{ area: 'knee_r', score: 3, at: ago(12) }, { area: 'knee_r', score: 4, at: ago(6) }, { area: 'knee_r', score: 5, at: ago(1) }], now)).toEqual([{ area: 'knee_r', from: 3, to: 5 }]);
  });
  it('not for a smaller rise, too short a span, older entries or getting better', () => {
    expect(areaPainRising([{ area: 'knee_r', score: 3, at: ago(10) }, { area: 'knee_r', score: 4, at: ago(1) }], now)).toEqual([]);
    expect(areaPainRising([{ area: 'knee_r', score: 2, at: ago(4) }, { area: 'knee_r', score: 6, at: ago(1) }], now)).toEqual([]);
    expect(areaPainRising([{ area: 'knee_r', score: 1, at: ago(30) }, { area: 'knee_r', score: 6, at: ago(1) }], now)).toEqual([]);
    expect(areaPainRising([{ area: 'knee_r', score: 6, at: ago(10) }, { area: 'knee_r', score: 2, at: ago(1) }], now)).toEqual([]);
  });
});
