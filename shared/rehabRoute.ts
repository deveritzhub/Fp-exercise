/**
 * Patient-safe rehabilitation route.
 * Only the therapist-approved current phase and public, patient-facing goals are used.
 * Phase-transition criteria are deliberately not exposed, edited or inferred.
 */
export type RehabPhase = {
  no: number;
  name: string | null;
  weeks: string | null;
  goal: string | null;
  status: 'done' | 'current' | 'next';
};

export function rehabRoute(phases: readonly RehabPhase[], currentNo: number | null) {
  const ordered = [...phases].sort((a, b) => a.no - b.no);
  const current = ordered.find((p) => p.status === 'current')
    ?? ordered.find((p) => p.no === currentNo)
    ?? null;
  const completed = ordered.filter((p) => p.status === 'done').length;
  return { ordered, current, completed, total: ordered.length };
}

/** Inspecting a future phase is read-only and never changes the actual clinical phase. */
export function inspectedPhase(phases: readonly RehabPhase[], selectedNo: number | null, currentNo: number | null) {
  const route = rehabRoute(phases, currentNo);
  return route.ordered.find((p) => p.no === selectedNo)
    ?? route.current
    ?? route.ordered[0]
    ?? null;
}
