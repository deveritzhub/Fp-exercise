import { describe, expect, it } from 'vitest';
import { gymKey, loadFor, nextLoad, setEstimate, summariseGym, type GymSet } from './gymLog';

const set = (p: Partial<GymSet>): GymSet => ({
  id: Math.random().toString(36).slice(2), day: '2026-10-01', exerciseId: null, exerciseName: 'Squat', setNo: 1,
  weightKg: 100, reps: 5, rpe: null, rir: null, place: 'gym', byPatient: true, mine: true, createdAt: '', ...p,
});

describe('krachtlog', () => {
  it('estimates 1RM only for 1–10 reps and inverts it for working weights', () => {
    expect(setEstimate(100, 1)).toBe(100);
    expect(setEstimate(100, 5)).toBe(114.5); // Epley 116.7, Brzycki 112.5 → mean, rounded to 0.5
    expect(setEstimate(60, 12)).toBeNull();
    expect(setEstimate(0, 5)).toBeNull();
    expect(loadFor(114.5, 5)).toBe(100);
    expect(loadFor(120, 1)).toBe(120);
  });

  it('groups names case- and space-insensitively and flags a new best', () => {
    expect(gymKey('  Bench   Press ')).toBe(gymKey('bench press'));
    const s = summariseGym([
      set({ day: '2026-10-01', weightKg: 100, reps: 5 }),
      set({ day: '2026-10-01', setNo: 2, weightKg: 100, reps: 4 }),
      set({ day: '2026-10-08', exerciseName: 'squat ', weightKg: 105, reps: 5 }),
      set({ day: '2026-10-08', exerciseName: 'Bench press', weightKg: 60, reps: 15 }),
    ]);
    const squat = s.find((x) => x.key === 'squat')!;
    expect(squat.best).toMatchObject({ value: 120.5, day: '2026-10-08', weightKg: 105, reps: 5 });
    expect(squat.history.map((h) => h.day)).toEqual(['2026-10-01', '2026-10-08']);
    expect(squat.latestIsPr).toBe(true);
    expect(squat.last).toMatchObject({ day: '2026-10-08', weightKg: 105, reps: 5, sets: 1 });
    expect(squat.totalSets).toBe(3);
    // 15 reps: no estimate, still volume.
    const bench = s.find((x) => x.key === 'bench press')!;
    expect(bench.best).toBeNull();
    expect(bench.volumeKg).toBe(900);
    expect(bench.latestIsPr).toBe(false);
  });

  it('a first day is never a PR', () => {
    expect(summariseGym([set({})])[0].latestIsPr).toBe(false);
  });
});

describe('next load suggestion', () => {
  it('goes a step heavier with reps left over, never more than about 5 percent', () => {
    expect(nextLoad({ weightKg: 60, reps: 8, rir: 3 })).toEqual({ weightKg: 62.5, reps: 8, why: 'add_weight' });
    expect(nextLoad({ weightKg: 100, reps: 5, rir: 4 })).toEqual({ weightKg: 105, reps: 5, why: 'add_weight' });
    expect(nextLoad({ weightKg: 12, reps: 10, rir: 3 })).toEqual({ weightKg: 13, reps: 10, why: 'add_weight' });
  });
  it('takes the smallest step at RIR 2, adds a rep at RIR 1 and repeats a max effort', () => {
    expect(nextLoad({ weightKg: 60, reps: 8, rir: 2 })).toEqual({ weightKg: 62.5, reps: 8, why: 'small_step' });
    expect(nextLoad({ weightKg: 60, reps: 8, rir: 1 })).toEqual({ weightKg: 60, reps: 9, why: 'add_rep' });
    expect(nextLoad({ weightKg: 60, reps: 8, rir: 0 })).toEqual({ weightKg: 60, reps: 8, why: 'repeat' });
  });
  it('without RIR: one rep more, and at 12+ reps heavier with fewer reps', () => {
    expect(nextLoad({ weightKg: 40, reps: 10, rir: null })).toEqual({ weightKg: 40, reps: 11, why: 'add_rep' });
    expect(nextLoad({ weightKg: 40, reps: 12, rir: null })).toEqual({ weightKg: 42.5, reps: 8, why: 'add_weight' });
  });
  it('bodyweight work progresses in reps only', () => {
    expect(nextLoad({ weightKg: 0, reps: 10, rir: 3 })).toEqual({ weightKg: 0, reps: 11, why: 'add_rep' });
  });
  it('the summary carries the suggestion and the top set per day', () => {
    const set = (day: string, setNo: number, weightKg: number, reps: number, rir: number | null) => ({ id: `${day}-${setNo}`, day, exerciseId: null, exerciseName: 'Squat', setNo, weightKg, reps, rpe: null, rir, place: 'gym' as const, byPatient: true, mine: true, createdAt: day });
    const [s] = summariseGym([set('2026-11-01', 1, 60, 8, 2), set('2026-11-01', 2, 62.5, 6, 1), set('2026-11-03', 1, 65, 5, 3)]);
    expect(s.days).toEqual([
      { day: '2026-11-01', weightKg: 62.5, reps: 6, rir: 1, estimate: expect.any(Number) },
      { day: '2026-11-03', weightKg: 65, reps: 5, rir: 3, estimate: expect.any(Number) },
    ]);
    expect(s.next).toEqual({ weightKg: 67.5, reps: 5, why: 'add_weight' });
  });
});
