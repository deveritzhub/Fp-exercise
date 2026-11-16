import { describe, expect, it } from 'vitest';
import { dayProgress, nutritionTargets } from './nutritionTargets';
import { RECIPES, RECIPE_BY_KEY, planWeek, recipeMacros } from './recipes';

describe('daily guide', () => {
  it('a 35-year-old woman of 70 kg and 170 cm, lightly active, keeping her weight: about 2000 kcal', () => {
    const t = nutritionTargets({ sex: 'v', birthYear: 1991, activity: 'licht', goal: 'onderhoud', hideKcal: false }, 70, 170, 2026)!;
    expect(t.bmr).toBe(1427); // 700 + 1062.5 − 175 − 161
    expect(t.kcal).toBe(1960);
    expect(t.protein).toBe(112);
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeGreaterThan(t.kcal - 15);
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeLessThan(t.kcal + 15);
  });
  it('losing weight never goes below the floor', () => {
    const t = nutritionTargets({ sex: 'v', birthYear: 1950, activity: 'zittend', goal: 'afvallen', hideKcal: false }, 50, 155, 2026)!;
    expect(t.kcal).toBe(1200);
    expect(t.floorApplied).toBe(true);
  });
  it('without sex or birth year there is no guide (no guessing)', () => {
    expect(nutritionTargets({ sex: null, birthYear: 1990, activity: 'licht', goal: 'onderhoud', hideKcal: false }, 70, 170)).toBeNull();
  });
  it('the day is described kindly: never "too much"', () => {
    expect(dayProgress(0, 2000)).toBe('start');
    expect(dayProgress(1500, 2000)).toBe('bijna');
    expect(dayProgress(2600, 2000)).toBe('gehaald');
  });
});

describe('fill my week', () => {
  it('seven days with breakfast, lunch and dinner; prep meals come back three days in a row', () => {
    const w = planWeek('gezond', 'alles');
    for (let d = 0; d < 7; d++) expect(w.filter((x) => x.day === d).map((x) => x.meal)).toEqual(['ontbijt', 'lunch', 'diner']);
    const dinners = w.filter((x) => x.meal === 'diner').map((x) => x.recipe);
    expect(dinners[0]).toBe(dinners[1]);
    expect(dinners[1]).toBe(dinners[2]);
    expect(RECIPE_BY_KEY[dinners[0]].prep).toBe(true);
  });
  it('vegan means vegan, every day; muscle growth adds a snack', () => {
    const w = planWeek('spiergroei', 'veganistisch');
    expect(w.every((x) => RECIPE_BY_KEY[x.recipe].vegan)).toBe(true);
    expect(w.filter((x) => x.meal === 'tussendoor')).toHaveLength(7);
  });
  it('"something else" gives another plan', () => {
    expect(planWeek('gezond', 'alles', 1)).not.toEqual(planWeek('gezond', 'alles', 0));
  });
  it('the vegan recipes really are vegan and there is one for every meal', () => {
    for (const meal of ['ontbijt', 'lunch', 'diner', 'tussendoor'] as const) expect(RECIPES.some((r) => r.vegan && r.meal === meal), meal).toBe(true);
    expect(recipeMacros(RECIPE_BY_KEY.tempeh_noedels).protein).toBeGreaterThan(30);
  });
});
