import { describe, expect, it } from 'vitest';
import { weeklyBoss, bossOf, BOSSES, BOSS_HP, coinsEarned, gearScore, wornOutfit, OUTFITS, GEAR_TIERS, SKILL_STARTER, WELCOME_COINS, BADGES, bodyShape, heroPhotoKey, BODY_AREAS, CHEST_XP, COMBO_TITLES, DEFAULT_LOOK, FUTURE_REWARDS, GEAR, QUEST_XP, REWARDS_ARE_COSMETIC, SKILLS, SKILL_DAILY_CAP, SKILL_GEAR, SKILL_XP, TOTAL_LEVEL_SCENES, averagePain, comboTitles, computeSkillXp, disciplineStreak, epley1Rm, friendSkillCard, levelFor, metricInRange, painDropEvents, parseMetric, plannedRestDates, questTimeline, questXp, sceneForTotal, skillLevel, skillLock, skillLockLabel, skillOfWeek, skillTitle, skillXpForLevel, skillsForExercise, strengthAwards, titleFor, validLook, weeklyQuests, xpFor, xpForLevel, type LoggedExercise, type SkillKey, type SkillLockContext, type SkillXpInput } from './hero';

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

  it('gear is sold in five tiers; coins come from hero XP; gear score sums one piece per slot', () => {
    expect(new Set(GEAR.map((g) => g.key)).size).toBe(GEAR.length);
    for (const g of GEAR) {
      expect(g.price).toBe(GEAR_TIERS[g.tier - 1].price);
      expect(g.score).toBeGreaterThan(0);
    }
    // Higher tier: higher price and higher score.
    for (let i = 1; i < GEAR_TIERS.length; i++) expect(GEAR_TIERS[i].price).toBeGreaterThan(GEAR_TIERS[i - 1].price);
    const maxOf = (t: number) => Math.max(...GEAR.filter((g) => g.tier === t).map((g) => g.score));
    const minOf = (t: number) => Math.min(...GEAR.filter((g) => g.tier === t).map((g) => g.score));
    for (let t = 2; t <= 5; t++) expect(minOf(t)).toBeGreaterThan(maxOf(t - 1));
    // Every skill has a cheap starter and its own rare-or-better piece in the shop.
    for (const s of SKILLS) {
      if (s.key === 'knowledge') continue;
      expect(GEAR.find((g) => g.key === SKILL_STARTER[s.key]!.key)!.tier).toBe(1);
      expect(GEAR.find((g) => g.key === SKILL_GEAR[s.key])!.tier).toBeGreaterThanOrEqual(2);
    }
    expect(coinsEarned(0)).toBe(WELCOME_COINS);
    expect(coinsEarned(1000)).toBe(WELCOME_COINS + 100);
    expect(WELCOME_COINS).toBeGreaterThanOrEqual(GEAR_TIERS[0].price);
    expect(gearScore([])).toBe(0);
    expect(gearScore(['cap', 'watch'])).toBe(22);
    // Two head pieces: only the last one counts.
    expect(gearScore(['cap', 'crown'])).toBe(100);
    // Outfits: one slot, sold in the shop like other gear, and they count for the gear score.
    expect(OUTFITS.every((o) => GEAR.some((g) => g.key === o))).toBe(true);
    expect(wornOutfit(['cap', 'team_kit'])).toBe('team_kit');
    expect(wornOutfit(['cap'])).toBeNull();
    expect(gearScore(['tracksuit', 'champion'])).toBe(100);
  });

  it('weekly boss: planned training plus two check-ins beat it; extra training does no extra damage', () => {
    const w = (planned: number, trainedDays: number, checkins: number) => ({ planned, trainedDays, checkins, skillLogs: {} });
    expect(weeklyBoss('2026-11-02', w(3, 0, 0))).toMatchObject({ damage: 0, defeated: false, hp: BOSS_HP });
    expect(weeklyBoss('2026-11-02', w(3, 3, 2))).toMatchObject({ damage: 100, defeated: true });
    expect(weeklyBoss('2026-11-02', w(3, 3, 1)).defeated).toBe(false);
    // Training more than planned, or checking in every day, does not add damage.
    expect(weeklyBoss('2026-11-02', w(2, 6, 7)).damage).toBe(100);
    expect(weeklyBoss('2026-11-02', w(5, 2, 0)).damage).toBe(53); // goal is at most 3 days
    // Nothing planned: one training day counts as the full training part.
    expect(weeklyBoss('2026-11-02', w(0, 1, 2)).defeated).toBe(true);
    // A different boss each week, the same for everyone; all six come round.
    const keys = new Set(Array.from({ length: 6 }, (_, i) => bossOf(new Date(Date.UTC(2026, 10, 2 + 7 * i)).toISOString().slice(0, 10)).key));
    expect(keys.size).toBe(BOSSES.length);
  });

  it('parses optional body measurements', () => {
    expect(parseMetric('')).toBeNull();
    expect(parseMetric('72,5')).toBe(72.5);
    expect(parseMetric('72.4')).toBe(72.4);
    expect(parseMetric('abc')).toBeNull();
    expect(metricInRange('weightKg', 72.5)).toBe(true);
    expect(metricInRange('weightKg', 10)).toBe(false);
    expect(metricInRange('bodyFatPct', null)).toBe(true);
    expect(metricInRange('heightCm', 168)).toBe(true);
    expect(metricInRange('heightCm', 40)).toBe(false);
  });
});

const emptyXp = (): SkillXpInput => ({
  exercises: [],
  measurements: [],
  sessions: [],
  fullWeeks: [],
  recovery: [],
  criteria: [],
  accountKind: 'physio',
});

function ex(partial: Partial<LoggedExercise> & Pick<LoggedExercise, 'date' | 'skills'>): LoggedExercise {
  return {
    exerciseId: 'ex',
    familyId: 'fam',
    difficulty: 2,
    planned: true,
    prescribedSets: null,
    loggedSets: 0,
    prescribedHoldS: 0,
    doneHoldS: 0,
    prescribedBalanceS: 0,
    doneBalanceS: 0,
    pain: null,
    previousPain: null,
    ...partial,
  };
}

describe('skill locks', () => {
  const ctx = { active: ['strength'] as SkillKey[], laterPhase: { power: 3 }, phaseNo: 1, strengthCleared: false, powerInProgram: false, sportPhase: false };

  it('locks a skill that is not in the programme, and names a later phase when the series has one', () => {
    expect(skillLock('mobility', ctx)).toEqual({ locked: true, reason: 'unavailable', phase: null });
    expect(skillLockLabel('unavailable', null)).toBe('nog niet in je programma');
    expect(skillLock('power', ctx)).toEqual({ locked: true, reason: 'later', phase: 3 });
    expect(skillLockLabel('later', 3)).toBe('komt vrij in fase 3');
    expect(skillLock('sport', { ...ctx, laterPhase: {} })).toMatchObject({ locked: true, reason: 'unavailable' });
    expect(skillLock('knowledge', ctx)).toEqual({ locked: true, reason: 'soon', phase: null });
    expect(skillLockLabel('soon', null)).toBe('binnenkort');
  });

  it('opens power after clearance or from phase 3 with plyometrics, and technique only in a sport phase', () => {
    expect(skillLock('power', { ...ctx, powerInProgram: true, strengthCleared: true }).locked).toBe(false);
    expect(skillLock('power', { ...ctx, powerInProgram: true, phaseNo: 3 }).locked).toBe(false);
    expect(skillLock('power', { ...ctx, powerInProgram: true, phaseNo: 2 }).locked).toBe(true);
    expect(skillLock('sport', { ...ctx, sportPhase: true }).locked).toBe(false);
    expect(skillLock('strength', ctx).locked).toBe(false);
    expect(skillLock('discipline', ctx).locked).toBe(false);
    expect(skillLock('recovery', ctx).locked).toBe(false);
  });

  it('a friend card carries the lock and no level 1 stand-in', () => {
    const card = friendSkillCard({ level: 1, locked: true, reason: 'unavailable', phase: null });
    expect(card).toEqual({ level: null, locked: true, reason: 'unavailable', phase: null });
    expect(JSON.stringify(card)).not.toMatch(/kg|pain|program/i);
    expect(friendSkillCard({ level: 4, locked: false, reason: null, phase: null })).toEqual({ level: 4, locked: false, reason: null, phase: null });
  });
});

describe('skill XP', () => {
  it('scores each skill from its own sources and ignores work above the plan', () => {
    const day = '2026-03-02';
    const r = computeSkillXp({
      ...emptyXp(),
      exercises: [
        ex({ date: day, skills: ['strength'], prescribedSets: 3, loggedSets: 5 }),
        ex({ date: day, exerciseId: 'extra', skills: ['strength'], planned: false, prescribedSets: 3, loggedSets: 3 }),
        ex({ date: day, exerciseId: 'mob', skills: ['mobility'], prescribedHoldS: 90, doneHoldS: 200 }),
        ex({ date: day, exerciseId: 'bal', skills: ['balance'], prescribedBalanceS: 30, doneBalanceS: 40, difficulty: 1 }),
        ex({ date: day, exerciseId: 'stab', skills: ['stability'], pain: 3, previousPain: 4 }),
        ex({ date: day, exerciseId: 'pow', skills: ['power'] }),
        ex({ date: day, exerciseId: 'end', skills: ['endurance'] }),
        ex({ date: day, exerciseId: 'tec', skills: ['sport'] }),
      ],
      sessions: [{ date: day, planned: true }, { date: day, planned: false }],
      criteria: [{ date: day, kind: 'jump' }, { date: day, kind: 'return_to_sport' }],
      recovery: [{ date: day, kind: 'checkin' }, { date: day, kind: 'pain_after_session' }, { date: day, kind: 'rest_day' }],
    });
    // 10 + 3×5. The two sets above the prescription and the unplanned exercise add nothing.
    expect(r.xp.strength).toBe(SKILL_XP.strengthExercise + 3 * SKILL_XP.strengthSet);
    // 90 prescribed seconds → 9, not the 200 that were done.
    expect(r.xp.mobility).toBe(SKILL_XP.mobilityExercise + 9);
    expect(r.xp.balance).toBe(SKILL_XP.balanceExercise + 6);
    expect(r.xp.stability).toBe(SKILL_XP.stabilityExercise + SKILL_XP.stabilitySteady);
    expect(r.xp.power).toBe(SKILL_XP.powerExercise + SKILL_XP.powerCriterion);
    expect(r.xp.endurance).toBe(SKILL_XP.enduranceExercise);
    expect(r.xp.sport).toBe(SKILL_XP.techniqueExercise + SKILL_XP.techniqueCriterion);
    expect(r.xp.discipline).toBe(SKILL_XP.session);
    expect(r.xp.recovery).toBe(SKILL_XP.checkin + SKILL_XP.painReported + SKILL_XP.restDay);
    expect(r.xp.knowledge).toBe(0);
  });

  it('stops the stability bonus when reported pain went up, and never adds XP for a higher pain score', () => {
    const calm = computeSkillXp({ ...emptyXp(), exercises: [ex({ date: '2026-03-02', skills: ['stability'], pain: 2, previousPain: 2 })] });
    const up = computeSkillXp({ ...emptyXp(), exercises: [ex({ date: '2026-03-02', skills: ['stability'], pain: 6, previousPain: 2 })] });
    const quiet = computeSkillXp({ ...emptyXp(), exercises: [ex({ date: '2026-03-02', skills: ['stability'], pain: null, previousPain: 2 })] });
    expect(calm.xp.stability).toBe(SKILL_XP.stabilityExercise + SKILL_XP.stabilitySteady);
    expect(up.xp.stability).toBe(SKILL_XP.stabilityExercise);
    expect(quiet.xp.stability).toBe(SKILL_XP.stabilityExercise);
    const reported = computeSkillXp({ ...emptyXp(), recovery: [{ date: '2026-03-02', kind: 'pain_after_session' }] });
    const reportedHigh = computeSkillXp({ ...emptyXp(), recovery: [{ date: '2026-03-02', kind: 'pain_after_session' }, { date: '2026-03-02', kind: 'pain_after_session' }] });
    expect(reportedHigh.xp.recovery).toBe(reported.xp.recovery * 2);
  });

  it('caps each skill per calendar day', () => {
    const exercises = Array.from({ length: 20 }, (_, i) => ex({ date: '2026-03-02', exerciseId: `s${i}`, skills: ['strength'] }));
    const r = computeSkillXp({ ...emptyXp(), exercises });
    expect(r.xp.strength).toBe(SKILL_DAILY_CAP.strength);
    expect(20 * SKILL_XP.strengthExercise).toBeGreaterThan(SKILL_DAILY_CAP.strength);
  });

  it('pays recovery for a planned rest day and a two-point drop, and withholds the red-flag bonus outside physiotherapy', () => {
    const rests = plannedRestDates([{ start: '2026-03-02', end: '2026-03-08', weekdays: [1, 3, 5] }], ['2026-03-02'], '2026-03-08');
    expect(rests).toContain('2026-03-03');
    expect(rests).not.toContain('2026-03-02');
    const drops = painDropEvents([
      { area: 'knee_l', at: '2026-03-01T10:00:00', score: 6 },
      { area: 'knee_l', at: '2026-03-08T10:00:00', score: 4 },
      { area: 'knee_l', at: '2026-03-15T10:00:00', score: 1 },
    ]);
    expect(drops).toEqual([{ date: '2026-03-08', kind: 'pain_drop' }]);
    const recovery = [{ date: '2026-03-03', kind: 'rest_day' as const }, { date: '2026-03-03', kind: 'red_flag' as const }, ...drops];
    expect(computeSkillXp({ ...emptyXp(), recovery }).xp.recovery).toBe(SKILL_XP.restDay + SKILL_XP.redFlag + SKILL_XP.painDrop);
    expect(computeSkillXp({ ...emptyXp(), accountKind: 'coach', recovery }).xp.recovery).toBe(SKILL_XP.restDay + SKILL_XP.painDrop);
    expect(computeSkillXp({ ...emptyXp(), accountKind: 'personal', recovery: [{ date: '2026-03-03', kind: 'red_flag' }] }).xp.recovery).toBe(0);
  });

  it('awards a balance upgrade once, for a harder variant in the same family', () => {
    const r = computeSkillXp({
      ...emptyXp(),
      exercises: [
        ex({ date: '2026-03-02', skills: ['balance'], familyId: 'sl', difficulty: 1 }),
        ex({ date: '2026-03-04', skills: ['balance'], familyId: 'sl', difficulty: 3 }),
        ex({ date: '2026-03-06', skills: ['balance'], familyId: 'sl', difficulty: 3 }),
        ex({ date: '2026-03-04', exerciseId: 'other', skills: ['balance'], familyId: 'other', difficulty: 3 }),
      ],
    });
    expect(r.xp.balance).toBe(4 * SKILL_XP.balanceExercise + SKILL_XP.balanceUpgrade);
  });

  it('keeps a discipline streak across one free week in eight', () => {
    const twoGaps = Array.from({ length: 9 }, (_, i) => ({ full: i !== 4 && i !== 5 }));
    // Weeks 4 and 5 are both missed. The newer miss is free; the older one breaks the run.
    expect(disciplineStreak([...twoGaps, { full: true }])).toBe(4);
    const oneGap = Array.from({ length: 10 }, (_, i) => ({ full: i !== 4 }));
    expect(disciplineStreak(oneGap)).toBe(9);
    const full = computeSkillXp({ ...emptyXp(), fullWeeks: [{ date: '2026-03-08' }], sessions: [{ date: '2026-03-06', planned: true }] });
    expect(full.xp.discipline).toBe(SKILL_XP.fullWeek + SKILL_XP.session);
  });
});

describe('estimated 1RM', () => {
  it('uses Epley and ignores sets outside 1–10 reps or without weight', () => {
    expect(epley1Rm(60, 5)).toBeCloseTo(60 * (1 + 5 / 30));
    expect(epley1Rm(60, 1)).toBeCloseTo(60 * (1 + 1 / 30));
    expect(epley1Rm(60, 11)).toBeNull();
    expect(epley1Rm(60, 0)).toBeNull();
    expect(epley1Rm(0, 5)).toBeNull();
    expect(epley1Rm(null, 5)).toBeNull();
  });

  it('confirms a record on a second session, blocks it at pain 7, and pays at most one bonus per week', () => {
    const base = [
      { exerciseId: 'squat', sessionId: 'a', date: '2026-03-02', estimateKg: 100, pain: 2 },
      { exerciseId: 'squat', sessionId: 'b', date: '2026-03-05', estimateKg: 100, pain: 2 },
    ];
    const pending = { exerciseId: 'squat', sessionId: 'c', date: '2026-03-09', estimateKg: 103, pain: 2 };
    const confirm = { exerciseId: 'squat', sessionId: 'd', date: '2026-03-16', estimateKg: 101, pain: 2 };
    const ok = strengthAwards([...base, pending, confirm]);
    expect(ok.summaries[0]).toMatchObject({ startKg: 100, latestKg: 101, progressPct: 1 });
    expect(ok.records).toEqual([{ exerciseId: 'squat', date: '2026-03-16' }]);

    const late = strengthAwards([...base, pending, { ...confirm, date: '2026-03-24' }]);
    expect(late.records).toEqual([]);

    const sore = strengthAwards([...base, pending, { ...confirm, pain: 7 }]);
    expect(sore.records).toEqual([]);
    const laterClean = strengthAwards([...base, pending, { ...confirm, pain: 7 }, { ...confirm, sessionId: 'e', date: '2026-03-20', pain: 2 }]);
    expect(laterClean.records).toEqual([{ exerciseId: 'squat', date: '2026-03-20' }]);

    const second = { exerciseId: 'squat', sessionId: 'f', date: '2026-03-18', estimateKg: 108, pain: 1 };
    const secondConfirm = { exerciseId: 'squat', sessionId: 'g', date: '2026-03-20', estimateKg: 106, pain: 1 };
    const twice = strengthAwards([...base, pending, confirm, second, secondConfirm]);
    expect(twice.records).toHaveLength(1);

    // A successful 1RM test is just a measurement of that weight: it can be the confirming session.
    const tested = strengthAwards([...base, pending, { exerciseId: 'squat', sessionId: 'test-1', date: '2026-03-12', estimateKg: 103, pain: 1 }]);
    expect(tested.records).toEqual([{ exerciseId: 'squat', date: '2026-03-12' }]);
  });

  it('pauses the strength progression bonus on a day with pain of 7 or more, and still counts the session', () => {
    const day = '2026-03-20';
    const measurements = [
      { exerciseId: 'squat', sessionId: 'a', date: '2026-03-02', estimateKg: 100, pain: 1 },
      { exerciseId: 'squat', sessionId: 'b', date: '2026-03-09', estimateKg: 100, pain: 1 },
      { exerciseId: 'squat', sessionId: 'c', date: '2026-03-16', estimateKg: 130, pain: 8 },
      { exerciseId: 'squat', sessionId: 'd', date: day, estimateKg: 128, pain: 2 },
    ];
    const paused = computeSkillXp({
      ...emptyXp(),
      exercises: [ex({ date: day, skills: ['strength'], prescribedSets: 2, loggedSets: 2, pain: 8 })],
      measurements,
    });
    expect(paused.xp.strength).toBe(SKILL_XP.strengthExercise + 2 * SKILL_XP.strengthSet);
    const clear = computeSkillXp({
      ...emptyXp(),
      exercises: [ex({ date: day, skills: ['strength'], prescribedSets: 2, loggedSets: 2, pain: 3 })],
      measurements: measurements.map((m) => (m.sessionId === 'c' ? { ...m, pain: 3 } : m)),
    });
    expect(clear.xp.strength).toBe(SKILL_XP.strengthExercise + 2 * SKILL_XP.strengthSet + SKILL_XP.strengthRecord + SKILL_XP.strengthMilestone);
    expect(clear.strength[0].progressPct).toBe(28);
  });
});

describe('skill tempo', () => {
  /** A faithful plan: 4 training days a week, nothing above the prescription, pain stays at 3. */
  function faithful(weeks: number) {
    const exercises: LoggedExercise[] = [];
    const sessions: { date: string; planned: boolean }[] = [];
    const fullWeeks: { date: string }[] = [];
    const start = '2026-01-05'; // Monday
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 4; d++) {
        const date = add(start, w * 7 + d);
        sessions.push({ date, planned: true });
        for (let i = 0; i < 6; i++) {
          exercises.push(ex({ date, exerciseId: `s${i}`, skills: ['strength'], prescribedSets: 4, loggedSets: 4, pain: 3, previousPain: 3 }));
        }
        for (let i = 0; i < 4; i++) {
          exercises.push(ex({ date, exerciseId: `m${i}`, skills: ['mobility'], prescribedHoldS: 150, doneHoldS: 150, pain: 2, previousPain: 2 }));
        }
      }
      fullWeeks.push({ date: add(start, w * 7 + 6) });
    }
    return computeSkillXp({ ...emptyXp(), exercises, sessions, fullWeeks, accountKind: 'physio' });
  }
  const levelOf = (xp: number) => skillLevel(xp).level;

  it('a faithful 12-week plan finishes the main skills between level 20 and 30', () => {
    const r = faithful(12);
    // The curve stays 25×(L−1)^1.8. This volume is inside the daily caps, so the level is the plan, not a boost.
    expect(skillXpForLevel(20)).toBe(Math.round(25 * Math.pow(19, 1.8)));
    expect(levelOf(r.xp.strength)).toBeGreaterThanOrEqual(20);
    expect(levelOf(r.xp.strength)).toBeLessThanOrEqual(30);
    expect(levelOf(r.xp.mobility)).toBeGreaterThanOrEqual(20);
    expect(levelOf(r.xp.mobility)).toBeLessThanOrEqual(30);
    // Same week, stretched over a year, lands near level 50; level 99 takes about three to four years.
    expect(levelOf(faithful(52).xp.strength)).toBeGreaterThanOrEqual(45);
    expect(levelOf(faithful(52).xp.strength)).toBeLessThanOrEqual(60);
    expect(levelOf(faithful(52 * 3).xp.strength)).toBeGreaterThanOrEqual(90);
    expect(levelOf(faithful(52 * 3).xp.strength)).toBeLessThan(99);
    expect(levelOf(faithful(52 * 4).xp.strength)).toBe(99);
  });
});

describe('cosmetic rewards', () => {
  it('defines emblems, titles, combos and scenes, and does not draw the later steps', () => {
    expect(REWARDS_ARE_COSMETIC).toBe(true);
    expect(skillTitle('strength', 19)).toBeNull();
    expect(skillTitle('strength', 20)).toBe('Krachtpatser');
    expect(skillTitle('mobility', 20)).toBe('Lenigheidsmeester');
    expect(skillTitle('balance', 20)).toBe('Evenwichtskunstenaar');
    expect(skillTitle('stability', 20)).toBe('Rots in de branding');
    expect(skillTitle('power', 20)).toBe('Springveer');
    expect(skillTitle('endurance', 20)).toBe('Duurloper');
    expect(skillTitle('sport', 20)).toBe('Techneut');
    expect(skillTitle('discipline', 20)).toBe('IJzeren wil');
    expect(skillTitle('recovery', 20)).toBe('Herstelheld');
    expect(skillTitle('knowledge', 99)).toBeNull();
    expect(comboTitles({ strength: 20, stability: 20 }).map((c) => c.name)).toEqual(['De Rots']);
    expect(comboTitles({ balance: 20, mobility: 20 }).map((c) => c.name)).toEqual(['Danser']);
    expect(comboTitles({ discipline: 30, recovery: 30 }).map((c) => c.name)).toEqual(['Slimme Atleet']);
    expect(comboTitles({ strength: 19, stability: 20 })).toEqual([]);
    expect(COMBO_TITLES).toHaveLength(3);
    expect(FUTURE_REWARDS.every((r) => r.drawn === false)).toBe(true);
    expect(FUTURE_REWARDS.map((r) => r.level)).toEqual([30, 50, 75, 99]);
    expect(sceneForTotal(49)).toBeNull();
    expect(sceneForTotal(50)?.key).toBe('gym');
    expect(sceneForTotal(100)?.key).toBe('stadium');
    expect(sceneForTotal(400)?.key).toBe('stadium');
    expect(TOTAL_LEVEL_SCENES.filter((s) => !s.drawn).map((s) => s.level)).toEqual([150, 250, 400]);
  });
});

function add(date: string, days: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('self-trained skills', () => {
  it('a skill trained via the logbook opens; power keeps its safety lock', () => {
    const ctx = { active: [], laterPhase: {}, phaseNo: null, strengthCleared: false, powerInProgram: false, sportPhase: false, selfTrained: ['endurance', 'power'] } as SkillLockContext;
    expect(skillLock('endurance', ctx).locked).toBe(false);
    expect(skillLock('mobility', ctx)).toMatchObject({ locked: true, reason: 'unavailable' });
    expect(skillLock('power', ctx).locked).toBe(true);
  });
});

describe('body shape from measurements', () => {
  it('high BMI with low body fat is muscular; same weight with high fat is fuller', () => {
    const strong = bodyShape({ weightKg: 95, heightCm: 180, bodyFatPct: 12 }, 'm')!;
    const fuller = bodyShape({ weightKg: 95, heightCm: 180, bodyFatPct: 32 }, 'm')!;
    expect(strong.kind).toBe('muscular');
    expect(fuller.kind).toBe('full');
    expect(fuller.fat).toBeGreaterThan(strong.fat);
    expect(strong.muscle).toBeGreaterThan(fuller.muscle);
  });
  it('estimates body fat from BMI when missing; needs weight and height', () => {
    const s = bodyShape({ weightKg: 60, heightCm: 170, bodyFatPct: null }, 'f')!;
    expect(s.estimated).toBe(true);
    expect(s.bodyFatPct).toBeGreaterThan(20);
    expect(bodyShape({ weightKg: 60, heightCm: null, bodyFatPct: 20 }, 'f')).toBeNull();
    expect(bodyShape({ weightKg: 55, heightCm: 172, bodyFatPct: 18 }, 'f')!.kind).toBe('lean');
  });
});

describe('hero photo key', () => {
  it('picks figure, skin group and build', () => {
    expect(heroPhotoKey({ frame: 'm', skin: 's4', build: 'athletic' }, null)).toBe('m_s3_athletic');
    expect(heroPhotoKey({ frame: 'f', skin: 's10', build: 'average' }, { kind: 'muscular' })).toBe('f_s9_muscular');
    expect(heroPhotoKey({ frame: 'f', skin: 's1', build: 'slim' }, undefined)).toBe('f_s1_lean');
    // Hairstyle presets: h1 is the base photo; older looks map to the closest photo.
    expect(heroPhotoKey({ frame: 'f', skin: 's3', build: 'average', hair: 'ponytail' }, null)).toBe('f_s3_average');
    expect(heroPhotoKey({ frame: 'f', skin: 's3', build: 'average', hair: 'long' }, null)).toBe('f_s3_average_h2');
    expect(heroPhotoKey({ frame: 'f', skin: 's3', build: 'average', hair: 'afro' }, null)).toBe('f_s3_average_h4');
    expect(heroPhotoKey({ frame: 'm', skin: 's7', build: 'full', hair: 'short', beard: 'stubble' }, null)).toBe('m_s7_full_h2');
    expect(heroPhotoKey({ frame: 'm', skin: 's7', build: 'full', hair: 'none' }, null)).toBe('m_s7_full_h3');
    expect(heroPhotoKey({ frame: 'm', skin: 's7', build: 'full', hair: 'short', beard: 'beard' }, null, false)).toBe('m_s7_full');
  });
});

describe('heroNickname', () => {
  it('alliterates with the first name and cycles on each tap', async () => {
    const { heroNickname } = await import('./hero');
    expect(heroNickname('Sanne de Vries', 'f', 0)).toBe('Stalen Sanne');
    expect(heroNickname('Sanne', 'f', 1)).toBe('Supersnelle Sanne');
    expect(heroNickname('Émile', 'm', 0)).toBe('Energieke Émile');
    expect(heroNickname('Tim', 'm', 0)).toBe('Turbo Tim');
  });
  it('picks a name when there is none and stays within 40 characters', async () => {
    const { heroNickname } = await import('./hero');
    expect(heroNickname('', 'm', 0)).toBe('Turbo Tim');
    for (let i = 0; i < 40; i++) {
      expect(heroNickname('', i % 2 ? 'm' : 'f', i).length).toBeLessThanOrEqual(40);
      expect(heroNickname('Xander', 'm', i)).toMatch(/^\S+ /);
    }
  });
});

describe('character screen slots', () => {
  it('every piece of gear has a slot and one piece per slot wins', async () => {
    const { GEAR, GEAR_SLOT, onePerSlot } = await import('./hero');
    for (const g of GEAR) expect(GEAR_SLOT[g.key], g.key).toBeDefined();
    expect(onePerSlot(['cap', 'watch', 'visor'])).toEqual(['watch', 'visor']);
    expect(onePerSlot(['pin', 'pin', 'belt'])).toEqual(['pin', 'belt']);
  });
});
