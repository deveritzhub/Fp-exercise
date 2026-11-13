/**
 * Survival meters for the hero: water, sleep, energy and stiffness. They fill and drain gently;
 * nothing is ever taken away (no XP loss, no damage), and every low meter comes with a friendly tip.
 * General wellbeing, not medical advice.
 *
 * - Water: about 30 ml drinks per kg body weight per day, between 1.5 and 3 L (EFSA 2010 adequate
 *   total water intake 2.0 L women / 2.5 L men, of which ~20% comes from food). A hard daily
 *   maximum guards against drinking far too much.
 * - Sleep: 7–9 hours for adults (Hirshkowitz et al., National Sleep Foundation 2015), plus how
 *   rested you feel (1–5).
 * - Energy: sleep and today's/yesterday's training load (session RPE × time, Foster 2001) and
 *   whether today is a rest day.
 * - Stiffness: grows with long stretches without moving, drops after any movement.
 */
export const WATER = { glassMl: 250, bottleMl: 500, perKg: 30, min: 1500, max: 3000, fallback: 1800, maxPerDay: 6000, maxEntry: 1000 } as const;
export const SLEEP = { minGood: 7, maxGood: 9 } as const;
export const SURVIVAL_XP = { waterGoal: 10, waterRecovery: 10, sleepLogged: 5, sleepRecovery: 5 } as const;

export function waterTarget(weightKg: number | null): number {
  if (!weightKg) return WATER.fallback;
  return Math.min(WATER.max, Math.max(WATER.min, Math.round((weightKg * WATER.perKg) / 50) * 50));
}

/** 0–100. 7–9 h scores full on hours; how rested you feel counts for a quarter. */
export function sleepScore(hours: number, quality: number): number {
  let h = 100;
  if (hours < SLEEP.minGood) h = 100 - (SLEEP.minGood - hours) * 20;
  else if (hours > SLEEP.maxGood + 0.5) h = 100 - (hours - SLEEP.maxGood) * 12;
  const q = ((Math.min(5, Math.max(1, quality)) - 1) / 4) * 100;
  return Math.round(Math.min(100, Math.max(0, 0.75 * Math.max(0, h) + 0.25 * q)));
}

/** Training load in arbitrary units: session RPE (0–10) × minutes / 10. */
export const sessionLoad = (rpe: number | null, minutes: number) => ((rpe ?? 5) * minutes) / 10;

export function energyLevel(i: { sleepScore: number | null; loadToday: number; loadYesterday: number; restDay: boolean; waterRatio: number }): number {
  const base = i.sleepScore ?? 70;
  const e = base - 0.35 * i.loadToday - 0.15 * i.loadYesterday + (i.restDay ? 10 : 0) + (Math.min(1, i.waterRatio) - 0.5) * 10;
  return Math.round(Math.min(100, Math.max(5, e)));
}

/** 0–100. Starts rising after an hour without moving; any movement brings it down again. */
export function stiffnessLevel(hoursSinceMove: number): number {
  return Math.round(Math.min(100, Math.max(0, (hoursSinceMove - 1) * 14)));
}

/**
 * Steps loosen what sitting stiffens: at the day's step goal seven tenths of the stiffness is gone.
 * The rest only goes with real movement of the joints (an exercise, a workout).
 */
export function stiffnessWithSteps(base: number, steps: number, goal: number): number {
  const part = goal > 0 ? Math.min(1, Math.max(0, steps / goal)) : 0;
  return Math.round(base * (1 - 0.7 * part));
}

export type SurvivalStatus = { key: string; kind: 'buff' | 'tip'; nl: string; en: string };

export function survivalStatus(m: { waterRatio: number; sleepScore: number | null; sleepHours: number | null; energy: number; stiffness: number; movedToday: boolean; hour: number }): SurvivalStatus[] {
  const out: SurvivalStatus[] = [];
  if (m.waterRatio >= 1) out.push({ key: 'hydrated', kind: 'buff', nl: 'Goed gehydrateerd', en: 'Well hydrated' });
  if (m.sleepScore !== null && m.sleepScore >= 80) out.push({ key: 'rested', kind: 'buff', nl: 'Uitgerust', en: 'Well rested' });
  if (m.movedToday && m.stiffness <= 20) out.push({ key: 'moving', kind: 'buff', nl: 'Lekker in beweging', en: 'Nicely on the move' });
  if (m.energy < 35) out.push({ key: 'tired', kind: 'tip', nl: 'Je energie is laag. Rustig aan: een rustdag of een korte wandeling telt ook.', en: 'Your energy is low. Take it easy: a rest day or a short walk counts too.' });
  if (m.hour >= 14 && m.waterRatio < 0.4) out.push({ key: 'thirsty', kind: 'tip', nl: 'Tijd voor een glas water.', en: 'Time for a glass of water.' });
  if (m.stiffness >= 60) out.push({ key: 'stiff', kind: 'tip', nl: 'Even bewegen: 2 minuten mobiliteit of een korte wandeling.', en: 'Move a little: 2 minutes of mobility or a short walk.' });
  if (m.sleepHours !== null && m.sleepHours < 6) out.push({ key: 'short_sleep', kind: 'tip', nl: 'Korte nacht. Train vandaag wat lichter als dat prettiger voelt.', en: 'Short night. Train a bit lighter today if that feels better.' });
  return out;
}
