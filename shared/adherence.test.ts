import { describe, it, expect } from 'vitest';
import { adherence, plannedDays, weeklyAdherence, parseDate } from './adherence';

describe('adherence', () => {
  const prog = { id: 'p', startDate: '2026-10-05', endDate: '2026-10-18', weekdays: [1, 3, 5] }; // Mon/Wed/Fri

  it('plans sessions only on scheduled weekdays within program dates', () => {
    const days = plannedDays(prog, parseDate('2026-10-01'), parseDate('2026-10-31'));
    expect(days).toEqual(['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16']);
  });

  it('computes completed/planned and ignores sessions on unscheduled days', () => {
    const done = new Map([['p', new Set(['2026-10-05', '2026-10-07', '2026-10-08'])]]);
    const r = adherence([prog], done, parseDate('2026-10-05'), parseDate('2026-10-11'));
    expect(r).toEqual({ planned: 3, completed: 2, rate: 2 / 3 });
  });

  it('returns null rate when nothing is planned', () => {
    expect(adherence([], new Map(), parseDate('2026-10-05'), parseDate('2026-10-11')).rate).toBeNull();
  });

  it('falls back to the activation date when no start date is set', () => {
    const p = { id: 'q', startDate: null, endDate: null, activatedOn: '2026-10-14', weekdays: [1, 2, 3, 4, 5, 6, 7] };
    expect(plannedDays(p, parseDate('2026-10-10'), parseDate('2026-10-16'))).toHaveLength(3);
  });

  it('weekly buckets start on Monday and are capped at today', () => {
    const w = weeklyAdherence([prog], new Map(), parseDate('2026-10-14'), 2);
    expect(w.map((x) => x.weekStart)).toEqual(['2026-10-05', '2026-10-12']);
    expect(w[1].planned).toBe(2); // Mon 12 + Wed 14 (Fri 16 is in the future)
  });
});
