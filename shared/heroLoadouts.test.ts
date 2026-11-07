import { describe, expect, it } from 'vitest';
import { sameWardrobeLook, validatedWardrobeGear, WARDROBE_SLOTS } from './heroLoadouts';

describe('RPG wardrobe presets (cosmetic only)', () => {
  it('offers exactly three appearance slots', () => {
    expect(WARDROBE_SLOTS).toEqual([1, 2, 3]);
  });
  it('accepts an empty look to remove all optional gear', () => {
    expect(validatedWardrobeGear([], [])).toEqual([]);
  });
  it('stores only actually owned items', () => {
    expect(validatedWardrobeGear(['crown'], ['cap'])).toBeNull();
    expect(validatedWardrobeGear(['crown'], ['crown'])).toEqual(['crown']);
  });
  it('rejects invented and duplicated gear IDs', () => {
    expect(validatedWardrobeGear(['healing_potion'], ['healing_potion'])).toBeNull();
    expect(validatedWardrobeGear(['cap','cap'], ['cap'])).toBeNull();
  });
  it('keeps at most one piece in each worn slot', () => {
    expect(validatedWardrobeGear(['cap','crown','gloves'], ['cap','crown','gloves'])).toEqual(['crown','gloves']);
  });
  it('does not allow oversized requests', () => {
    expect(validatedWardrobeGear(Array(13).fill('cap'), ['cap'])).toBeNull();
  });
  it('compares the visible equipment, not array ordering', () => {
    expect(sameWardrobeLook(['cap','gloves'], ['gloves','cap'])).toBe(true);
    expect(sameWardrobeLook(['cap','crown'], ['crown'])).toBe(true);
    expect(sameWardrobeLook(['crown'], ['cap'])).toBe(false);
  });
});
