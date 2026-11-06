/**
 * Strength module rules from the FP app update (W05, W07, W08, W09). Shared by server and app.
 * These are programme rules set by the physiotherapist's template, not medical advice.
 */

/** Estimates are only meaningful up to 10 repetitions (above that they become inaccurate). */
export const MAX_REPS_FOR_ESTIMATE = 10;

export const epley = (weightKg: number, reps: number) => weightKg * (1 + reps / 30);
export const brzycki = (weightKg: number, reps: number) => (weightKg * 36) / (37 - reps);

export type OneRmEstimate = { epley: number; brzycki: number; value: number } | { warning: 'too_many_reps' | 'no_data' };

/** Estimated 1RM for one set; the value shown is the average of Epley and Brzycki, rounded to 0.5 kg. */
export function estimate1RM(weightKg: number | null | undefined, reps: number | null | undefined): OneRmEstimate {
  if (!weightKg || !reps || reps < 1) return { warning: 'no_data' };
  if (reps > MAX_REPS_FOR_ESTIMATE) return { warning: 'too_many_reps' };
  if (reps === 1) return { epley: weightKg, brzycki: weightKg, value: weightKg };
  const e = epley(weightKg, reps);
  const b = brzycki(weightKg, reps);
  return { epley: round1(e), brzycki: round1(b), value: Math.round(((e + b) / 2) * 2) / 2 };
}
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Best estimated 1RM of a list of sets (sets above 10 reps are ignored). */
export function best1RM(sets: { weightKg: number | null; reps: number | null }[]) {
  let best: number | null = null;
  for (const s of sets) {
    const r = estimate1RM(s.weightKg, s.reps);
    if ('value' in r && (best === null || r.value > best)) best = r.value;
  }
  return best;
}

/** Rep range from the programme (e.g. "5-8 herhalingen"); falls back to the item's reps as the upper bound. */
export function repRange(notes: string | null | undefined, reps: number | null | undefined): { min: number; max: number } | null {
  const m = (notes ?? '').match(/(\d+)\s*[-–]\s*(\d+)\s*herhalingen/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  return reps ? { min: reps, max: reps } : null;
}

export type SessionSummary = { sets: { weightKg: number | null; reps: number | null }[] };
export type Advice =
  | { kind: 'increase'; fromKg: number; toKgMin: number; toKgMax: number }
  | { kind: 'plateau' }
  | { kind: 'keep' }
  | { kind: 'none' };

/**
 * Double progression (W07): when every set of the last session reached the top of the rep range,
 * advise adding 2.5–5 kg. When the best estimated 1RM did not improve over the last 3 sessions,
 * advise one extra set or a deload week. `sessions` is newest first.
 */
export function progressionAdvice(sessions: SessionSummary[], range: { min: number; max: number } | null): Advice {
  const last = sessions[0];
  if (!last || !last.sets.length || !range) return { kind: 'none' };
  const done = last.sets.filter((s) => s.reps !== null && s.weightKg !== null);
  if (done.length && done.every((s) => (s.reps ?? 0) >= range.max)) {
    const kg = Math.max(...done.map((s) => s.weightKg ?? 0));
    return { kind: 'increase', fromKg: kg, toKgMin: kg + 2.5, toKgMax: kg + 5 };
  }
  if (sessions.length >= 4) {
    const bestOf = (s: SessionSummary) => best1RM(s.sets) ?? 0;
    const before = bestOf(sessions[3]);
    const recent = sessions.slice(0, 3).map(bestOf);
    if (before > 0 && recent.every((v) => v <= before)) return { kind: 'plateau' };
  }
  return { kind: 'keep' };
}

/** A direct 1RM test is not offered in the first 4 weeks of a programme (W08). */
export const ONE_RM_TEST_MIN_DAYS = 28;
export function oneRmTestAllowed(programStart: string | Date | null | undefined, now = new Date()) {
  if (!programStart) return false;
  const start = new Date(programStart);
  return now.getTime() - start.getTime() >= ONE_RM_TEST_MIN_DAYS * 86400_000;
}

/** Screening before a direct 1RM test. Any "yes" stops the test (W08). */
export const ONE_RM_SCREENING = [
  { key: 'heart', nl: 'Heb je bekende hartklachten of hoge bloeddruk?', en: 'Do you have known heart problems or high blood pressure?' },
  { key: 'dizzy', nl: 'Heb je last van duizeligheid of zwart zien?', en: 'Do you experience dizziness or blacking out?' },
  { key: 'chest', nl: 'Heb je pijn op de borst (gehad) bij inspanning?', en: 'Do you have (or have you had) chest pain during exercise?' },
] as const;

/** Transition checklist from rehabilitation to the strength module (W09). The therapist confirms. */
export const STRENGTH_TRANSITION = [
  'Pijnvrij bij dagelijkse belasting en bij belastende oefeningen',
  'Kracht van het geopereerde of aangedane been of schouder minimaal 90 procent van de andere zijde',
  'Zelfstandig squat tot 90 graden zonder klachten',
  'Patiënt begrijpt het progressiemodel en de rode vlaggen',
] as const;

/** Red flags during strength training (FP strength module safety section). */
export const STRENGTH_RED_FLAGS = ['Pijn op de borst', 'Duizeligheid of zwart zien', 'Scherpe pijn in een gewricht', 'Gevoelloosheid of uitstraling in een arm of been'];
