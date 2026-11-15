/**
 * "Kies je schema": the patient picks a format, how often they train and a goal, and gets the shipped
 * strength schedules that fit, best match first. Only schedules from the FP library files are known
 * here (by their id in the file); a practice's own templates stay in the full list below the chooser.
 */
export const FORMATS = ['fullbody', 'bovenonder', 'ppl', 'thuis', 'any'] as const;
export type Format = (typeof FORMATS)[number];
export const GOALS = ['spiergroei', 'kracht', 'beginnen', 'billen'] as const;
export type Goal = (typeof GOALS)[number];
export const DAY_OPTIONS = [2, 3, 4, 5, 6] as const;
export type Level = 'beginner' | 'gemiddeld' | 'gevorderd';

export type ScheduleInfo = { formats: Exclude<Format, 'any'>[]; goals: Goal[]; level: Level; days: number };

export const SCHEDULES: Record<string, ScheduleInfo> = {
  kr2_fullbody_2d: { formats: ['fullbody'], goals: ['beginnen', 'kracht'], level: 'beginner', days: 2 },
  kr2_fullbody_3d: { formats: ['fullbody'], goals: ['kracht', 'beginnen'], level: 'beginner', days: 3 },
  kr2_thuis_3d: { formats: ['thuis', 'fullbody'], goals: ['beginnen'], level: 'beginner', days: 3 },
  kr2_bilspieren_2d: { formats: ['fullbody'], goals: ['billen'], level: 'beginner', days: 2 },
  kr_ppl_3d: { formats: ['ppl'], goals: ['spiergroei', 'kracht'], level: 'gemiddeld', days: 3 },
  kr_ppl_6d: { formats: ['ppl'], goals: ['spiergroei'], level: 'gevorderd', days: 6 },
  kr5_hyp_minimaal_2d: { formats: ['fullbody'], goals: ['spiergroei', 'beginnen'], level: 'beginner', days: 2 },
  kr5_hyp_fullbody_3d: { formats: ['fullbody'], goals: ['spiergroei'], level: 'beginner', days: 3 },
  kr5_hyp_dumbbell_3d: { formats: ['thuis', 'fullbody'], goals: ['spiergroei'], level: 'beginner', days: 3 },
  kr5_hyp_upper_lower_4d: { formats: ['bovenonder'], goals: ['spiergroei'], level: 'gemiddeld', days: 4 },
  kr5_hyp_ulppl_5d: { formats: ['bovenonder', 'ppl'], goals: ['spiergroei'], level: 'gevorderd', days: 5 },
};

/** With "weet ik niet" as format: the format that suits this many days best. */
export function adviceFormat(days: number): Exclude<Format, 'any' | 'thuis'> {
  if (days <= 3) return 'fullbody';
  if (days === 4) return 'bovenonder';
  return 'ppl';
}

export type Choice = { format: Format; days: number; goal: Goal };
export type Match<T> = { template: T; info: ScheduleInfo; score: number; exact: boolean; daysOff: number };

/**
 * Score: goal +3, format +3 (with "any": the advised format +2), days exact +3 or one off +1. A schedule
 * that matches neither the goal nor the format is left out; so is one more than one day off.
 */
export function matchSchedules<T extends { sourceKey: string | null; daysPerWeek?: number | null }>(templates: T[], c: Choice): Match<T>[] {
  const out: Match<T>[] = [];
  for (const t of templates) {
    const info = t.sourceKey ? SCHEDULES[t.sourceKey] : undefined;
    if (!info) continue;
    const days = t.daysPerWeek || info.days;
    const daysOff = Math.abs(days - c.days);
    if (daysOff > 1) continue;
    const goal = info.goals.includes(c.goal);
    const format = c.format === 'any' ? info.formats.includes(adviceFormat(c.days)) : info.formats.includes(c.format);
    if (!goal && !format) continue;
    const score = (goal ? 3 : 0) + (format ? (c.format === 'any' ? 2 : 3) : 0) + (daysOff === 0 ? 3 : 1) + (info.goals[0] === c.goal ? 0.5 : 0);
    out.push({ template: t, info: { ...info, days }, score, exact: goal && format && daysOff === 0, daysOff });
  }
  return out.sort((a, b) => b.score - a.score || a.info.days - b.info.days);
}
