import { describe, expect, it } from 'vitest';
import { BADGES, BODY_AREAS, averagePain, levelFor, titleFor, validLook, xpFor, xpForLevel } from './hero';

describe('sports hero rules', () => {
  it('levels grow gently and progress is between 0 and 1', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelFor(0)).toMatchObject({ level: 1, progress: 0 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(450)).toMatchObject({ level: 3, from: 300, to: 600, progress: 0.5 });
  });

  it('XP rewards workouts and honest reporting, not training through pain', () => {
    const base = xpFor({ sessions: 4, sessionsWithPain: 0, redFlags: 0, checkinWeeks: 0 });
    // Reporting pain (any score) adds XP; it never subtracts.
    expect(xpFor({ sessions: 4, sessionsWithPain: 4, redFlags: 0, checkinWeeks: 0 })).toBeGreaterThan(base);
    // Reporting a warning sign is rewarded too.
    expect(xpFor({ sessions: 4, sessionsWithPain: 0, redFlags: 1, checkinWeeks: 0 })).toBeGreaterThan(base);
  });

  it('titles follow the level', () => {
    expect(titleFor(1)).toBe('Rookie');
    expect(titleFor(4)).toBe('Teamspeler');
    expect(titleFor(12, false)).toBe('Champion');
  });

  it('badges are earned from real progress', () => {
    const none = { sessions: 0, sessionsWithPain: 0, redFlags: 0, fullWeeks: 0, phasesCompleted: 0, painBaseline: null, painNow: null };
    expect(BADGES.filter((b) => b.earned(none))).toHaveLength(0);
    const earned = BADGES.filter((b) => b.earned({ ...none, sessions: 10, painBaseline: 6, painNow: 3 })).map((b) => b.key);
    expect(earned).toEqual(['first_session', 'sessions_10', 'pain_down']);
    expect(BADGES.find((b) => b.key === 'pain_down')!.earned({ ...none, painBaseline: 6, painNow: 3.5 })).toBe(false);
  });

  it('body areas are unique and inside the figure', () => {
    expect(new Set(BODY_AREAS.map((a) => a.key)).size).toBe(BODY_AREAS.length);
    for (const a of BODY_AREAS) {
      expect(a.x).toBeGreaterThan(0);
      expect(a.x).toBeLessThan(200);
      expect(a.y).toBeLessThan(420);
    }
  });

  it('only known looks are accepted', () => {
    expect(validLook({ heroName: 'Max', skin: 's3', hair: 'curly', outfit: 'forest', sport: 'running' })).toBe(true);
    expect(validLook({ heroName: 'Max', skin: 'pink', hair: 'curly', outfit: 'forest', sport: 'running' })).toBe(false);
    expect(averagePain([4, 6])).toBe(5);
    expect(averagePain([])).toBeNull();
  });
});
