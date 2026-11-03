/** Read-only clinical timeline from existing, clinician-visible session feedback.
 * Missing ROM/function/confidence assessments must never be fabricated.
 * Scores are observations, not automatic medical alerts or phase approvals.
 */
export type SessionObservation = {
  id: string;
  completedAt: string | null;
  pain: number | null;
  difficulty: number | null;
  reviewedAt: string | null;
  feedback: string | null;
};
export type TimelinePoint = {
  id: string;
  at: string;
  pain: number | null;
  difficulty: number | null;
  reviewed: boolean;
  feedback: boolean;
};
export function clinicalTimeline(sessions: readonly SessionObservation[]): TimelinePoint[] {
  return sessions
    .filter((s): s is SessionObservation & { completedAt: string } =>
      typeof s.completedAt === 'string' && Number.isFinite(Date.parse(s.completedAt)))
    .map((s) => ({
      id: s.id, at: s.completedAt,
      pain: typeof s.pain === 'number' && Number.isFinite(s.pain) && s.pain >= 0 && s.pain <= 10 ? s.pain : null,
      difficulty: typeof s.difficulty === 'number' && Number.isFinite(s.difficulty) && s.difficulty >= 0 && s.difficulty <= 10 ? s.difficulty : null,
      reviewed: !!s.reviewedAt, feedback: !!s.feedback?.trim(),
    }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
}
export function reviewSignals(points: readonly TimelinePoint[]) {
  const unreviewed = points.filter(p => !p.reviewed && (p.feedback || (p.pain !== null && p.pain >= 6)));
  const painPoints = points.filter(p => p.pain !== null);
  const last = painPoints.at(-1) ?? null;
  const previous = painPoints.at(-2) ?? null;
  // Trend is descriptive only, never an automated medical diagnosis.
  const change = last && previous ? last.pain! - previous.pain! : null;
  return { unreviewedCount: unreviewed.length, painChange: change, latestPain: last?.pain ?? null, observations: points.length };
}
