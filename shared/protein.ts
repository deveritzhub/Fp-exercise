/**
 * Daily protein targets from body weight. General nutrition guidance for healthy adults, not a
 * medical diet: people with kidney disease (or on a prescribed diet) follow their doctor/dietitian.
 *
 * Levels (grams per kg reference body weight per day):
 * - Minimaal 0,8 g/kg: avoids a shortage in healthy adults (EFSA 2012 PRI 0,83 g/kg; WHO/FAO/UNU 2007).
 *   From 65 years 1,0 g/kg (PROT-AGE, Bauer et al. 2013; ESPEN, Deutz et al. 2014).
 * - Suboptimaal 1,2 g/kg: better for active people, older adults and recovery, but below the level
 *   where training gains level off (Morton et al. 2018; Phillips 2016).
 * - Optimaal 1,6 g/kg, useful range up to 2,2 g/kg: meta-analysis of 49 resistance-training studies
 *   found gains in fat-free mass level off at ~1,6 g/kg (95% CI up to 2,2) (Morton et al., BJSM 2018);
 *   ISSN position stand 1,4–2,0 g/kg (Jäger et al. 2017). In injury recovery and immobilisation the
 *   upper end is advised (Tipton 2015; Papadopoulou 2020).
 * - Spread over the day: ~0,4 g/kg per meal over at least 4 meals (Schoenfeld & Aragon 2018).
 * With obesity (BMI > 30, height known) an adjusted body weight is used (weight at BMI 25 plus a
 * quarter of the excess), as is common in clinical nutrition, so targets are not overestimated.
 */
export type ProteinTier = 'minimum' | 'suboptimal' | 'optimal';

export const PROTEIN_TIERS: { key: ProteinTier; gPerKg: number; gPerKgOlder: number; nl: string; en: string; whyNl: string; whyEn: string }[] = [
  { key: 'minimum', gPerKg: 0.8, gPerKgOlder: 1.0, nl: 'Minimaal', en: 'Minimum', whyNl: 'Genoeg om geen tekort te krijgen.', whyEn: 'Enough to avoid a shortage.' },
  { key: 'suboptimal', gPerKg: 1.2, gPerKgOlder: 1.2, nl: 'Suboptimaal', en: 'Sub-optimal', whyNl: 'Beter bij bewegen en herstel, maar nog niet het maximale effect.', whyEn: 'Better for activity and recovery, but not the full effect.' },
  { key: 'optimal', gPerKg: 1.6, gPerKgOlder: 1.6, nl: 'Optimaal', en: 'Optimal', whyNl: 'Waar spieropbouw bij training het meest van profiteert.', whyEn: 'Where muscle gain from training benefits most.' },
];

/** Upper end of the useful range; more is not more effective. */
export const OPTIMAL_UPPER_G_PER_KG = 2.2;
export const PER_MEAL_G_PER_KG = 0.4;

export const PROTEIN_SOURCES = [
  'EFSA (2012) Scientific Opinion on Dietary Reference Values for protein',
  'Bauer et al. (2013) PROT-AGE Study Group, JAMDA',
  'Deutz et al. (2014) ESPEN Expert Group, Clinical Nutrition',
  'Morton et al. (2018) British Journal of Sports Medicine 52:376–384',
  'Jäger et al. (2017) ISSN position stand: protein and exercise',
  'Schoenfeld & Aragon (2018) JISSN 15:10',
  'Tipton (2015) Sports Medicine 45:S93–S104',
];

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Body weight used for the targets: actual weight, or an adjusted weight with BMI > 30. */
export function referenceWeight(weightKg: number, heightCm: number | null): { kg: number; adjusted: boolean } {
  if (!heightCm) return { kg: weightKg, adjusted: false };
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  if (bmi <= 30) return { kg: weightKg, adjusted: false };
  const at25 = 25 * m * m;
  return { kg: Math.round((at25 + 0.25 * (weightKg - at25)) * 10) / 10, adjusted: true };
}

export type ProteinTargets = {
  referenceKg: number;
  adjusted: boolean;
  olderAdult: boolean;
  minimum: number;
  suboptimal: number;
  optimal: number;
  optimalUpper: number;
  perMeal: number;
};

/** Grams per day per level, rounded to 5 g. */
export function proteinTargets(weightKg: number, heightCm: number | null, olderAdult: boolean): ProteinTargets {
  const ref = referenceWeight(weightKg, heightCm);
  const g = (tier: ProteinTier) => {
    const t = PROTEIN_TIERS.find((x) => x.key === tier)!;
    return round5(ref.kg * (olderAdult ? t.gPerKgOlder : t.gPerKg));
  };
  return {
    referenceKg: ref.kg,
    adjusted: ref.adjusted,
    olderAdult,
    minimum: g('minimum'),
    suboptimal: g('suboptimal'),
    optimal: g('optimal'),
    optimalUpper: round5(ref.kg * OPTIMAL_UPPER_G_PER_KG),
    perMeal: round5(ref.kg * PER_MEAL_G_PER_KG),
  };
}

export type ProteinZone = 'below' | 'minimum' | 'suboptimal' | 'optimal';

/** Which level today's grams reach. */
export function proteinZone(grams: number, t: Pick<ProteinTargets, 'minimum' | 'suboptimal' | 'optimal'>): ProteinZone {
  if (grams >= t.optimal) return 'optimal';
  if (grams >= t.suboptimal) return 'suboptimal';
  if (grams >= t.minimum) return 'minimum';
  return 'below';
}

/** Quick picks for the + button. Approximate grams per usual portion (Dutch food composition, rounded). */
export const PROTEIN_FOODS: { key: string; nl: string; en: string; grams: number }[] = [
  { key: 'quark', nl: 'Magere kwark (250 g)', en: 'Low-fat quark (250 g)', grams: 22 },
  { key: 'greek', nl: 'Griekse yoghurt (150 g)', en: 'Greek yoghurt (150 g)', grams: 14 },
  { key: 'egg', nl: 'Ei', en: 'Egg', grams: 6 },
  { key: 'chicken', nl: 'Kipfilet, bereid (100 g)', en: 'Chicken breast, cooked (100 g)', grams: 30 },
  { key: 'tuna', nl: 'Tonijn, blikje', en: 'Tuna, tin', grams: 28 },
  { key: 'milk', nl: 'Melk (glas 250 ml)', en: 'Milk (glass 250 ml)', grams: 9 },
  { key: 'shake', nl: 'Eiwitshake (1 schep)', en: 'Protein shake (1 scoop)', grams: 22 },
  { key: 'cheese', nl: 'Kaas (2 plakken)', en: 'Cheese (2 slices)', grams: 10 },
  { key: 'lentils', nl: 'Linzen, gekookt (150 g)', en: 'Lentils, cooked (150 g)', grams: 13 },
  { key: 'tofu', nl: 'Tofu (100 g)', en: 'Tofu (100 g)', grams: 12 },
];
