/**
 * Read-only clinical overview derived from actual patient workout feedback.
 * No missing physical measurements are interpolated or inferred from adherence,
 * XP, elapsed time, pain or perceived workout difficulty.
 */
export type RecordedSession = {
  id: string;
  completedAt: string | null;
  pain: number | null;
  difficulty: number | null;
  reviewedAt: string | null;
  feedback: string | null;
  logs: { feedback: string | null }[];
};
export type SessionPoint = {
  id: string;
  day: string;
  pain: number | null;
  exertion: number | null;
  reviewed: boolean;
};
export function clinicalTimeline(sessions: readonly RecordedSession[], limit = 12) {
  const points = sessions.filter(s => !!s.completedAt).map(s => ({
    id: s.id,
    day: s.completedAt!.slice(0, 10),
    pain: safeScore(s.pain),
    exertion: safeScore(s.difficulty),
    reviewed: !!s.reviewedAt,
  })).sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id)).slice(-limit);
  const reviewCount = sessions.filter(s => !!s.completedAt && !s.reviewedAt &&
    ((s.pain !== null && s.pain >= 6) || !!s.feedback || s.logs.some(l=>!!l.feedback))).length;
  const painPoints = points.filter(p=>p.pain!==null);
  const latestPain = painPoints.length ? painPoints[painPoints.length-1].pain : null;
  return { points, latestPain, reviewCount, hasPain: painPoints.length > 0,
    available: { pain: painPoints.length>0, perceivedExertion: points.some(p=>p.exertion!==null),
      rom: false, strength: false, function: false, confidence: false } };
}
function safeScore(n: number | null): number | null {
  return n!==null && Number.isFinite(n) && n>=0 && n<=10 ? n : null;
}
