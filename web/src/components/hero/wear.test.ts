import { describe, expect, it } from 'vitest';
import { WEAR_SLOTS, wearPlacements } from './wear';
import { GEAR } from '@shared/hero';

describe('gear on the hero photo', () => {
  it('has a place for every wearable item, and broader builds spread pairs wider', () => {
    for (const k of ['medal', 'pin', 'captain', 'belt', 'watch', 'wristbands', 'gloves', 'sleeve', 'shin_guards', 'crew_socks', 'gold_shoes', 'spikes', 'crutches']) expect(WEAR_SLOTS[k], k).toBeDefined();
    // Head and neck pieces are not pasted on the photo.
    for (const k of ['cap', 'visor', 'headband', 'crown', 'scarf', 'towel', 'headphones']) expect(WEAR_SLOTS[k], k).toBeUndefined();
    expect(GEAR.length).toBeGreaterThan(0);
    const lean = wearPlacements(['wristbands'], 'f', 'lean');
    const full = wearPlacements(['wristbands'], 'm', 'full');
    expect(lean).toHaveLength(2);
    expect(lean[1].mirror).toBe(true);
    expect(full[0].left).toBeLessThan(lean[0].left);
    for (const p of [...lean, ...full]) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left + p.width).toBeLessThanOrEqual(1);
    }
  });
  it('draws the medal over the belt (later = on top) and ignores unknown and head items', () => {
    expect(wearPlacements(['medal', 'belt', 'cap', 'unknown'], 'f', 'average').map((p) => p.key)).toEqual(['belt', 'medal']);
  });
});
