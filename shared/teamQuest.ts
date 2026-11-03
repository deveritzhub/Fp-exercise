/**
 * Privacy boundary for future team quests.
 * The server must derive daily participation from each participant's OWN prescribed plan
 * and only after separate, revocable consent. Never expose personal events to peers.
 */
export type TeamDay = { participantToken: string; optedIn: boolean; prescribed: boolean; didPlan: boolean; restDay: boolean; medicalHold: boolean };
export type TeamProgress = { participants: number; contributed: number; protectedRest: number; status: 'not_started' | 'in_progress' | 'complete' };
export function aggregateTeamDay(days: readonly TeamDay[]): TeamProgress {
  const members = days.filter(d=>d.optedIn);
  if(members.length<2)return {participants:members.length,contributed:0,protectedRest:0,status:'not_started'};
  const protectedRest=members.filter(d=>d.restDay||d.medicalHold).length;
  const contributed=members.filter(d=>d.medicalHold||d.restDay||(d.prescribed&&d.didPlan)).length;
  return { participants:members.length,contributed,protectedRest,status:contributed===members.length?'complete':'in_progress' };
}
/** A deliberately minimal output: participant IDs and individual health behaviour stay server-side. */
export function publicTeamSummary(progress:TeamProgress){
  return { participants:progress.participants,contributed:progress.contributed,status:progress.status };
}
