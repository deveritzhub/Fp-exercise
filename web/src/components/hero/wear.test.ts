import { describe, expect, it } from 'vitest';
import { WEAR_SLOTS, wearPlacements } from './wear';
import { GEAR } from '@shared/hero';

describe('gear on the hero photo', () => {
  it('has a place for every wearable item, and broader builds spread pairs wider', () => {
    for (const k of ['pin', 'headphones', 'crutches']) expect(WEAR_SLOTS[k], k).toBeDefined();
    // Head and neck pieces are not pasted on the photo.
    for (const k of ['cap', 'visor', 'headband', 'crown', 'scarf', 'towel', 'crew_socks', 'hr_band', 'belt', 'gold_shoes']) expect(WEAR_SLOTS[k], k).toBeUndefined();
    expect(GEAR.length).toBeGreaterThan(0);
    const lean = wearPlacements(['crutches'], 'f', 'lean');
    const full = wearPlacements(['crutches'], 'm', 'full');
    expect(lean).toHaveLength(2);
    expect(lean[1].mirror).toBe(true);
    expect(full[0].left).toBeLessThan(lean[0].left);
    for (const p of [...lean, ...full]) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left + p.width).toBeLessThanOrEqual(1);
    }
  });
  it('draws only checked pieces and ignores unknown and head items', () => {
    expect(wearPlacements(['headphones', 'pin', 'cap', 'unknown'], 'f', 'average').map((p) => p.key)).toEqual(['pin', 'headphones']);
  });
});
