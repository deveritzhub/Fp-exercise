import { estimate1RM, MAX_REPS_FOR_ESTIMATE } from './strength';

/**
 * Krachtlog: sets of any exercise, in the gym, at home or in the practice. The estimated 1RM is the
 * mean of Epley and Brzycki (shared/strength.ts), only for sets of 1–10 reps; above that the estimate
 * is unreliable and the set still counts as volume.
 */
export const GYM_PLACES = ['gym', 'home', 'practice'] as const;
export type GymPlace = (typeof GYM_PLACES)[number];
export const GYM_LIMITS = { weightMax: 1000, repsMax: 100, setsPerDay: 30, nameMin: 2, nameMax: 80 } as const;

export type GymSet = {
  id: string;
  day: string; // YYYY-MM-DD
  exerciseId: string | null;
  exerciseName: string;
  setNo: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
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
};

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
    const top = lastSets.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
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
    });
  }
  // Most recently trained first.
  return out.sort((a, b) => (a.last!.day === b.last!.day ? a.name.localeCompare(b.name) : a.last!.day < b.last!.day ? 1 : -1));
}
