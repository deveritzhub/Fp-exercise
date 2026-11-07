/**
 * The Strength skill's ceiling follows real strength: the best estimated 1RM on a compound lift
 * (squat, deadlift, bench press, overhead press) relative to body weight. XP still comes from
 * training; the ceiling only stops the level from running ahead of what you can lift. Nobody
 * reaches 99 without elite lifting.
 *
 * Ratios (1RM ÷ body weight) per level of experience are rounded from widely used strength
 * standards for adults (beginner → elite, cf. ExRx/Kilgore and strengthlevel.com population
 * data). They are a game rule, not a medical norm. Women and men have separate tables; the hero's
 * figure picks the table.
 */
export type CompoundLift = 'squat' | 'deadlift' | 'bench' | 'ohp';
export const COMPOUND_LABEL: Record<CompoundLift, [string, string]> = {
  squat: ['Squat', 'Squat'], deadlift: ['Deadlift', 'Deadlift'], bench: ['Bankdrukken', 'Bench press'], ohp: ['Overhead press', 'Overhead press'],
};

// beginner, novice, intermediate, advanced, elite
const RATIOS: Record<'m' | 'f', Record<CompoundLift, [number, number, number, number, number]>> = {
  m: { squat: [0.75, 1.25, 1.5, 2.0, 2.5], deadlift: [1.0, 1.5, 2.0, 2.5, 3.0], bench: [0.5, 0.75, 1.0, 1.5, 2.0], ohp: [0.35, 0.55, 0.75, 1.0, 1.25] },
  f: { squat: [0.5, 0.75, 1.25, 1.5, 2.0], deadlift: [0.5, 1.0, 1.25, 1.75, 2.5], bench: [0.25, 0.5, 0.75, 1.0, 1.5], ohp: [0.2, 0.35, 0.5, 0.75, 1.0] },
};
export const TIER_LABEL: [string, string][] = [['Starter', 'Starter'], ['Beginner', 'Beginner'], ['Gevorderd', 'Novice'], ['Ervaren', 'Intermediate'], ['Sterk', 'Advanced'], ['Elite', 'Elite']];
/** Level ceiling at 0, beginner, novice, intermediate, advanced, elite. Lifting never lowers it below the base. */
const CAPS = [50, 55, 62, 72, 85, 99] as const;
export const BASE_STRENGTH_CAP = CAPS[0];

const EXCLUDE = /split|bulgar|stoel|chair|spaan|spanish|muur|wall|pistol|eenbenig|single|decline|box|hold|lichaamsgewicht|bodyweight|roemeen|romanian|\brdl\b|jump|sprong/i;

/** Which compound lift an exercise name is, if any. */
export function compoundLift(name: string): CompoundLift | null {
  const n = name.toLowerCase();
  if (EXCLUDE.test(n)) return null;
  if (/deadlift|doodstrek/.test(n)) return 'deadlift';
  if (/bench press|bankdruk/.test(n)) return 'bench';
  if (/overhead press|military press|shoulder press|schouderdruk/.test(n)) return 'ohp';
  if (/squat|kniebuig/.test(n)) return 'squat';
  return null;
}

export type StrengthCap = {
  cap: number;
  /** 0 = starter … 5 = elite */
  tier: number;
  best: { lift: CompoundLift; oneRmKg: number; ratio: number } | null;
  /** What it takes to raise the ceiling to the next tier with the best lift. */
  next: { lift: CompoundLift; kg: number; cap: number } | null;
  reason: 'ok' | 'no_weight' | 'no_compound';
};

export function strengthCap(input: { frame: string | null | undefined; bodyweightKg: number | null | undefined; lifts: { name: string; oneRmKg: number }[] }): StrengthCap {
  const table = RATIOS[input.frame === 'm' ? 'm' : 'f'];
  const bw = input.bodyweightKg && input.bodyweightKg >= 30 ? input.bodyweightKg : null;
  const compound = input.lifts.map((l) => ({ lift: compoundLift(l.name), oneRmKg: l.oneRmKg })).filter((l): l is { lift: CompoundLift; oneRmKg: number } => !!l.lift && l.oneRmKg > 0);
  if (!compound.length) return { cap: BASE_STRENGTH_CAP, tier: 0, best: null, next: null, reason: 'no_compound' };
  if (!bw) return { cap: BASE_STRENGTH_CAP, tier: 0, best: null, next: null, reason: 'no_weight' };
  let bestCap: number = BASE_STRENGTH_CAP;
  let best: StrengthCap['best'] = null;
  let bestTier = 0;
  for (const c of compound) {
    const ratio = c.oneRmKg / bw;
    const { cap, tier } = capFor(table[c.lift], ratio);
    if (cap > bestCap || (cap === bestCap && (!best || ratio > best.ratio))) {
      bestCap = cap;
      bestTier = tier;
      best = { lift: c.lift, oneRmKg: c.oneRmKg, ratio: Math.round(ratio * 100) / 100 };
    }
  }
  const next = best && bestTier < 5 ? { lift: best.lift, kg: Math.ceil(table[best.lift][bestTier] * bw * 2) / 2, cap: CAPS[bestTier + 1] } : null;
  return { cap: bestCap, tier: bestTier, best, next, reason: 'ok' };
}

/** Piecewise linear between the tier marks, so every extra kilo counts. */
function capFor(marks: readonly number[], ratio: number) {
  const points = [0, ...marks];
  if (ratio >= points[5]) return { cap: 99, tier: 5 };
  let tier = 0;
  while (tier < 5 && ratio >= points[tier + 1]) tier++;
  const lo = points[tier];
  const hi = points[tier + 1];
  const cap = Math.floor(CAPS[tier] + ((CAPS[tier + 1] - CAPS[tier]) * (ratio - lo)) / (hi - lo));
  return { cap: Math.min(98, cap), tier };
}
