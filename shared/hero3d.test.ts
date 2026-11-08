import { describe, expect, it } from 'vitest';
import { buildProportions, hero3DAttachments, sideSign, skinHex } from './hero3d';

describe('3D hero attachments', () => {
  it('puts the brace on the right knee unless the operated side is known', () => {
    expect(hero3DAttachments({ equipped: [] }).brace).toEqual({ side: 'right', bone: 'shinR' });
    expect(hero3DAttachments({ equipped: [], operatedSide: 'left' }).brace.bone).toBe('shinL');
    expect(sideSign('left')).toBe(1);
    expect(sideSign('right')).toBe(-1);
  });

  it('shows crutches only when that item is equipped', () => {
    expect(hero3DAttachments({ equipped: ['cap'] }).crutches).toBe(false);
    expect(hero3DAttachments({ equipped: ['crutch_staff'] }).crutches).toBe(true);
    expect(hero3DAttachments({ equipped: [], aids: ['crutches'] }).crutches).toBe(true);
  });

  it('hangs the heirloom on the bone for the chosen kind and brightens with tier', () => {
    expect(hero3DAttachments({ equipped: [] }).heirloom).toBeNull();
    const weapon = hero3DAttachments({ equipped: [], heirloom: { kind: 'weapon', tier: 3 } }).heirloom!;
    expect(weapon.bone).toBe('handR');
    expect(weapon.intensity).toBeGreaterThan(hero3DAttachments({ equipped: [], heirloom: { kind: 'weapon', tier: 1 } }).heirloom!.intensity);
    expect(hero3DAttachments({ equipped: [], heirloom: { kind: 'shield', tier: 5 } }).heirloom!.bone).toBe('forearmL');
    expect(hero3DAttachments({ equipped: [], heirloom: { kind: 'amulet', tier: 2 } }).heirloom!.bone).toBe('chest');
  });

  it('does not read workout volume; only build and skin change the body', () => {
    const a = hero3DAttachments({ equipped: ['cap', 'medal'] });
    const b = hero3DAttachments({ equipped: ['cap', 'medal'] });
    expect(a).toEqual(b);
    expect(buildProportions('athletic').shoulder).toBeGreaterThan(buildProportions('slim').shoulder);
    expect(buildProportions(undefined, 'full').hip).toBeGreaterThan(1);
    expect(skinHex('s2')).toBe(skinHex('s1'));
    expect(skinHex('s9')).not.toBe(skinHex('s1'));
  });
});
