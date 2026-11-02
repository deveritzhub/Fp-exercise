/**
 * Patient dashboard status, shared between UI and tests.
 *
 * A paused programme is not completed, and a workout left open on a
 * non-scheduled day must not be presented as a rest day.
 */
export type TodayViewProgram = {
  today: { scheduled: number; done: boolean };
  paused: boolean;
  openSession: unknown | null;
};

export function isActionableToday(p: TodayViewProgram): boolean {
  return !p.paused && ((p.today.scheduled > 0 && !p.today.done) || Boolean(p.openSession));
}

export function summarizePatientDay<T extends TodayViewProgram>(programs: readonly T[]) {
  const scheduled = programs.filter((p) => p.today.scheduled > 0);
  const resumeOther = programs.filter((p) => p.today.scheduled === 0 && (p.paused || Boolean(p.openSession)));
  const remaining = programs.filter(isActionableToday).length;
  const pausedToday = scheduled.filter((p) => p.paused).length;
  return {
    scheduled,
    resumeOther,
    remaining,
    pausedToday,
    showRestCard: programs.length > 0 && scheduled.length === 0 && resumeOther.length === 0,
  };
}
