import { describe, expect, it } from 'vitest';
import { gymKey, loadFor, setEstimate, summariseGym, type GymSet } from './gymLog';

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
