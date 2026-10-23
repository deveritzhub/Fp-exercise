import { isoWeekday, parseDate } from './adherence';

/**
 * Keep the programme preview and patient workout in sync.
 * A workout started on an unscheduled day intentionally falls back to all
 * exercises, matching the existing patient's manual-start behaviour.
 */
export function plannedWorkoutItemsForDay<T extends { days: readonly number[] }>(
  items: readonly T[],
  localISODate: string,
): T[] {
  const weekday = isoWeekday(parseDate(localISODate));
  return items.filter((item) => item.days.includes(weekday));
}

export function workoutItemsForDay<T extends { days: readonly number[] }>(
  items: readonly T[],
  localISODate: string,
): T[] {
  const planned = plannedWorkoutItemsForDay(items, localISODate);
  return planned.length ? planned : [...items];
}
