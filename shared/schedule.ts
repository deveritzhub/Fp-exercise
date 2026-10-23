import { isoWeekday, parseDate, toISODate } from './adherence';

/**
 * Which exercises a patient does on a given day. Used by the patient app (server), the session
 * player and the therapist's patient preview, so all three always show the same "today".
 *
 * A programme runs on a day when the day lies within its start/end dates; an exercise is planned
 * on that day when its weekdays include the ISO weekday.
 */
export type ScheduleWindow = { startDate: string | null; endDate: string | null };

export function runsOn(p: ScheduleWindow, iso: string) {
  return (!p.startDate || p.startDate <= iso) && (!p.endDate || p.endDate >= iso);
}

export function itemsForDate<T extends { days: number[] }>(p: ScheduleWindow, items: T[], iso: string): T[] {
  if (!runsOn(p, iso)) return [];
  const wd = isoWeekday(parseDate(iso));
  return items.filter((i) => i.days.includes(wd));
}

/** The first day after `fromIso` with at least one planned exercise (within two weeks), or null. */
export function nextSessionDate(p: ScheduleWindow, items: { days: number[] }[], fromIso: string, horizonDays = 14): string | null {
  const d = parseDate(fromIso);
  for (let k = 1; k <= horizonDays; k++) {
    d.setDate(d.getDate() + 1);
    const iso = toISODate(d);
    if (p.endDate && iso > p.endDate) return null;
    if (itemsForDate(p, items, iso).length) return iso;
  }
  return null;
}

/** Why there is nothing to do on a day: before the start, after the end, or a rest day. */
export function dayStatus(p: ScheduleWindow, items: { days: number[] }[], iso: string): 'training' | 'not_started' | 'ended' | 'rest' {
  if (p.startDate && iso < p.startDate) return 'not_started';
  if (p.endDate && iso > p.endDate) return 'ended';
  return itemsForDate(p, items, iso).length ? 'training' : 'rest';
}
