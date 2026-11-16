import { describe, expect, it } from 'vitest';
import { FOODS, FOOD_BY_KEY, macrosOf, mealForHour } from './foods';
import { parseFoodText } from './foodText';
import { RECIPES, recipeGoals, recipeMacros, shoppingList } from './recipes';

const items = (t: string) => parseFoodText(t).items.map((i) => [i.food?.key, i.grams]);

describe('foods', () => {
  it('every food has sensible values: energy roughly matches its protein, carbs and fat', () => {
    // Alcohol has energy of its own (7 kcal per gram), outside protein, carbs and fat.
    for (const f of FOODS.filter((x) => !['bier', 'wijn'].includes(x.key))) {
      const fromMacros = f.protein * 4 + f.carbs * 4 + f.fat * 9;
      expect(Math.abs(fromMacros - f.kcal), f.key).toBeLessThanOrEqual(Math.max(25, f.kcal * 0.15));
      expect(f.portion.g).toBeGreaterThan(0);
    }
  });
  it('values scale with the amount', () => {
    expect(macrosOf(FOOD_BY_KEY.kwark, 250)).toEqual({ kcal: 150, protein: 25, carbs: 10, fat: 0.5 });
  });
  it('the meal follows the time of day', () => {
    expect(mealForHour(8)).toBe('ontbijt');
    expect(mealForHour(12)).toBe('lunch');
    expect(mealForHour(18)).toBe('diner');
    expect(mealForHour(15)).toBe('tussendoor');
  });
});

describe('what someone ate, in own words', () => {
  it('reads bread with cheese, an apple and quark in grams', () => {
    expect(items('2 boterhammen met kaas, een appel en 250 g kwark')).toEqual([
      ['brood_volkoren', 70],
      ['kaas', 40],
      ['appel', 150],
      ['kwark', 250],
    ]);
  });
  it('reads glasses, scoops, handfuls and a meal word', () => {
    const r = parseFoodText('Ontbijt: havermout met een glas melk, 1 schep whey en een handje amandelen');
    expect(r.meal).toBe('ontbijt');
    expect(r.items.map((i) => [i.food?.key, i.grams])).toEqual([['havermout', 40], ['melk', 200], ['whey', 30], ['amandelen', 25]]);
  });
  it('peanut butter is not cheese, and an unknown dish is kept apart', () => {
    const r = parseFoodText('boterham met pindakaas en een bord sushi');
    expect(r.items.map((i) => i.food?.key)).toEqual(['brood_volkoren', 'pindakaas']);
    expect(r.unknown).toEqual(['sushi']);
  });
  it('knows everyday Dutch food: lamb chops, stamppot, a kroket and apple juice', () => {
    expect(items('2 lamskoteletten, een bord stamppot, 1 kroket en een glas appelsap')).toEqual([
      ['lamskotelet', 160],
      ['stamppot_boerenkool', 350],
      ['kroket', 70],
      ['appelsap', 200],
    ]);
  });
  it('a whole word beats a word that only starts with it', () => {
    expect(items('broodje met kaas')[0][0]).toBe('bolletje');
    expect(items('boterham met jam')[1][0]).toBe('jam');
  });
  it('3 eieren and 200ml melk', () => {
    expect(items('3 eieren, 200ml melk')).toEqual([['ei', 165], ['melk', 200]]);
  });
});

describe('recipes and the shopping list', () => {
  it('every ingredient exists, and every recipe has steps', () => {
    for (const r of RECIPES) {
      for (const i of r.ingredients) expect(FOOD_BY_KEY[i.food], `${r.key}: ${i.food}`).toBeTruthy();
      expect(r.steps.length).toBeGreaterThan(0);
    }
  });
  it('there is something for every goal at every meal', () => {
    for (const meal of ['ontbijt', 'lunch', 'diner', 'tussendoor'] as const) {
      for (const goal of ['spiergroei', 'afvallen', 'gezond'] as const) {
        expect(RECIPES.some((r) => r.meal === meal && recipeGoals(r).includes(goal)), `${meal}/${goal}`).toBe(true);
      }
    }
  });
  it('chicken, rice and broccoli: about 50 g protein in one serving', () => {
    const m = recipeMacros(RECIPES.find((r) => r.key === 'kip_rijst_broccoli')!);
    expect(m.protein).toBeGreaterThan(45);
    expect(m.kcal).toBeGreaterThan(450);
    expect(m.kcal).toBeLessThan(650);
  });
  it('adds up ingredients over servings and counts eggs as pieces', () => {
    const list = shoppingList([
      { day: 0, meal: 'ontbijt', recipe: 'roerei_spinazie', servings: 1 },
      { day: 1, meal: 'diner', recipe: 'omelet_champignons', servings: 2 },
    ]);
    const egg = list.find((l) => l.food === 'ei')!;
    expect(egg.grams).toBe(165 * 3);
    expect(egg.pieces).toBe(9);
    expect(list.find((l) => l.food === 'champignons')!.grams).toBe(200);
    // Grouped by aisle: vegetables first.
    expect(list[0].aisle).toBe('groente');
  });
});
