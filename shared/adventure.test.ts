import { describe, it, expect } from 'vitest';
import { adventureLevel, blow, boxingXp, weaponAt } from './adventure';

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
  it('weapons come with the level and add to every blow', () => {
    expect(weaponAt(1)).toMatchObject({ weapon: { key: 'fists' }, next: { key: 'staff' } });
    expect(weaponAt(2).weapon.key).toBe('staff');
    expect(weaponAt(9)).toMatchObject({ weapon: { key: 'sword' }, next: { key: 'axe' } });
    expect(weaponAt(40)).toMatchObject({ weapon: { key: 'hero_sword' }, next: null });
    expect(boxingXp(9)).toBe(18);
    expect(boxingXp(999)).toBe(28);
    expect(blow('slime', new Set(), 2)).toBe(3);
    expect(blow('slime', new Set(['moving']), 2)).toBe(6);
  });
});
