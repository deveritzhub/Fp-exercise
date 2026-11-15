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
  /** No meat, fish, dairy, eggs or honey. */
  vegan: boolean;
  ingredients: { food: string; g: number }[];
  steps: string[];
};

const R = (key: string, nl: string, en: string, meal: Meal, minutes: number, prep: boolean, ingredients: [string, number][], steps: string[]): Recipe => ({
  key, nl, en, meal, minutes, prep,
  vegetarian: ingredients.every(([food]) => FOOD_BY_KEY[food]?.aisle !== 'vlees_vis'),
  vegan: ingredients.every(([food]) => !['vlees_vis', 'zuivel'].includes(FOOD_BY_KEY[food]?.aisle ?? '') && food !== 'honing'),
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
  R('tofu_scramble', 'Tofu-scramble met spinazie op brood', 'Tofu scramble with spinach on toast', 'ontbijt', 12, false,
    [['tofu', 180], ['spinazie', 50], ['tomaat', 80], ['brood_volkoren', 70], ['olijfolie', 5]],
    ['Verkruimel de tofu in een koekenpan met olie, kruid met kurkuma, peper en zout.', 'Laat de spinazie meeslinken en schep de tomaat erdoor.', 'Serveer op twee sneetjes brood.']),
  R('soja_oats', 'Plantaardige overnight oats met bessen', 'Plant-based overnight oats with berries', 'ontbijt', 5, true,
    [['havermout', 60], ['sojayoghurt', 200], ['sojadrink', 100], ['blauwe_bessen', 75], ['pindakaas', 15]],
    ['Meng havermout, sojayoghurt en sojadrink in een pot.', 'Een nacht in de koelkast.', 'Bessen en pindakaas erop.']),
  R('linzensoep', 'Linzensoep met wortel en brood', 'Lentil soup with carrot and bread', 'lunch', 30, true,
    [['linzen', 250], ['wortel', 100], ['ui', 50], ['passata', 150], ['knoflook', 5], ['olijfolie', 5], ['brood_volkoren', 35]],
    ['Fruit ui en knoflook in de olie, voeg de wortel in blokjes toe.', 'Doe linzen, passata en 300 ml water erbij en laat 20 minuten zachtjes koken.', 'Pureer half, met een sneetje brood erbij.']),
  R('hummus_wrap', 'Wraps met hummus, kikkererwten en groente', 'Wraps with hummus, chickpeas and vegetables', 'lunch', 8, false,
    [['wrap', 120], ['hummus', 60], ['kikkererwten', 80], ['sla', 30], ['komkommer', 60], ['tomaat', 60]],
    ['Besmeer de wraps met hummus.', 'Verdeel kikkererwten, sla, komkommer en tomaat erover en rol op.']),
  R('kikkererwten_curry', 'Kikkererwtencurry met spinazie en rijst', 'Chickpea curry with spinach and rice', 'diner', 30, true,
    [['kikkererwten', 200], ['spinazie', 100], ['passata', 150], ['ui', 50], ['rijst', 60], ['olijfolie', 10], ['knoflook', 5]],
    ['Kook de rijst.', 'Fruit ui en knoflook met kerriepoeder, voeg passata en kikkererwten toe en laat 10 minuten koken.', 'Laat de spinazie erin slinken.']),
  R('tempeh_noedels', 'Noedels met tempeh, broccoli en pindasaus', 'Noodles with tempeh, broccoli and peanut sauce', 'diner', 20, false,
    [['tempeh', 150], ['noedels', 70], ['broccoli', 100], ['paprika', 80], ['sojasaus', 15], ['pindakaas', 15]],
    ['Kook de noedels.', 'Bak de tempeh in plakjes, roerbak broccoli en paprika.', 'Roer pindakaas en sojasaus met wat kookwater tot een saus en meng alles.']),
  R('sojayoghurt_noten', 'Sojayoghurt met aardbeien en walnoten', 'Soy yoghurt with strawberries and walnuts', 'tussendoor', 3, false,
    [['sojayoghurt', 200], ['aardbeien', 100], ['walnoten', 15]],
    ['Schep de yoghurt in een kom, aardbeien en walnoten erop.']),
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

export type Diet = 'alles' | 'vegetarisch' | 'veganistisch';
const fitsDiet = (r: Recipe, diet: Diet) => diet === 'alles' || (diet === 'vegetarisch' ? r.vegetarian : r.vegan);

/**
 * "Vul mijn week": a plan for seven days that fits the goal and the diet. Cooking ahead is the idea:
 * a prep dinner and a prep lunch each come back three days in a row (Monday to Wednesday, Thursday to
 * Saturday), Sunday gets something fresh, breakfasts take turns. With muscle growth a snack is added.
 * `variant` gives another plan for "something else".
 */
export function planWeek(goal: NutritionGoal, diet: Diet, variant = 0, snacks = goal === 'spiergroei'): PlanItem[] {
  const pick = (meal: Meal, prepFirst: boolean) => {
    const list = RECIPES.filter((r) => r.meal === meal && fitsDiet(r, diet));
    const fit = list.filter((r) => recipeGoals(r).includes(goal));
    const pool = (fit.length ? fit : list).slice().sort((a, b) => (prepFirst ? Number(b.prep) - Number(a.prep) : 0) || a.key.localeCompare(b.key));
    return pool;
  };
  const at = <T,>(xs: T[], i: number) => xs[((i % xs.length) + xs.length) % xs.length];
  const breakfasts = pick('ontbijt', false);
  const lunches = pick('lunch', true);
  const dinners = pick('diner', true);
  const snackList = pick('tussendoor', false);
  const out: PlanItem[] = [];
  for (let day = 0; day < 7; day++) {
    const block = day < 3 ? 0 : day < 6 ? 1 : 2;
    if (breakfasts.length) out.push({ day, meal: 'ontbijt', recipe: at(breakfasts, day + variant).key, servings: 1 });
    if (lunches.length) out.push({ day, meal: 'lunch', recipe: at(lunches, block + variant).key, servings: 1 });
    if (dinners.length) out.push({ day, meal: 'diner', recipe: at(dinners, block * 2 + variant).key, servings: 1 });
    if (snacks && snackList.length) out.push({ day, meal: 'tussendoor', recipe: at(snackList, day + variant).key, servings: 1 });
  }
  return out;
}
