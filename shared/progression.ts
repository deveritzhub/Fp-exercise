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

/** Pain after workouts rising three times in a row to at least 4/10 (6+ is "high pain" already). */
export const RISING = { sessions: 3, minLast: 4 } as const;

/** `recent`: newest first. Only workouts with a pain score count. A suggestion to look, not a diagnosis. */
export function painRising(recent: SessionScore[]): { from: number; to: number } | null {
  const pains = recent.map((s) => s.pain).filter((p): p is number => p !== null).slice(0, RISING.sessions);
  if (pains.length < RISING.sessions) return null;
  const [last, ...older] = pains;
  // Strictly rising over time: each workout hurt more than the one before.
  for (let i = 0; i < pains.length - 1; i++) if (pains[i] <= pains[i + 1]) return null;
  if (last < RISING.minLast) return null;
  return { from: older[older.length - 1], to: last };
}

/** Pain map: the same spot at least 2 points worse within two weeks (check-ins at least a week apart). */
export const AREA_RISING = { days: 14, minGapDays: 7, minRise: 2 } as const;

export type AreaScore = { area: string; score: number; at: string | Date };

/** Every area whose score rose by 2+ points between the first and the last check-in of the last two weeks. */
export function areaPainRising(entries: AreaScore[], now = new Date()): { area: string; from: number; to: number }[] {
  const since = now.getTime() - AREA_RISING.days * 86400_000;
  const byArea = new Map<string, { score: number; t: number }[]>();
  for (const e of entries) {
    const t = new Date(e.at).getTime();
    if (t < since || e.area === 'none') continue;
    byArea.set(e.area, [...(byArea.get(e.area) ?? []), { score: e.score, t }]);
  }
  const out: { area: string; from: number; to: number }[] = [];
  for (const [area, list] of byArea) {
    list.sort((a, b) => a.t - b.t);
    const first = list[0];
    const last = list[list.length - 1];
    if (last.t - first.t < AREA_RISING.minGapDays * 86400_000) continue;
    if (last.score - first.score >= AREA_RISING.minRise) out.push({ area, from: first.score, to: last.score });
  }
  return out.sort((a, b) => b.to - b.from - (a.to - a.from));
}
