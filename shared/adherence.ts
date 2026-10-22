/**
 * Adherence = completed scheduled session-days / planned session-days.
 *
 * A program has a planned session on a calendar day when at least one of its items is scheduled
 * on that ISO weekday and the day falls within the program's start/end dates. A day counts as
 * completed when a completed workout session for that program exists on that (local) day.
 *
 * This is a descriptive engagement metric for the therapist. It is NOT a clinical score.
 */
export type ProgramSchedule = {
  id: string;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  activatedOn?: string | null; // fallback start when no start date
  weekdays: number[]; // union of item weekdays, ISO 1..7
};

export const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const isoWeekday = (d: Date) => ((d.getDay() + 6) % 7) + 1;

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function plannedDays(p: ProgramSchedule, from: Date, to: Date): string[] {
  const out: string[] = [];
  const start = p.startDate ?? p.activatedOn ?? null;
  const days = new Set(p.weekdays);
  if (!days.size) return out;
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur <= end) {
    const iso = toISODate(cur);
    const inRange = (!start || iso >= start) && (!p.endDate || iso <= p.endDate);
    if (inRange && days.has(isoWeekday(cur))) out.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export type AdherenceResult = { planned: number; completed: number; rate: number | null };

/** completedDays: map programId -> set of YYYY-MM-DD with a completed session */
export function adherence(
  programs: ProgramSchedule[],
  completedDays: Map<string, Set<string>>,
  from: Date,
  to: Date,
): AdherenceResult {
  let planned = 0;
  let completed = 0;
  for (const p of programs) {
    const days = plannedDays(p, from, to);
    planned += days.length;
    const done = completedDays.get(p.id);
    if (done) completed += days.filter((d) => done.has(d)).length;
  }
  return { planned, completed, rate: planned ? completed / planned : null };
}

/** Weekly adherence buckets for the last `weeks` ISO weeks ending at `today` (inclusive). */
export function weeklyAdherence(
  programs: ProgramSchedule[],
  completedDays: Map<string, Set<string>>,
  today: Date,
  weeks = 6,
): Array<AdherenceResult & { weekStart: string }> {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - (isoWeekday(monday) - 1));
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = new Date(monday);
    from.setDate(from.getDate() - 7 * i);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    const cappedTo = to > today ? today : to;
    out.push({ weekStart: toISODate(from), ...adherence(programs, completedDays, from, cappedTo) });
  }
  return out;
}

export type DayState = 'done' | 'missed' | 'planned' | 'rest' | 'today' | 'today-done';

/** Mon–Sun of the current ISO week with a state per day, for the patient's week strip. */
export function weekStrip(programs: ProgramSchedule[], completedDays: Map<string, Set<string>>, today: Date) {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - (isoWeekday(monday) - 1));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const planned = new Set(programs.flatMap((p) => plannedDays(p, monday, sunday)));
  const done = new Set([...completedDays.values()].flatMap((s) => [...s]));
  const todayIso = toISODate(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const iso = toISODate(d);
    let state: DayState;
    if (iso === todayIso) state = done.has(iso) ? 'today-done' : planned.has(iso) ? 'today' : 'rest';
    else if (done.has(iso)) state = 'done';
    else if (!planned.has(iso)) state = 'rest';
    else state = iso < todayIso ? 'missed' : 'planned';
    return { date: iso, weekday: i + 1, state };
  });
}

/**
 * Streak = number of consecutive planned training days completed, counting back from today.
 * Rest days do not break a streak; a planned day today that is not done yet does not break it either.
 */
export function streak(programs: ProgramSchedule[], completedDays: Map<string, Set<string>>, today: Date, lookbackDays = 120) {
  const from = new Date(today);
  from.setDate(from.getDate() - lookbackDays);
  const planned = programs.flatMap((p) => plannedDays(p, from, today));
  const plannedSet = [...new Set(planned)].sort().reverse();
  const done = new Set([...completedDays.values()].flatMap((s) => [...s]));
  const todayIso = toISODate(today);
  let n = 0;
  for (const day of plannedSet) {
    if (done.has(day)) n++;
    else if (day === todayIso) continue;
    else break;
  }
  return n;
}
