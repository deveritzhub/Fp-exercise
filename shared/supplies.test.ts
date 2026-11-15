import { describe, expect, it } from 'vitest';
import { flaskGlasses, mainMealsLogged, rations, wellFed } from './supplies';

describe('supplies of the hero come from real logs', () => {
  it('a glass per 250 ml logged, at most eight, minus what was drunk in the village', () => {
    expect(flaskGlasses(0, 0)).toBe(0);
    expect(flaskGlasses(600, 0)).toBe(2);
    expect(flaskGlasses(600, 1)).toBe(1);
    expect(flaskGlasses(5000, 0)).toBe(8);
    expect(flaskGlasses(250, 3)).toBe(0);
  });
  it('a ration per meal logged, counted once per meal', () => {
    expect(rations(['ontbijt', 'ontbijt', 'tussendoor'], 0)).toBe(2);
    expect(rations(['ontbijt'], 1)).toBe(0);
  });
  it('well fed needs breakfast, lunch and dinner; a snack does not replace one', () => {
    expect(wellFed(['ontbijt', 'lunch', 'tussendoor'])).toBe(false);
    expect(mainMealsLogged(['ontbijt', 'lunch', 'tussendoor'])).toBe(2);
    expect(wellFed(['diner', 'ontbijt', 'lunch'])).toBe(true);
  });
});
