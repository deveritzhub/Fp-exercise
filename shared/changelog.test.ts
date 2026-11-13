import { describe, expect, it } from 'vitest';
import { RELEASES, releasesFor } from './changelog';

describe('version history', () => {
  it('is newest first and starts at the first version', () => {
    const dates = RELEASES.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(dates.at(-1)).toBe('2026-10-22');
    expect(new Set(dates).size).toBe(dates.length);
  });
  it('shows each audience its own items and hides clinical items from coach accounts', () => {
    const coach = releasesFor('patient', false).flatMap((r) => r.items);
    expect(coach.some((x) => x.clinical)).toBe(false);
    expect(coach.every((x) => x.for !== 'staff')).toBe(true);
    expect(releasesFor('staff', true).flatMap((r) => r.items).every((x) => x.for !== 'patient')).toBe(true);
  });
});
