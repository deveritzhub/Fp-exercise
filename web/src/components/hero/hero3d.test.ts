import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GEAR_SLOT, HERO_OPTIONS } from '@shared/hero';
import { hero3dScene, isToggleNode } from './hero3d';

/** Node names inside a .glb (the JSON chunk right after the 12-byte header). */
function glbNodeNames(file: string): Set<string> {
  const buf = fs.readFileSync(file);
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as { nodes: { name?: string }[] };
  return new Set(json.nodes.map((n) => n.name ?? ''));
}

const base = { skin: 's4', hair: 'short', outfit: 'forest', hairColor: 'blond', eyeColor: 'blue', frame: 'm', beard: 'none', glasses: 'none' };

describe('3D hero', () => {
  for (const frame of ['m', 'f']) {
    it(`model ${frame} has a node for every gear piece, hair style, beard and glasses`, () => {
      const names = glbNodeNames(path.resolve(import.meta.dirname, `../../../public/hero3d/hero_${frame}.glb`));
      const want = [
        ...Object.entries(GEAR_SLOT).map(([k, slot]) => (slot === 'outfit' ? `outfit_${k}` : `gear_${k}`)),
        ...HERO_OPTIONS.hair.filter((h) => h !== 'none').map((h) => `hair_${h}`),
        ...HERO_OPTIONS.beard.filter((b) => b !== 'none').map((b) => `beard_${b}`),
        ...HERO_OPTIONS.glasses.filter((g) => g !== 'none').map((g) => `glasses_${g}`),
        'aid_crutches', 'base_shoes', 'body',
      ];
      expect(want.filter((n) => !names.has(n))).toEqual([]);
    });
  }

  it('shows worn gear, one per slot, and swaps trainers for worn shoes', () => {
    const s = hero3dScene({ ...base, gear: ['cap', 'crown', 'wing_shoes', 'smith_hammer'] });
    expect([...s.visible].sort()).toEqual(['gear_crown', 'gear_smith_hammer', 'gear_wing_shoes', 'hair_short']);
    expect(hero3dScene({ ...base, gear: [] }).visible.has('base_shoes')).toBe(true);
  });

  it('outfits, aids, colours and build', () => {
    const s = hero3dScene({ ...base, frame: 'f', build: 'full', gear: ['sport_ski', 'crutches'], beard: 'beard' });
    expect(s.url).toMatch(/hero_f\.glb/);
    expect(s.visible.has('outfit_sport_ski')).toBe(true);
    expect(s.visible.has('aid_crutches')).toBe(true);
    expect(s.visible.has('beard_beard')).toBe(true);
    expect(s.tints.kit_main).toBe('#8e3b5f');
    expect(s.tints.hair).toBe('#c9a15a');
    expect(s.width).toBeGreaterThan(1);
  });

  it('big hair becomes short under a helmet', () => {
    const s = hero3dScene({ ...base, hair: 'afro', gear: ['champion_helm'] });
    expect(s.visible.has('hair_short')).toBe(true);
    expect(s.visible.has('hair_afro')).toBe(false);
  });

  it('only known prefixes are switched', () => {
    expect(isToggleNode('gear_cap')).toBe(true);
    expect(isToggleNode('body_skin')).toBe(false);
  });
});
