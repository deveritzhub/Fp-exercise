import { describe, expect, it } from 'vitest';
import { wearPlacements } from './wear';

describe('gear on the hero photo', () => {
  it('draws nothing on the photo: gear stays in the slots', () => {
    expect(wearPlacements(['headphones', 'pin', 'cap', 'crutches'], 'f', 'average')).toEqual([]);
  });
});
