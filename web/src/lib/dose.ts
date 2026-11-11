import type { Exercise } from './types';

export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * The one default dose for an exercise, used by quick add and by the programme editor alike:
 * the library defaults (sets, reps, hold, rest, tempo, frequency) on every day.
 */
export function defaultDose(e: Pick<Exercise, 'defaults'>) {
  const d = e.defaults;
  return { sets: d.sets, reps: d.reps, holdS: d.holdS, restS: d.restS, tempo: d.tempo ?? null, frequency: d.frequency ?? null, days: ALL_DAYS };
}

export type DoseProblem = 'no_dose' | 'no_days';

/** Empty fields stay empty (never 0); an exercise needs at least sets, reps or a hold time, and a day. */
export function doseProblems(i: { sets: number | null; reps: number | null; holdS: number | null; days: number[] }): DoseProblem[] {
  const out: DoseProblem[] = [];
  if (i.sets == null && i.reps == null && i.holdS == null) out.push('no_dose');
  if (!i.days.length) out.push('no_days');
  return out;
}
