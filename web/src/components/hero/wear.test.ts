import { describe, expect, it } from 'vitest';
import { WEAR_SLOTS, wearPlacements } from './wear';
import { GEAR } from '@shared/hero';

describe('gear on the hero photo', () => {
  it('has a place for every wearable item, and broader builds spread pairs wider', () => {
    for (const g of GEAR) expect(WEAR_SLOTS[g.key], g.key).toBeDefined();
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
  it('draws the cap over the scarf (later = on top) and ignores unknown keys', () => {
    expect(wearPlacements(['cap', 'scarf', 'unknown'], 'f', 'average').map((p) => p.key)).toEqual(['scarf', 'cap']);
  });
});
