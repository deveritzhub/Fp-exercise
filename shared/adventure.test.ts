import { describe, it, expect } from 'vitest';
import { adventureLevel, blow } from './adventure';

describe('adventure', () => {
  it('levels: 60 XP for the first, 30 more for each next', () => {
    expect(adventureLevel(0)).toEqual({ level: 1, from: 0, to: 60 });
    expect(adventureLevel(59).level).toBe(1);
    expect(adventureLevel(60)).toEqual({ level: 2, from: 60, to: 150 });
    expect(adventureLevel(150).level).toBe(3);
    expect(adventureLevel(-5).level).toBe(1);
  });
  it('a creature takes a double blow when its ailment was put right today', () => {
    expect(blow('imp', new Set())).toBe(1);
    expect(blow('imp', new Set(['hydrated']))).toBe(2);
    expect(blow('slime', new Set(['hydrated']))).toBe(1);
  });
});
