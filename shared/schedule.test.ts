import { describe, expect, it } from 'vitest';
import { dayStatus, itemsForDate, nextSessionDate } from './schedule';
import { equipmentText, splitEquipment } from './taxonomy';

// 2026-10-19 is a Monday.
const items = [
  { id: 'a', days: [1, 3, 5] },
  { id: 'b', days: [1, 3, 5] },
  { id: 'c', days: [2, 4] },
  { id: 'd', days: [2, 4] },
];
const p = { startDate: '2026-10-19', endDate: '2026-11-30' };

describe('planning shared by patient app and preview', () => {
  it('shows only the exercises planned on that weekday', () => {
    expect(itemsForDate(p, items, '2026-10-19').map((i) => i.id)).toEqual(['a', 'b']);
    expect(itemsForDate(p, items, '2026-10-20').map((i) => i.id)).toEqual(['c', 'd']);
    expect(itemsForDate(p, items, '2026-10-25')).toEqual([]);
  });
  it('respects start and end dates', () => {
    expect(itemsForDate(p, items, '2026-10-12')).toEqual([]);
    expect(itemsForDate(p, items, '2026-12-01')).toEqual([]);
    expect(dayStatus(p, items, '2026-10-12')).toBe('not_started');
    expect(dayStatus(p, items, '2026-12-01')).toBe('ended');
    expect(dayStatus(p, items, '2026-10-25')).toBe('rest');
    expect(dayStatus(p, items, '2026-10-19')).toBe('training');
  });
  it('keeps the programme order, never changes the input and handles an empty programme', () => {
    // Edge cases taken over from the review of PR #1.
    const before = items.map((i) => i.id);
    expect(itemsForDate(p, [...items].reverse(), '2026-10-19').map((i) => i.id)).toEqual(['b', 'a']);
    expect(items.map((i) => i.id)).toEqual(before);
    expect(itemsForDate(p, [], '2026-10-19')).toEqual([]);
    expect(nextSessionDate(p, [], '2026-10-19')).toBeNull();
    expect(dayStatus(p, [], '2026-10-19')).toBe('rest');
  });
  it('finds the next session, also before the start date', () => {
    expect(nextSessionDate(p, items, '2026-10-24')).toBe('2026-10-26');
    expect(nextSessionDate(p, items, '2026-10-10')).toBe('2026-10-19');
    expect(nextSessionDate({ startDate: null, endDate: '2026-10-24' }, items, '2026-10-23')).toBeNull();
  });
});

describe('equipment labels match the filters', () => {
  it('treats items next to "none" as optional', () => {
    expect(splitEquipment(['none', 'dumbbell'])).toEqual({ required: [], optional: ['dumbbell'] });
    expect(equipmentText(['none', 'dumbbell'], 'nl')).toBe('Geen materiaal nodig (optioneel: Dumbbell)');
    expect(equipmentText(['none'], 'nl')).toBe('Geen materiaal nodig');
    expect(equipmentText(['bench'], 'en')).toMatch(/bench/i);
  });
});
