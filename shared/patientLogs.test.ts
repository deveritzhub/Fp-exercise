import { describe, expect, it } from 'vitest';
import { LOG_XP, minutesOk, proteinHitDays, rewardProteinDays, rewardSelfTrainings, rewardStepDays, stepHitDays, suggestedProteinGrams } from './patientLogs';

const log = (over: Partial<Parameters<typeof rewardSelfTrainings>[0][number]> = {}) => ({
  day: '2026-11-02', kind: 'strength' as const, pain: null, stoppedForPain: false, createdAt: '2026-11-02T10:00:00.000Z', ...over,
});

describe('self-logged workouts', () => {
  it('pays a flat amount: a high pain score does not earn more', () => {
    const low = rewardSelfTrainings([log({ pain: 1 })]);
    const high = rewardSelfTrainings([log({ pain: 9 })]);
    expect(low.hero).toBe(high.hero);
    expect(low.hero).toBe(LOG_XP.selfSession + LOG_XP.selfPain);
    expect(low.skills.strength).toBe(LOG_XP.selfSkill);
    expect(low.skills.discipline).toBe(LOG_XP.selfDiscipline);
    expect(low.skills.recovery).toBe(LOG_XP.selfPainSkill);
  });

  it('rewards stopping for pain as recovery, not as the training skill', () => {
    const stopped = rewardSelfTrainings([log({ pain: 9, stoppedForPain: true })]);
    expect(stopped.hero).toBe(LOG_XP.selfStopped);
    expect(stopped.skills.strength).toBeUndefined();
    expect(stopped.skills.discipline).toBeUndefined();
    expect(stopped.skills.recovery).toBe(LOG_XP.selfStoppedSkill);
    expect(stopped.hero).toBeLessThan(rewardSelfTrainings([log({ pain: 1 })]).hero);
  });

  it('caps repeats on the same day', () => {
    const many = rewardSelfTrainings([
      log({ createdAt: '2026-11-02T08:00:00.000Z' }),
      log({ createdAt: '2026-11-02T09:00:00.000Z' }),
      log({ createdAt: '2026-11-02T10:00:00.000Z' }),
    ]);
    expect(many.hero).toBe(2 * LOG_XP.selfSession);
    expect(many.skills.discipline).toBe(2 * LOG_XP.selfDiscipline);
    expect(minutesOk(20)).toBe(true);
    expect(minutesOk(3)).toBe(false);
    expect(minutesOk(200)).toBe(false);
  });
});

describe('protein goal', () => {
  it('pays once on a day the grams reach the goal, never per entry', () => {
    expect(suggestedProteinGrams(null)).toBe(100);
    expect(suggestedProteinGrams(70)).toBe(112);
    expect(suggestedProteinGrams(20)).toBe(40);
    expect(proteinHitDays([{ day: '2026-11-02', grams: 30 }, { day: '2026-11-02', grams: 40 }, { day: '2026-11-03', grams: 20 }], 60)).toEqual(['2026-11-02']);
    expect(proteinHitDays([{ day: '2026-11-02', grams: 200 }], null)).toEqual([]);
    const hit = rewardProteinDays(1);
    expect(hit.hero).toBe(LOG_XP.proteinGoal);
    expect(hit.skills.discipline).toBe(LOG_XP.proteinDiscipline);
    expect(rewardProteinDays(0).hero).toBe(0);
  });
});

describe('step goal', () => {
  it('pays once per day the goal is met, and not again for more steps', () => {
    expect(stepHitDays([{ day: '2026-11-01', steps: 5999 }, { day: '2026-11-02', steps: 8000 }], 6000)).toEqual(['2026-11-02']);
    const one = rewardStepDays(1);
    expect(one.hero).toBe(LOG_XP.stepGoal);
    expect(one.skills.endurance).toBe(LOG_XP.stepEndurance);
    expect(rewardStepDays(1).hero).toBe(rewardStepDays(1).hero);
    expect(rewardStepDays(0)).toEqual({ hero: 0, skills: {} });
  });
});
