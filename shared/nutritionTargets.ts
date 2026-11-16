/**
 * A daily energy and macro guide from body, activity and goal. Mifflin-St Jeor for the resting energy
 * (the equation dietitians commonly start from), times an activity factor, then a modest step for the
 * goal. Protein 1.6 g/kg (muscle growth 1.8, losing weight 2.0 to keep muscle), fat 30% of energy,
 * carbohydrates the rest. An estimate to steer by, never a prescription: a floor keeps it safe.
 */
export const ACTIVITY = [
  { key: 'zittend', factor: 1.2, nl: 'Vooral zittend', en: 'Mostly sitting', hintNl: 'Kantoorwerk, weinig beweging', hintEn: 'Desk work, little movement' },
  { key: 'licht', factor: 1.375, nl: 'Licht actief', en: 'Lightly active', hintNl: '1 à 3 keer per week sporten of veel lopen', hintEn: 'Exercise 1 to 3 times a week or walk a lot' },
  { key: 'actief', factor: 1.55, nl: 'Actief', en: 'Active', hintNl: '3 à 5 keer per week sporten', hintEn: 'Exercise 3 to 5 times a week' },
  { key: 'zeer', factor: 1.725, nl: 'Zeer actief', en: 'Very active', hintNl: 'Bijna elke dag zwaar trainen of fysiek werk', hintEn: 'Hard training almost daily or physical work' },
] as const;
export type Activity = (typeof ACTIVITY)[number]['key'];

export const PLAN_GOALS = [
  { key: 'afvallen', nl: 'Afvallen', en: 'Lose weight', step: -0.15, proteinPerKg: 2.0 },
  { key: 'onderhoud', nl: 'Gewicht houden', en: 'Keep my weight', step: 0, proteinPerKg: 1.6 },
  { key: 'spiergroei', nl: 'Spiergroei', en: 'Build muscle', step: 0.1, proteinPerKg: 1.8 },
] as const;
export type PlanGoal = (typeof PLAN_GOALS)[number]['key'];

export type NutritionProfile = { sex: 'm' | 'v' | null; birthYear: number | null; activity: Activity; goal: PlanGoal; hideKcal: boolean };
export type Targets = { kcal: number; protein: number; carbs: number; fat: number; floorApplied: boolean; bmr: number };

/** The lowest daily energy the guide will ever suggest, without a dietitian. */
export const KCAL_FLOOR = { m: 1500, v: 1200 } as const;

export function nutritionTargets(p: NutritionProfile, weightKg: number, heightCm: number, year = new Date().getFullYear()): Targets | null {
  if (!p.sex || !p.birthYear || !weightKg || !heightCm) return null;
  const age = Math.max(16, Math.min(100, year - p.birthYear));
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (p.sex === 'm' ? 5 : -161);
  const act = ACTIVITY.find((a) => a.key === p.activity) ?? ACTIVITY[1];
  const goal = PLAN_GOALS.find((g) => g.key === p.goal) ?? PLAN_GOALS[1];
  let kcal = bmr * act.factor * (1 + goal.step);
  const floor = KCAL_FLOOR[p.sex];
  const floorApplied = kcal < floor;
  if (floorApplied) kcal = floor;
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(weightKg * goal.proteinPerKg);
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, floorApplied, bmr: Math.round(bmr) };
}

/** Day verdict in friendly words: never red, never "too much"; only how far along the day is. */
export function dayProgress(eaten: number, target: number): 'start' | 'onderweg' | 'bijna' | 'gehaald' {
  if (target <= 0 || eaten <= 0) return 'start';
  const r = eaten / target;
  return r >= 0.9 ? 'gehaald' : r >= 0.6 ? 'bijna' : 'onderweg';
}
