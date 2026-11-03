/**
 * UI-only chapter boss display. Never changes actual phase or exposes private
 * clinical criteria. The server-supplied phase status remains the source of truth.
 */
export type BossDisplay = 'past' | 'review' | 'locked';
export function chapterBossState(status:'done'|'current'|'next'):BossDisplay{
  return status==='done'?'past':status==='current'?'review':'locked';
}
