import { WATER } from './survival';
import type { Meal } from './foods';

/**
 * What the hero carries in the village comes from real life: every glass of water logged today is a
 * glass in the flask, every meal logged today a ration. The hero uses them to heal. Three main meals
 * logged ("well fed") make the hero faster and stronger for the day. Food never gives a penalty:
 * not logging costs nothing.
 */
export const SUPPLY = { flaskMax: 8, waterHeals: 0.5, rationHeals: 1, fedPace: 1.15, fedPower: 1.25 } as const;
export const MAIN_MEALS: Meal[] = ['ontbijt', 'lunch', 'diner'];
export type Used = { water: number; food: number };

/** Glasses in the flask: whole glasses logged today, up to the flask's size, minus what was drunk in the village. */
export const flaskGlasses = (waterMl: number, used: number) => Math.max(0, Math.min(SUPPLY.flaskMax, Math.floor(waterMl / WATER.glassMl)) - Math.max(0, used));
/** Rations: one per meal logged today (breakfast, lunch, dinner, snack), minus what was eaten in the village. */
export const rations = (meals: readonly string[], used: number) => Math.max(0, new Set(meals).size - Math.max(0, used));
/** Well fed: breakfast, lunch and dinner are all logged today. */
export const wellFed = (meals: readonly string[]) => MAIN_MEALS.every((m) => meals.includes(m));
/** Main meals logged today, for "2 of 3". */
export const mainMealsLogged = (meals: readonly string[]) => MAIN_MEALS.filter((m) => meals.includes(m)).length;
