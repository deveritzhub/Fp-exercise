/**
 * Patient self-logs: own workouts and protein grams.
 * XP is added on top of the existing hero rules in shared/hero.ts. This file does not change
 * skills, badges, quests or gear. A high pain score never earns more. Stopping because of pain
 * earns recovery, not the training skill. Protein pays once on the day the goal is met, not per bite.
 */
import type { SkillKey } from './hero';

export const LOG_XP = {
  selfSession: 35, // hero, per rewarded own workout
  selfSkill: 15, // the existing skill that matches the kind
  selfDiscipline: 15, // Discipline, per rewarded own workout
  selfPain: 10, // hero, when a pain score is given (any score)
  selfPainSkill: 15, // Herstel, for that score
  selfStopped: 18, // hero, when the patient stops because of pain
  selfStoppedSkill: 25, // Herstel, instead of the training skill
  proteinGoal: 15, // hero, once per day the protein goal is met
  proteinDiscipline: 20, // Discipline, once per such day
  stepGoal: 15, // hero, once per day the step goal is met
  stepEndurance: 20, // Conditie, once per such day
} as const;

/** Daily steps. Extra steps above the goal do not pay more, and a missed day costs nothing. */
export const STEPS = { goalMin: 1000, goalMax: 20000, defaultGoal: 6000, maxSteps: 100_000, syncDays: 7 } as const;

export const PROTEIN = { min: 40, max: 250, perEntryMin: 1, perEntryMax: 150, perKg: 1.6, fallback: 100, maxEntriesPerDay: 12 } as const;
export const SELF_LIMITS = { fullPerDay: 2, stoppedPerDay: 1, maxLogsPerDay: 6, noteMax: 280 } as const;

/** About 1.6 g/kg, or 100 g when weight is unknown. The patient can change it. */
export function suggestedProteinGrams(weightKg: number | null): number {
  if (weightKg === null || !Number.isFinite(weightKg)) return PROTEIN.fallback;
  return Math.min(PROTEIN.max, Math.max(PROTEIN.min, Math.round(weightKg * PROTEIN.perKg)));
}

export const TRAINING_KIND_KEYS = ['walk', 'cycle', 'swim', 'strength', 'mobility', 'balance', 'stability', 'power', 'sport', 'other'] as const;
export type TrainingKind = (typeof TRAINING_KIND_KEYS)[number];

export const TRAINING_KINDS: { key: TrainingKind; nl: string; en: string; skill: SkillKey }[] = [
  { key: 'walk', nl: 'Wandelen', en: 'Walking', skill: 'endurance' },
  { key: 'cycle', nl: 'Fietsen', en: 'Cycling', skill: 'endurance' },
  { key: 'swim', nl: 'Zwemmen', en: 'Swimming', skill: 'endurance' },
  { key: 'strength', nl: 'Kracht', en: 'Strength', skill: 'strength' },
  { key: 'mobility', nl: 'Mobiliteit', en: 'Mobility', skill: 'mobility' },
  { key: 'balance', nl: 'Balans', en: 'Balance', skill: 'balance' },
  { key: 'stability', nl: 'Stabiliteit', en: 'Stability', skill: 'stability' },
  { key: 'power', nl: 'Explosief', en: 'Power', skill: 'power' },
  { key: 'sport', nl: 'Sport', en: 'Sport', skill: 'sport' },
  { key: 'other', nl: 'Andere beweging', en: 'Other movement', skill: 'endurance' },
];

export const trainingKind = (key: string) => TRAINING_KINDS.find((k) => k.key === key);

/** 5–180 minutes. The amount of XP does not grow with the duration. */
export function minutesOk(minutes: number) {
  return Number.isInteger(minutes) && minutes >= 5 && minutes <= 180;
}

export type SelfTrainingInput = {
  day: string;
  kind: TrainingKind;
  pain: number | null;
  stoppedForPain: boolean;
  createdAt: string;
};

const add = (skills: Partial<Record<SkillKey, number>>, key: SkillKey, n: number) => {
  skills[key] = (skills[key] ?? 0) + n;
};

/**
 * Earliest logs of a day count: at most two finished workouts and one that was stopped for pain.
 * Minutes and the pain number do not change the amount.
 */
export function rewardSelfTrainings(logs: SelfTrainingInput[]) {
  const skills: Partial<Record<SkillKey, number>> = {};
  let hero = 0;
  const sorted = [...logs].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const full = new Map<string, number>();
  const stopped = new Map<string, number>();
  for (const log of sorted) {
    const meta = trainingKind(log.kind);
    if (!meta) continue;
    if (log.stoppedForPain) {
      const n = stopped.get(log.day) ?? 0;
      if (n >= SELF_LIMITS.stoppedPerDay) continue;
      stopped.set(log.day, n + 1);
      hero += LOG_XP.selfStopped;
      add(skills, 'recovery', LOG_XP.selfStoppedSkill);
      continue;
    }
    const n = full.get(log.day) ?? 0;
    if (n >= SELF_LIMITS.fullPerDay) continue;
    full.set(log.day, n + 1);
    hero += LOG_XP.selfSession;
    add(skills, 'discipline', LOG_XP.selfDiscipline);
    add(skills, meta.skill, LOG_XP.selfSkill);
    if (log.pain !== null) {
      hero += LOG_XP.selfPain;
      add(skills, 'recovery', LOG_XP.selfPainSkill);
    }
  }
  return { hero, skills };
}

export type ProteinEntry = { day: string; grams: number };

/** Days on which the summed grams reach the goal. No goal means no XP. */
export function proteinHitDays(entries: ProteinEntry[], goal: number | null): string[] {
  if (!goal || goal <= 0) return [];
  const sum = new Map<string, number>();
  for (const e of entries) sum.set(e.day, (sum.get(e.day) ?? 0) + e.grams);
  return [...sum.entries()].filter(([, g]) => g >= goal).map(([d]) => d);
}

export function rewardProteinDays(days: number) {
  const skills: Partial<Record<SkillKey, number>> = {};
  if (days > 0) add(skills, 'discipline', days * LOG_XP.proteinDiscipline);
  return { hero: days * LOG_XP.proteinGoal, skills };
}

export type StepEntry = { day: string; steps: number };

/** Days on which the step count reaches the goal. One award per day, not per step. */
export function stepHitDays(entries: StepEntry[], goal: number): string[] {
  if (!goal || goal <= 0) return [];
  const byDay = new Map<string, number>();
  for (const e of entries) byDay.set(e.day, e.steps);
  return [...byDay.entries()].filter(([, n]) => n >= goal).map(([d]) => d);
}

export function rewardStepDays(days: number) {
  const skills: Partial<Record<SkillKey, number>> = {};
  if (days > 0) add(skills, 'endurance', days * LOG_XP.stepEndurance);
  return { hero: days * LOG_XP.stepGoal, skills };
}
