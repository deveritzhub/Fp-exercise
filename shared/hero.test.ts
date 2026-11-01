import { describe, expect, it } from 'vitest';
import { BADGES, BODY_AREAS, CHEST_XP, DEFAULT_LOOK, GEAR, QUEST_XP, averagePain, levelFor, questTimeline, questXp, skillLevel, skillOfWeek, skillXpForLevel, skillsForExercise, titleFor, validLook, weeklyQuests, xpFor, xpForLevel, type SkillKey } from './hero';

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
    const max = { heroName: 'Max', ...DEFAULT_LOOK, frame: 'm', hair: 'curly', beard: 'stubble' };
    expect(validLook(max)).toBe(true);
    expect(validLook({ ...max, skin: 'pink' })).toBe(false);
    expect(validLook({ ...max, build: 'huge' })).toBe(false);
    expect(averagePain([4, 6])).toBe(5);
    expect(averagePain([])).toBeNull();
  });
});

describe('skills and quest', () => {
  it('maps exercises to skills', () => {
    expect(skillsForExercise(['strength', 'eccentric'], 'squat')).toEqual(['strength']);
    expect(skillsForExercise(['balance', 'motor_control'], null).sort()).toEqual(['balance', 'stability']);
    expect(skillsForExercise([], 'hinge')).toEqual(['strength']);
    expect(skillsForExercise([], 'stretch')).toEqual(['mobility']);
  });

  it('skill levels climb from 1 to 99', () => {
    expect(skillLevel(0).level).toBe(1);
    expect(skillLevel(25).level).toBe(2);
    expect(skillLevel(skillXpForLevel(10)).level).toBe(10);
    expect(skillLevel(10_000_000)).toMatchObject({ level: 99, progress: 1 });
  });

  it('quest: week, progress and expected end follow the phase schedule', () => {
    const phases = [{ no: 1, weeks: '1-4' }, { no: 2, weeks: '5-8' }, { no: 3, weeks: '9-12' }];
    // Phase 2 started on 2 Nov, so the series started 4 weeks earlier (5 Oct) and ends after 12 weeks.
    const q = questTimeline({ phases, currentNo: 2, phaseStart: '2026-11-02', today: new Date('2026-11-09T12:00:00') })!;
    expect(q.week).toBe(6);
    expect(q.totalWeeks).toBe(12);
    expect(q.expectedEnd).toBe('2026-12-28');
    expect(q.weeksLeft).toBe(7);
    expect(q.progress).toBeCloseTo(5 / 12, 2);
    expect(questTimeline({ phases: [{ no: 1, weeks: 'n.v.t.' }], currentNo: 1, phaseStart: '2026-11-02' })).toBeNull();
  });
});

describe('weekly quests and gear', () => {
  it('quests never ask more than the planned days; all three give the chest', () => {
    const w = { planned: 5, trainedDays: 3, checkins: 1, skillLogs: { balance: 2 } };
    const q = weeklyQuests(w, 'balance');
    expect(q.map((x) => [x.key, x.target, x.done])).toEqual([['train', 3, true], ['checkin', 1, true], ['skill', 2, true]]);
    expect(questXp(q)).toBe(3 * QUEST_XP + CHEST_XP);
    expect(weeklyQuests({ ...w, planned: 2, trainedDays: 1 }, 'balance')[0]).toMatchObject({ target: 2, progress: 1, done: false });
    expect(questXp(weeklyQuests({ planned: 0, trainedDays: 0, checkins: 0, skillLogs: {} }, 'balance'))).toBe(0);
  });

  it('the skill of the week rotates through the patient’s own skills', () => {
    const skills: SkillKey[] = ['strength', 'balance'];
    const a = skillOfWeek('2026-11-02', skills);
    const b = skillOfWeek('2026-11-09', skills);
    expect(new Set([a, b])).toEqual(new Set(skills));
    expect(skillOfWeek('2026-11-02', [])).toBe('mobility');
  });

  it('gear unlocks from real progress', () => {
    const none = { skills: {}, sessions: 0, phasesCompleted: 0, chestWeeks: 0 };
    expect(GEAR.filter((g) => g.unlocked(none))).toHaveLength(0);
    expect(GEAR.filter((g) => g.unlocked({ ...none, skills: { discipline: 5 }, sessions: 25 })).map((g) => g.key)).toEqual(['headband', 'gold_shoes']);
  });
});
