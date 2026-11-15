import { FOOD_BY_KEY, macrosOf, sumMacros, type Aisle, type Macros, type Meal } from './foods';

/**
 * Simple recipes, written for this app, per serving. Values come from the ingredients (shared/foods.ts),
 * so they always add up. "Prep": keeps 3 to 4 days in the fridge, made for cooking ahead.
 */
export type Recipe = {
  key: string;
  nl: string;
  en: string;
  meal: Meal;
  minutes: number;
  prep: boolean;
  vegetarian: boolean;
  ingredients: { food: string; g: number }[];
  steps: string[];
};

const R = (key: string, nl: string, en: string, meal: Meal, minutes: number, prep: boolean, ingredients: [string, number][], steps: string[]): Recipe => ({
  key, nl, en, meal, minutes, prep,
  vegetarian: ingredients.every(([food]) => FOOD_BY_KEY[food]?.aisle !== 'vlees_vis'),
  ingredients: ingredients.map(([food, g]) => ({ food, g })),
  steps,
});

export const RECIPES: Recipe[] = [
  R('overnight_oats', 'Overnight oats met skyr en blauwe bessen', 'Overnight oats with skyr and blueberries', 'ontbijt', 5, true,
    [['havermout', 50], ['skyr', 200], ['melk', 100], ['blauwe_bessen', 75], ['pindakaas', 10]],
    ['Meng havermout, skyr en melk in een pot of bakje.', 'Zet het afgedekt een nacht in de koelkast.', 'Doe er ’s ochtends de bessen en pindakaas op.']),
  R('roerei_spinazie', 'Roerei met spinazie op volkorenbrood', 'Scrambled eggs with spinach on wholemeal', 'ontbijt', 10, false,
    [['ei', 165], ['spinazie', 50], ['brood_volkoren', 70], ['olijfolie', 5]],
    ['Verwarm de olie, laat de spinazie slinken.', 'Klop de eieren los, roer ze erdoor tot ze net gestold zijn.', 'Serveer op twee sneetjes brood.']),
  R('kwark_banaan', 'Kwark met banaan en walnoten', 'Quark with banana and walnuts', 'ontbijt', 3, false,
    [['kwark', 250], ['banaan', 100], ['walnoten', 15], ['honing', 7]],
    ['Doe de kwark in een kom.', 'Snijd de banaan erover en strooi de walnoten erop.', 'Een beetje honing erover.']),
  R('wrap_kip', 'Volkoren wraps met kip en hummus', 'Wholemeal wraps with chicken and hummus', 'lunch', 10, false,
    [['wrap', 120], ['kipfilet', 100], ['hummus', 30], ['sla', 30], ['paprika', 60]],
    ['Bak de kip in reepjes gaar (of gebruik gegrilde kip van gisteren).', 'Smeer hummus op de wraps.', 'Beleg met sla, paprika en kip en rol op.']),
  R('linzensalade', 'Linzensalade met feta', 'Lentil salad with feta', 'lunch', 10, true,
    [['linzen', 200], ['feta', 40], ['tomaat', 100], ['komkommer', 100], ['ui', 30], ['olijfolie', 10]],
    ['Spoel de linzen af.', 'Snijd tomaat, komkommer en ui klein en meng met de linzen.', 'Verkruimel de feta erover en meng met olie, peper en zout.']),
  R('tonijnsalade', 'Tonijnsalade met kikkererwten', 'Tuna salad with chickpeas', 'lunch', 10, true,
    [['tonijn', 112], ['kikkererwten', 120], ['paprika', 100], ['ui', 30], ['sla', 50], ['olijfolie', 10]],
    ['Laat tonijn en kikkererwten uitlekken.', 'Snijd paprika en ui klein.', 'Meng alles met de sla en de olie.']),
  R('brood_huttenkase', 'Boterhammen met hüttenkäse en tomaat', 'Sandwiches with cottage cheese and tomato', 'lunch', 5, false,
    [['brood_volkoren', 105], ['huttenkase', 100], ['tomaat', 100]],
    ['Besmeer drie sneetjes brood met hüttenkäse.', 'Leg er plakjes tomaat op, peper erover.']),
  R('kip_rijst_broccoli', 'Kip met rijst en broccoli', 'Chicken with rice and broccoli', 'diner', 25, true,
    [['kipfilet', 150], ['rijst', 75], ['broccoli', 200], ['olijfolie', 10]],
    ['Kook de rijst.', 'Bak de kip in blokjes in de olie gaar.', 'Stoom of kook de broccoli 5 minuten.', 'Verdeel over bakjes voor de komende dagen.']),
  R('zalm_zoete_aardappel', 'Zalm met zoete aardappel en sperziebonen', 'Salmon with sweet potato and green beans', 'diner', 30, false,
    [['zalm', 125], ['zoete_aardappel', 250], ['sperziebonen', 150], ['olijfolie', 5]],
    ['Snijd de zoete aardappel in partjes, besprenkel met olie, 25 min in de oven op 200 °C.', 'Leg de zalm de laatste 12 minuten erbij.', 'Kook de sperziebonen 6 minuten.']),
  R('pasta_bolognese', 'Pasta bolognese met mager gehakt', 'Pasta bolognese with lean mince', 'diner', 30, true,
    [['pasta', 85], ['gehakt', 125], ['passata', 200], ['ui', 50], ['wortel', 50], ['knoflook', 5], ['olijfolie', 5]],
    ['Fruit ui en knoflook, bak het gehakt rul.', 'Rasp de wortel erbij, voeg passata toe en laat 15 minuten zachtjes koken.', 'Kook de pasta en schep de saus erdoor.']),
  R('chili_sin_carne', 'Chili sin carne met bonen', 'Chili sin carne with beans', 'diner', 30, true,
    [['bruine_bonen', 200], ['passata', 200], ['paprika', 100], ['ui', 50], ['rijst', 60], ['knoflook', 5], ['olijfolie', 5]],
    ['Fruit ui, knoflook en paprika.', 'Voeg bonen en passata toe, kruid met chilipoeder en komijn, 15 minuten laten pruttelen.', 'Serveer met rijst.']),
  R('tofu_roerbak', 'Tofu-roerbak met groenten en rijst', 'Tofu stir-fry with vegetables and rice', 'diner', 25, true,
    [['tofu', 200], ['broccoli', 100], ['paprika', 100], ['champignons', 100], ['rijst', 60], ['sojasaus', 15], ['olijfolie', 10]],
    ['Kook de rijst.', 'Bak de tofu in blokjes goudbruin.', 'Roerbak de groenten, voeg tofu en sojasaus toe.']),
  R('omelet_champignons', 'Omelet met champignons en kaas', 'Omelette with mushrooms and cheese', 'diner', 15, false,
    [['ei', 165], ['champignons', 100], ['kaas', 20], ['olijfolie', 5], ['brood_volkoren', 35]],
    ['Bak de champignons in de olie.', 'Giet de losgeklopte eieren erover en laat stollen.', 'Leg de kaas erop, vouw dubbel. Met een sneetje brood.']),
  R('shake_banaan', 'Eiwitshake met banaan', 'Protein shake with banana', 'tussendoor', 3, false,
    [['whey', 30], ['melk', 250], ['banaan', 100]],
    ['Doe alles in een blender of shaker en mix goed.']),
  R('skyr_aardbeien', 'Skyr met aardbeien', 'Skyr with strawberries', 'tussendoor', 3, false,
    [['skyr', 200], ['aardbeien', 100]],
    ['Schep de skyr in een kom en doe de aardbeien erop.']),
  R('huttenkase_rijstwafel', 'Hüttenkäse met komkommer op rijstwafels', 'Cottage cheese with cucumber on rice cakes', 'tussendoor', 3, false,
    [['huttenkase', 150], ['komkommer', 100], ['rijstwafel', 16]],
    ['Besmeer twee rijstwafels met hüttenkäse.', 'Leg er plakjes komkommer op.']),
  R('edamame', 'Edamame met een snufje zout', 'Edamame with a pinch of salt', 'tussendoor', 5, false,
    [['edamame', 150]],
    ['Kook of magnetron de edamame 3 minuten, zout erover.']),
];

export const RECIPE_BY_KEY: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.key, r]));

/** Values for one serving. */
export function recipeMacros(r: Recipe): Macros {
  return sumMacros(r.ingredients.map((i) => macrosOf(FOOD_BY_KEY[i.food], i.g)));
}

export const GOALS = ['spiergroei', 'afvallen', 'gezond'] as const;
export type NutritionGoal = (typeof GOALS)[number];
export const GOAL_TEXT: Record<NutritionGoal, [string, string, string, string]> = {
  spiergroei: ['Spiergroei', 'Muscle growth', 'Veel eiwit per maaltijd', 'Plenty of protein per meal'],
  afvallen: ['Afvallen', 'Lose weight', 'Weinig calorieën, veel eiwit', 'Few calories, plenty of protein'],
  gezond: ['Gezond eten', 'Eat healthily', 'Gevarieerd en vers', 'Varied and fresh'],
};

/**
 * Which goals a recipe fits, from its numbers: muscle growth wants at least 30 g of protein for a meal
 * (20 g for a snack); losing weight wants few calories with at least 20 g protein (15 g for a snack).
 * Every recipe here counts as healthy.
 */
export function recipeGoals(r: Recipe): NutritionGoal[] {
  const m = recipeMacros(r);
  const snack = r.meal === 'tussendoor';
  const out: NutritionGoal[] = [];
  if (m.protein >= (snack ? 20 : 30)) out.push('spiergroei');
  if (m.kcal <= (snack ? 250 : 520) && m.protein >= (snack ? 15 : 20)) out.push('afvallen');
  out.push('gezond');
  return out;
}

/** A week plan: recipes on days (0 = Monday), with servings. */
export type PlanItem = { day: number; meal: Meal; recipe: string; servings: number };

export type ShoppingLine = { food: string; grams: number; pieces: number | null; aisle: Aisle };
/**
 * The shopping list for a plan: every ingredient added up over all servings, grouped by aisle. For
 * foods bought per piece (an egg, a pepper, a wrap) the number of pieces is rounded up.
 */
export function shoppingList(plan: PlanItem[]): ShoppingLine[] {
  const by = new Map<string, number>();
  for (const it of plan) {
    const r = RECIPE_BY_KEY[it.recipe];
    if (!r) continue;
    for (const ing of r.ingredients) by.set(ing.food, (by.get(ing.food) ?? 0) + ing.g * it.servings);
  }
  const PIECES = new Set(['stuk', 'ei', 'wrap', 'blikje', 'filet', 'moot', 'blok', 'teentje', 'reep', 'bakje']);
  const lines: ShoppingLine[] = [];
  for (const [food, grams] of by) {
    const fd = FOOD_BY_KEY[food];
    if (!fd) continue;
    lines.push({ food, grams: Math.round(grams), pieces: PIECES.has(fd.portion.nl) ? Math.ceil(grams / fd.portion.g - 0.05) : null, aisle: fd.aisle });
  }
  const order = ['groente', 'fruit', 'zuivel', 'vlees_vis', 'vega', 'brood_graan', 'voorraad', 'drinken', 'snoep'];
  return lines.sort((a, b) => order.indexOf(a.aisle) - order.indexOf(b.aisle) || FOOD_BY_KEY[a.food].nl.localeCompare(FOOD_BY_KEY[b.food].nl, 'nl'));
}
