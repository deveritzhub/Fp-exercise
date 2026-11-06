/**
 * Progression signal from the patient's own scores after recent workouts (effort 0–10 and
 * pain 0–10). A suggestion for the therapist, never an automatic change to the programme.
 */
export type SessionScore = { difficulty: number | null; pain: number | null };
export type ProgressionSignal = { kind: 'ready_heavier' | 'too_heavy'; sessions: number; avgDifficulty: number; maxPain: number } | null;

/** Three light workouts in a row with little pain: ready to load more. */
export const READY = { sessions: 3, maxDifficulty: 3, maxPain: 2 } as const;
/** Two very heavy workouts in a row (high pain has its own signal). */
export const HEAVY = { sessions: 2, minDifficulty: 8, maxPain: 5 } as const;

/** `recent`: the latest completed workouts, newest first. Workouts without scores are skipped. */
export function progressionSignal(recent: SessionScore[]): ProgressionSignal {
  const scored = recent.filter((s): s is { difficulty: number; pain: number } => s.difficulty !== null).map((s) => ({ difficulty: s.difficulty, pain: s.pain ?? 0 }));
  const sum = (xs: { difficulty: number; pain: number }[]) => ({
    avgDifficulty: Math.round((xs.reduce((a, s) => a + s.difficulty, 0) / xs.length) * 10) / 10,
    maxPain: Math.max(...xs.map((s) => s.pain)),
  });
  const heavy = scored.slice(0, HEAVY.sessions);
  if (heavy.length === HEAVY.sessions && heavy.every((s) => s.difficulty >= HEAVY.minDifficulty && s.pain <= HEAVY.maxPain)) {
    return { kind: 'too_heavy', sessions: heavy.length, ...sum(heavy) };
  }
  const light = scored.slice(0, READY.sessions);
  if (light.length === READY.sessions && light.every((s) => s.difficulty <= READY.maxDifficulty && s.pain <= READY.maxPain)) {
    return { kind: 'ready_heavier', sessions: light.length, ...sum(light) };
  }
  return null;
}
