import { GEAR_KEYS, onePerSlot } from './hero';

/** Cosmetic-only wardrobe. No medical scores, progress or clinical clearance. */
export const WARDROBE_SLOTS = [1, 2, 3] as const;
export type WardrobeSlot = (typeof WARDROBE_SLOTS)[number];
export type WardrobePreset = { slot: WardrobeSlot; gear: string[]; updatedAt: string };

export function validatedWardrobeGear(items: readonly string[], owned: readonly string[]): string[] | null {
  if (items.length > 12 || new Set(items).size !== items.length) return null;
  const available = new Set(owned);
  if (items.some(item => !GEAR_KEYS.has(item) || !available.has(item))) return null;
  return onePerSlot([...items]);
}

/** Item order does not change the appearance: compare each slot's final piece. */
export function sameWardrobeLook(a: readonly string[], b: readonly string[]): boolean {
  const first = [...new Set(onePerSlot([...a]))].sort();
  const second = [...new Set(onePerSlot([...b]))].sort();
  return first.length === second.length && first.every((item, i) => item === second[i]);
}
