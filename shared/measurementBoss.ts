/**
 * Measurement boss and the cosmetic heirloom.
 * Progress is the patient's own measurements against a therapist-set target.
 * Reps, sets and extra load never move the bar or the heirloom.
 * A later worse value does not undo a defeat and does not lower the heirloom.
 */
export type Comparator = 'gte' | 'lte' | 'recorded';
export type MeasurePoint = { at: string; value: number };

export function meetsTarget(value: number, target: number, comparator: Comparator) {
  if (comparator === 'recorded') return Number.isFinite(value);
  return comparator === 'gte' ? value >= target : value <= target;
}

function ordered(points: readonly MeasurePoint[]) {
  return [...points].filter((p) => Number.isFinite(p.value)).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/** 0..1 of the way from the first value toward the target. Already there is 1. */
export function progressRatio(baseline: number, value: number, target: number, comparator: Comparator) {
  if (comparator === 'recorded') return Number.isFinite(value) ? 1 : 0;
  if (meetsTarget(baseline, target, comparator) || meetsTarget(value, target, comparator)) return 1;
  const span = comparator === 'gte' ? target - baseline : baseline - target;
  if (span <= 0) return 0;
  const moved = comparator === 'gte' ? value - baseline : baseline - value;
  return Math.max(0, Math.min(1, moved / span));
}

export function bossProgress(points: readonly MeasurePoint[], target: number, comparator: Comparator) {
  const list = ordered(points);
  if (!list.length || !Number.isFinite(target)) {
    return { baseline: null as number | null, latest: null as number | null, best: null as number | null, ratio: 0, bestRatio: 0, remaining: null as number | null, defeated: false };
  }
  const baseline = list[0].value;
  const latest = list[list.length - 1].value;
  const best = comparator === 'gte' ? Math.max(...list.map((p) => p.value)) : Math.min(...list.map((p) => p.value));
  const remaining = comparator === 'recorded'
    ? (list.length ? 0 : null)
    : comparator === 'gte' ? Math.max(0, target - latest) : Math.max(0, latest - target);
  return {
    baseline,
    latest,
    best,
    ratio: progressRatio(baseline, latest, target, comparator),
    bestRatio: progressRatio(baseline, best, target, comparator),
    remaining: meetsTarget(latest, target, comparator) ? 0 : remaining,
    defeated: list.some((p) => meetsTarget(p.value, target, comparator)),
  };
}

/** Five cosmetic steps. 0 is the first form; reaching the target is the fifth. */
export function heirloomTier(bestRatio: number): 1 | 2 | 3 | 4 | 5 {
  const r = Math.max(0, Math.min(1, bestRatio));
  return (1 + Math.min(4, Math.floor(r * 4 + 1e-9))) as 1 | 2 | 3 | 4 | 5;
}

/** Average of each goal's best progress. Empty goals stay at the base form. */
export function heirloomRatio(bestRatios: readonly number[]) {
  if (!bestRatios.length) return 0;
  const sum = bestRatios.reduce((n, r) => n + Math.max(0, Math.min(1, r)), 0);
  return sum / bestRatios.length;
}

export const HEIRLOOM_KINDS = ['weapon', 'shield', 'amulet'] as const;
export type HeirloomKind = (typeof HEIRLOOM_KINDS)[number];
