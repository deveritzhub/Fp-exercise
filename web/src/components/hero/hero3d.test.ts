import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GEAR_SLOT, HERO_OPTIONS } from '@shared/hero';
import { hero3dScene, hero3dBuild, hero3dUrl, HERO3D_BUILDS, isToggleNode } from './hero3d';

/** Node names inside a .glb (the JSON chunk right after the 12-byte header). */
function glbNodeNames(file: string): Set<string> {
  const buf = fs.readFileSync(file);
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as { nodes: { name?: string }[] };
  return new Set(json.nodes.map((n) => n.name ?? ''));
}

const base = { skin: 's4', hair: 'short', outfit: 'forest', hairColor: 'blond', eyeColor: 'blue', frame: 'm', beard: 'none', glasses: 'none' };

describe('3D hero', () => {
  for (const frame of ['m', 'f']) for (const build of HERO3D_BUILDS) {
    it(`model ${frame}/${build} has a node for every gear piece, hair style, beard and glasses`, () => {
      const names = glbNodeNames(path.resolve(import.meta.dirname, `../../../public/hero3d/hero_${frame}_${build}.glb`));
      const want = [
        ...Object.entries(GEAR_SLOT).map(([k, slot]) => (slot === 'outfit' ? `outfit_${k}` : `gear_${k}`)),
        ...HERO_OPTIONS.hair.filter((h) => h !== 'none').map((h) => `hair_${h}`),
        ...HERO_OPTIONS.beard.filter((b) => b !== 'none').map((b) => `beard_${b}`),
        ...HERO_OPTIONS.glasses.filter((g) => g !== 'none').map((g) => `glasses_${g}`),
        'aid_crutches', 'base_shoes', 'body', 'body_eyebrows', 'body_eyelashes',
      ];
      expect(want.filter((n) => !names.has(n))).toEqual([]);
      const bytes = fs.readFileSync(path.resolve(import.meta.dirname, `../../../public/hero3d/hero_${frame}_${build}.glb`));
      expect(gzipSync(bytes).byteLength).toBeLessThan(2_500_000);
      const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
      expect(doc.animations.map((a: { name: string }) => a.name).sort()).toEqual(['cheer', 'idle', 'run', 'walk']);
      expect(doc.skins.length).toBeGreaterThan(0);
      expect(doc.materials.find((m: {name: string}) => m.name === 'skin').pbrMetallicRoughness.roughnessFactor).toBe(.5);
    });
  }

  it('exports genuinely different body geometry for all four builds per frame', () => {
    for (const frame of ['m', 'f']) {
      const hashes = HERO3D_BUILDS.map(build => {
        const bytes = fs.readFileSync(path.resolve(import.meta.dirname, `../../../public/hero3d/hero_${frame}_${build}.glb`));
        const jsonSize = bytes.readUInt32LE(12);
        const doc = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
        const node = doc.nodes.find((n: { name: string }) => n.name === 'body_skin');
        const primitive = doc.meshes[node.mesh].primitives[0];
        const accessor = doc.accessors[primitive.attributes.POSITION];
        const view = doc.bufferViews[accessor.bufferView];
        const offset = 28 + jsonSize + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        return createHash('sha256').update(bytes.subarray(offset, offset + accessor.count * 12)).digest('hex');
      });
      expect(new Set(hashes).size).toBe(4);
    }
  });

  it('shows worn gear, one per slot, and swaps trainers for worn shoes', () => {
    const s = hero3dScene({ ...base, gear: ['cap', 'crown', 'wing_shoes', 'smith_hammer'] });
    expect([...s.visible].sort()).toEqual(['gear_crown', 'gear_smith_hammer', 'gear_wing_shoes', 'hair_short']);
    expect(hero3dScene({ ...base, gear: [] }).visible.has('base_shoes')).toBe(true);
  });

  it('outfits, aids, colours and build', () => {
    const s = hero3dScene({ ...base, frame: 'f', build: 'full', gear: ['sport_ski', 'crutches'], beard: 'beard' });
    expect(s.url).toMatch(/hero_f_full\.glb/);
    expect(s.visible.has('outfit_sport_ski')).toBe(true);
    expect(s.visible.has('aid_crutches')).toBe(true);
    expect(s.visible.has('beard_beard')).toBe(true);
    expect(s.tints.kit_main).toBe('#8e3b5f');
    expect(s.tints.hair).toBe('#c9a15a');
    expect(s.build).toBe('full');
    expect(s).not.toHaveProperty('width');
  });

  it('selects distinct models from build and measured body without stretching', () => {
    for (const frame of ['m', 'f']) for (const build of HERO3D_BUILDS) {
      expect(hero3dScene({ ...base, frame, build }).url).toContain(`hero_${frame}_${build}.glb`);
    }
    const cases = [
      ['lean', 0.1, 0.2, 'slim'], ['average', 0.3, 0.3, 'average'],
      ['athletic', 0.3, 0.5, 'athletic'], ['muscular', 0.3, 0.8, 'athletic'],
      ['soft', 0.55, 0.4, 'full'], ['full', 0.8, 0.4, 'full'],
      ['average', 0.6, 0.8, 'full'], ['average', 0.3, 0.7, 'athletic'],
    ] as const;
    for (const [kind, fat, muscle, expected] of cases) {
      expect(hero3dBuild({ ...base, build: 'slim', body: { kind, fat, muscle } })).toBe(expected);
    }
    expect(hero3dUrl('invalid', 'invalid')).toContain('hero_f_average.glb');
  });

  it('big hair becomes short under a helmet', () => {
    const s = hero3dScene({ ...base, hair: 'afro', gear: ['champion_helm'] });
    expect(s.visible.has('hair_short')).toBe(true);
    expect(s.visible.has('hair_afro')).toBe(false);
  });

  it('a patterned kit puts its cloth on the shirt, unless a sport outfit brings club colours', () => {
    expect(hero3dScene({ ...base, outfit: 'forest' }).fabric).toBeNull();
    expect(hero3dScene({ ...base, outfit: 'ridder' }).fabric).toBe('ridder');
    expect(hero3dScene({ ...base, outfit: 'ridder', gear: ['sport_football'] }).fabric).toBeNull();
  });

  it('only known prefixes are switched', () => {
    expect(isToggleNode('gear_cap')).toBe(true);
    expect(isToggleNode('body_skin')).toBe(false);
  });
});
