import { describe, expect, it } from 'vitest';
import { plannedWorkoutItemsForDay, workoutItemsForDay } from './workout-schedule';

const exercises = [
  { id: 'daily', days: [1, 2, 3, 4, 5, 6, 7] },
  { id: 'monday', days: [1] },
  { id: 'tuesday', days: [2] },
  { id: 'weekend', days: [6, 7] },
];

describe('workout date selection shared by preview and player', () => {
  it('shows only exercises scheduled on the chosen weekday', () => {
    expect(workoutItemsForDay(exercises, '2026-10-26').map((x) => x.id)).toEqual(['daily', 'monday']);
    expect(workoutItemsForDay(exercises, '2026-10-27').map((x) => x.id)).toEqual(['daily', 'tuesday']);
    expect(workoutItemsForDay(exercises, '2026-11-01').map((x) => x.id)).toEqual(['daily', 'weekend']);
  });

  it('preserves existing manual-start behaviour on a rest day', () => {
    const onlyMonday = [{ id: 'one', days: [1] }, { id: 'two', days: [1] }];
    expect(plannedWorkoutItemsForDay(onlyMonday, '2026-10-27')).toEqual([]);
    expect(workoutItemsForDay(onlyMonday, '2026-10-27')).toEqual(onlyMonday);
  });

  it('keeps exercise order and never mutates the programme', () => {
    const original = exercises.map((x) => x.id);
    workoutItemsForDay(exercises, '2026-10-26');
    expect(exercises.map((x) => x.id)).toEqual(original);
  });

  it('handles an empty programme', () => {
    expect(workoutItemsForDay([], '2026-10-26')).toEqual([]);
  });
});
