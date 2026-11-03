import { estimate1RM, MAX_REPS_FOR_ESTIMATE } from './strength';

/**
 * Krachtlog: sets of any exercise, in the gym, at home or in the practice. The estimated 1RM is the
 * mean of Epley and Brzycki (shared/strength.ts), only for sets of 1–10 reps; above that the estimate
 * is unreliable and the set still counts as volume.
 */
export const GYM_PLACES = ['gym', 'home', 'practice'] as const;
export type GymPlace = (typeof GYM_PLACES)[number];
export const GYM_LIMITS = { weightMax: 1000, repsMax: 100, setsPerDay: 30, nameMin: 2, nameMax: 80, rirMax: 10, routineItems: 20, routineSets: 10 } as const;

/** One exercise in an own routine: target sets and a rep range. */
export type RoutineItem = { exerciseId: string | null; exerciseName: string; sets: number; repsMin: number; repsMax: number; restS: number | null };
export type GymRoutine = { id: string; name: string; items: RoutineItem[]; updatedAt: string };

/** RIR options shown in the logger: 0 (nothing left) to 5+ (easy). */
export const RIR_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

export type GymSet = {
  id: string;
  day: string; // YYYY-MM-DD
  exerciseId: string | null;
  exerciseName: string;
  setNo: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  /** Reps in reserve (advanced, optional): how many more reps would have been possible. */
  rir: number | null;
  place: GymPlace;
  byPatient: boolean;
  mine: boolean;
  createdAt: string;
};

export type GymExerciseSummary = {
  key: string;
  name: string;
  exerciseId: string | null;
  best: { value: number; day: string; weightKg: number; reps: number } | null;
  last: { day: string; weightKg: number; reps: number; sets: number } | null;
  /** Best estimated 1RM per training day, oldest first (max 20). */
  history: { day: string; value: number }[];
  /** The latest day set a new best (and there was an earlier best to beat). */
  latestIsPr: boolean;
  totalSets: number;
  volumeKg: number;
  /** What to try next time, from the last session's top set and its RIR. */
  next: NextLoad | null;
  /** Top set per training day, newest last (max 12): for the detail chart. */
  days: { day: string; weightKg: number; reps: number; rir: number | null; estimate: number | null }[];
};

/**
 * Why the suggestion is what it is:
 * - 'add_weight': reps left over (RIR 3+, or 12+ reps without RIR) → a step heavier, same reps;
 * - 'small_step': RIR 2 → the smallest step heavier;
 * - 'add_rep': RIR 1, or no RIR → same weight, one rep more (at 12+ reps the weight goes up instead);
 * - 'repeat': RIR 0 (a max effort) → the same set again.
 */
export type NextLoad = { weightKg: number; reps: number; why: 'add_weight' | 'small_step' | 'add_rep' | 'repeat' };

/** The smallest jump a gym usually allows: 1 kg for light dumbbells, 2.5 kg for bars and machines. */
export const loadStep = (weightKg: number) => (weightKg < 20 ? 1 : 2.5);
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Double progression guided by RIR. Conservative on purpose: never more than one step or 5 percent
 * at a time, and nothing when the last set had no weight (bodyweight work progresses in reps).
 */
export function nextLoad(top: { weightKg: number; reps: number; rir: number | null }): NextLoad {
  const { weightKg: w, reps: r, rir } = top;
  if (w <= 0) return { weightKg: 0, reps: Math.min(r + 1, GYM_LIMITS.repsMax), why: 'add_rep' };
  const step = loadStep(w);
  const heavier = (pct: number) => Math.max(w + step, roundTo(w * (1 + pct), step));
  if (rir !== null && rir >= 3) return { weightKg: Math.min(heavier(0.05), GYM_LIMITS.weightMax), reps: r, why: 'add_weight' };
  if (rir === 2) return { weightKg: Math.min(w + step, GYM_LIMITS.weightMax), reps: r, why: 'small_step' };
  if (r >= 12) return { weightKg: Math.min(heavier(0.05), GYM_LIMITS.weightMax), reps: Math.max(6, r - 4), why: 'add_weight' };
  // RIR 0: it was a max effort; the same set again, cleaner, before adding anything.
  if (rir === 0) return { weightKg: w, reps: r, why: 'repeat' };
  return { weightKg: w, reps: r + 1, why: 'add_rep' };
}

/** Same exercise, written slightly differently: "Bench press" and " bench  Press " match. */
export const gymKey = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

export function setEstimate(weightKg: number, reps: number): number | null {
  if (reps > MAX_REPS_FOR_ESTIMATE || weightKg <= 0) return null;
  const r = estimate1RM(weightKg, reps);
  return 'value' in r ? r.value : null;
}

/** Working weights from a 1RM: what to load for a number of reps (inverse of the same estimate). */
export function loadFor(oneRm: number, reps: number): number {
  if (reps <= 1) return oneRm;
  // Mean of inverse Epley and inverse Brzycki, rounded to 0.5 kg (what a gym can load).
  const e = oneRm / (1 + reps / 30);
  const b = (oneRm * (37 - reps)) / 36;
  return Math.round(((e + b) / 2) * 2) / 2;
}

export const PERCENT_TABLE = [95, 90, 85, 80, 75, 70, 65, 60] as const;

export function summariseGym(sets: GymSet[]): GymExerciseSummary[] {
  const by = new Map<string, GymSet[]>();
  for (const s of sets) {
    const k = gymKey(s.exerciseName);
    by.set(k, [...(by.get(k) ?? []), s]);
  }
  const out: GymExerciseSummary[] = [];
  for (const [key, list] of by) {
    const sorted = [...list].sort((a, b) => (a.day === b.day ? a.setNo - b.setNo : a.day < b.day ? -1 : 1));
    const days = new Map<string, number>();
    let best: GymExerciseSummary['best'] = null;
    let volume = 0;
    for (const s of sorted) {
      volume += s.weightKg * s.reps;
      const v = setEstimate(s.weightKg, s.reps);
      if (v === null) continue;
      days.set(s.day, Math.max(days.get(s.day) ?? 0, v));
      if (!best || v > best.value) best = { value: v, day: s.day, weightKg: s.weightKg, reps: s.reps };
    }
    const history = [...days].map(([day, value]) => ({ day, value })).slice(-20);
    const lastDay = sorted[sorted.length - 1].day;
    const lastSets = sorted.filter((s) => s.day === lastDay);
    const topOf = (l: GymSet[]) => l.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
    const top = topOf(lastSets);
    const dayList = [...new Set(sorted.map((s) => s.day))].slice(-12).map((day) => {
      const t = topOf(sorted.filter((s) => s.day === day));
      return { day, weightKg: t.weightKg, reps: t.reps, rir: t.rir, estimate: setEstimate(t.weightKg, t.reps) };
    });
    const before = history.filter((h) => h.day < lastDay);
    const latest = days.get(lastDay);
    out.push({
      key,
      name: sorted[sorted.length - 1].exerciseName.trim(),
      exerciseId: sorted.find((s) => s.exerciseId)?.exerciseId ?? null,
      best,
      last: { day: lastDay, weightKg: top.weightKg, reps: top.reps, sets: lastSets.length },
      history,
      latestIsPr: latest !== undefined && before.length > 0 && latest > Math.max(...before.map((h) => h.value)),
      totalSets: sorted.length,
      volumeKg: Math.round(volume),
      next: nextLoad({ weightKg: top.weightKg, reps: top.reps, rir: top.rir }),
      days: dayList,
    });
  }
  // Most recently trained first.
  return out.sort((a, b) => (a.last!.day === b.last!.day ? a.name.localeCompare(b.name) : a.last!.day < b.last!.day ? 1 : -1));
}
