import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_SLOT, HERO_OPTIONS } from '@shared/hero';
import { hero3dScene, hero3dBuild, hero3dUrl, HERO3D_BUILDS, BASE_KIT_NODES, TAILORED_OUTFITS, isToggleNode, withBaseKit } from './hero3d';

/** Node names inside a .glb (the JSON chunk right after the 12-byte header). */
function glbNodeNames(file: string): Set<string> {
  const buf = fs.readFileSync(file);
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as { nodes: { name?: string }[] };
  return new Set(json.nodes.map((n) => n.name ?? ''));
}

const base = { skin: 's4', hair: 'short', outfit: 'forest', hairColor: 'blond', eyeColor: 'blue', frame: 'm', beard: 'none', glasses: 'none' };

describe('3D hero', () => {
  it('the face study keeps its irises on the eyeballs and exports tintable detailed eyes', () => {
    const bytes = fs.readFileSync(path.resolve(import.meta.dirname, '../../../public/hero3d/study/hero_f_portrait.glb'));
    const size = bytes.readUInt32LE(12);
    const doc = JSON.parse(bytes.subarray(20, 20 + size).toString());
    const positions = (name: string): number[][] => {
      const node = doc.nodes.find((n: { name: string }) => n.name === name);
      const primitive = doc.meshes[node.mesh].primitives[0];
      const accessor = doc.accessors[primitive.attributes.POSITION];
      const view = doc.bufferViews[accessor.bufferView];
      const start = 28 + size + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      return Array.from({ length: accessor.count }, (_, i) => [0, 4, 8].map(j => bytes.readFloatLE(start + i * (view.byteStride ?? 12) + j)));
    };
    const eyeballs = positions('body_eyes');
    for (const name of ['body_iris_l', 'body_iris_r']) {
      const distances = positions(name).map(p => Math.sqrt(Math.min(...eyeballs.map(q => q.reduce((sum, x, j) => sum + (x - p[j]) ** 2, 0)))));
      expect(Math.max(...distances), name).toBeLessThan(.0025);
    }
    const iris = doc.materials.find((m: { name: string }) => m.name === 'iris');
    expect(iris.pbrMetallicRoughness.baseColorTexture).toBeDefined();
    expect(iris.extensions.KHR_materials_clearcoat).toBeDefined();
    expect(gzipSync(bytes).byteLength).toBeLessThan(3_000_000);
    expect(doc.animations.map((a: { name: string }) => a.name).sort()).toEqual(['cheer', 'idle', 'run', 'walk']);
    const names = new Set(doc.nodes.map((n: { name: string }) => n.name));
    for (const [key, slot] of Object.entries(GEAR_SLOT)) expect(names.has(`${slot === 'outfit' ? 'outfit' : 'gear'}_${key}`), key).toBe(true);
  });
  it('the separate art study retains every gear key and animation within its mobile download budget', () => {
    const file = path.resolve(import.meta.dirname, '../../../public/hero3d/study/hero_f_average.glb');
    const names = glbNodeNames(file);
    for (const [key, slot] of Object.entries(GEAR_SLOT)) expect(names.has(`${slot === 'outfit' ? 'outfit' : 'gear'}_${key}`), key).toBe(true);
    const bytes = fs.readFileSync(file);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    expect(doc.animations.map((a: { name: string }) => a.name).sort()).toEqual(['cheer', 'idle', 'run', 'walk']);
    expect(gzipSync(bytes).byteLength).toBeLessThan(2_500_000);
    expect(names.has('hair_bun')).toBe(true);
    expect(doc.materials.find((m: { name: string }) => m.name === 'skin').normalTexture).toBeDefined();
  });
  for (const frame of ['m', 'f']) for (const build of HERO3D_BUILDS) {
    it(`model ${frame}/${build} has a node for every gear piece, hair style, beard and glasses`, () => {
      const names = glbNodeNames(path.resolve(import.meta.dirname, `../../../public/hero3d/hero_${frame}_${build}.glb`));
      const want = [
        ...Object.entries(GEAR_SLOT).map(([k, slot]) => (slot === 'outfit' ? `outfit_${k}` : `gear_${k}`)),
        ...HERO_OPTIONS.hair.filter((h) => h !== 'none').map((h) => `hair_${h}`),
        ...HERO_OPTIONS.beard.filter((b) => b !== 'none').map((b) => `beard_${b}`),
        ...HERO_OPTIONS.glasses.filter((g) => g !== 'none').map((g) => `glasses_${g}`),
        'aid_crutches', 'base_shoes', 'body', 'body_eyebrows', 'body_eyelashes', 'body_iris_l', 'body_iris_r',
      ];
      expect(want.filter((n) => !names.has(n))).toEqual([]);
      const bytes = fs.readFileSync(path.resolve(import.meta.dirname, `../../../public/hero3d/hero_${frame}_${build}.glb`));
      expect(gzipSync(bytes).byteLength).toBeLessThan(2_500_000);
      const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
      expect(doc.animations.map((a: { name: string }) => a.name).sort()).toEqual(['cheer', 'idle', 'run', 'walk']);
      expect(doc.skins.length).toBeGreaterThan(0);
      expect(doc.materials.find((m: {name: string}) => m.name === 'skin').pbrMetallicRoughness.roughnessFactor).toBe(.5);
      const skin = doc.materials.find((m: { name: string }) => m.name === 'skin');
      expect(skin.pbrMetallicRoughness.baseColorTexture).toBeDefined();
      expect(skin.normalTexture).toBeDefined();
      for (const outfit of TAILORED_OUTFITS) {
        expect(names.has(`tailored_jacket_${outfit}`)).toBe(true);
        expect(names.has(`tailored_trousers_${outfit}`)).toBe(true);
      }
      const champion = doc.nodes.find((n:{name:string})=>n.name==='outfit_champion');
      expect(champion.children.some((i:number)=>doc.nodes[i].name.startsWith('sash'))).toBe(false);
      expect(doc.materials.find((m: {name: string}) => m.name === 'kit_main').normalTexture).toBeDefined();
      for (const key of ['base_shoes','gear_gold_shoes','gear_balance_shoes','gear_spikes','gear_wing_shoes']) {
        expect(names.has(`fitted_trainer_${key}`)).toBe(true);
      }
      expect(doc.extensionsRequired).toContain('EXT_texture_webp');
      expect(doc.extensionsRequired).toContain('KHR_mesh_quantization');
      expect(doc.asset.extras.fpFlowPositionScale / 32767).toBeLessThan(.0001);
      // These accessories must stay on the torso/upper arm when the hands lift in cheer.
      for (const [rootName,bone] of [['gear_belt','pelvis'],['gear_hr_band','spine_03'],['gear_captain','upperarm_l']]) {
        const root=doc.nodes.find((n:{name:string})=>n.name===rootName);
        const pending=[...(root.children??[])];
        while(pending.length) {
          const node=doc.nodes[pending.pop()!];pending.push(...(node.children??[]));
          if(node.mesh===undefined)continue;
          const joint=doc.skins[node.skin].joints.findIndex((index:number)=>doc.nodes[index].name===bone);
          for(const primitive of doc.meshes[node.mesh].primitives) {
            const a=doc.accessors[primitive.attributes.JOINTS_0],v=doc.bufferViews[a.bufferView];
            const w=doc.accessors[primitive.attributes.WEIGHTS_0],wv=doc.bufferViews[w.bufferView];
            const start=28+bytes.readUInt32LE(12)+(v.byteOffset??0)+(a.byteOffset??0);
            const weightStart=28+bytes.readUInt32LE(12)+(wv.byteOffset??0)+(w.byteOffset??0);
            for(let i=0;i<a.count;i++) {
              expect(bytes[start+i*(v.byteStride??4)],`${frame}/${build}/${rootName}`).toBe(joint);
              expect(bytes[weightStart+i*(wv.byteStride??4)]).toBe(255);
            }
          }
        }
      }
      const watch=doc.nodes.find((n:{name:string})=>n.name==='gear_watch');
      const watchPosition=(prefix:string)=>{
        const node=watch.children.map((i:number)=>doc.nodes[i]).find((n:{name:string})=>n.name.startsWith(prefix));
        return doc.accessors[doc.meshes[node.mesh].primitives[0].attributes.POSITION];
      };
      const face=watchPosition('face'),casePosition=watchPosition('case');
      const lead=(face.min[2]+face.max[2]-casePosition.min[2]-casePosition.max[2])/2*doc.asset.extras.fpFlowPositionScale/32767;
      expect(lead).toBeGreaterThan(.004);
      expect(lead).toBeLessThan(.006);
      // A shirt/trouser hem spans the midline below the chest. It must not pick up a
      // nearby relaxed wrist's weights and stretch up to the hands during a cheer.
      for(const node of doc.nodes) {
        if(!node.name?.startsWith('tailored_binding')||node.mesh===undefined)continue;
        for(const primitive of doc.meshes[node.mesh].primitives) {
          const attrs=primitive.attributes,pos=doc.accessors[attrs.POSITION];
          const scale=doc.asset.extras.fpFlowPositionScale/32767;
          if(pos.min[0]*scale>-.08||pos.max[0]*scale<.08||(pos.min[1]+pos.max[1])/2*scale>1.25)continue;
          const ja=doc.accessors[attrs.JOINTS_0],jv=doc.bufferViews[ja.bufferView];
          const wa=doc.accessors[attrs.WEIGHTS_0],wv=doc.bufferViews[wa.bufferView];
          const binary=28+bytes.readUInt32LE(12);
          for(let i=0;i<ja.count;i++)for(let c=0;c<4;c++) {
            const weight=bytes[binary+(wv.byteOffset??0)+(wa.byteOffset??0)+i*(wv.byteStride??4)+c];
            if(!weight)continue;
            const joint=bytes[binary+(jv.byteOffset??0)+(ja.byteOffset??0)+i*(jv.byteStride??4)+c];
            const bone=doc.nodes[doc.skins[node.skin].joints[joint]].name;
            expect(bone,`${frame}/${build}/${node.name}`).not.toMatch(/^(upperarm|lowerarm|hand|index|middle|ring|pinky|thumb)/);
          }
        }
      }
      expect(doc.images.some((image: { mimeType: string }) => image.mimeType === 'image/webp')).toBe(true);
      const iris = doc.materials.find((m: { name: string }) => m.name === 'iris');
      expect(iris.pbrMetallicRoughness.baseColorTexture).toBeDefined();
      expect(iris.extensions.KHR_materials_clearcoat).toBeDefined();
      // Native glTF packed skin weights must still sum to exactly one at every vertex.
      const weightIndices = new Set<number>(doc.meshes.flatMap((m: { primitives: { attributes: Record<string, number> }[] }) => m.primitives.map(p => p.attributes.WEIGHTS_0)).filter((i: number | undefined) => i !== undefined));
      let invalidWeights = 0;
      for (const index of weightIndices) {
        const accessor = doc.accessors[index];
        expect(accessor.componentType).toBe(5121);
        expect(accessor.normalized).toBe(true);
        const view = doc.bufferViews[accessor.bufferView];
        const start = 28 + bytes.readUInt32LE(12) + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        for (let i = 0; i < accessor.count; i++) {
          const offset = start + i * (view.byteStride ?? 4);
          if (bytes[offset] + bytes[offset + 1] + bytes[offset + 2] + bytes[offset + 3] !== 255) invalidWeights++;
        }
      }
      expect(invalidWeights).toBe(0);
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
        expect(accessor.componentType).toBe(5122);
        expect(accessor.normalized).toBe(true);
        return createHash('sha256').update(bytes.subarray(offset, offset + accessor.count * 6)).digest('hex');
      });
      expect(new Set(hashes).size).toBe(4);
    }
  });

  it('shows worn gear, one per slot, and swaps trainers for worn shoes', () => {
    const s = hero3dScene({ ...base, gear: ['cap', 'crown', 'wing_shoes', 'smith_hammer'] });
    expect([...s.visible].sort()).toEqual([...BASE_KIT_NODES, 'gear_crown', 'gear_smith_hammer', 'gear_wing_shoes', 'hair_short'].sort());
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

  it('complete tailored outfits replace the base kit and unequipping restores it', () => {
    for (const outfit of TAILORED_OUTFITS) {
      const worn = hero3dScene({ ...base, gear: [outfit] });
      for (const name of BASE_KIT_NODES) {
        expect(isToggleNode(name)).toBe(true);
        expect(worn.visible.has(name)).toBe(false);
        expect(hero3dScene({ ...base, gear: [] }).visible.has(name)).toBe(true);
      }
    }
    expect(isToggleNode('body_skin')).toBe(false);
  });

  it('every shop item has a thumbnail rendered from its wearable geometry', () => {
    for (const item of GEAR) {
      const png = fs.readFileSync(path.resolve(import.meta.dirname, `../../../public/hero3d/items/${item.key}.png`));
      expect(png.subarray(1,4).toString(), item.key).toBe('PNG');
      expect(png.readUInt32BE(16), item.key).toBe(256);
      expect(png.readUInt32BE(20), item.key).toBe(256);
    }
  });

  it('village staff and fallback villagers retain a base kit unless their outfit replaces it', () => {
    const nodes = new Set(['hair_short','outfit_team_kit']);
    const dressed = withBaseKit(nodes);
    expect(nodes.has('body_shirt')).toBe(false);
    for (const name of BASE_KIT_NODES) expect(dressed.has(name)).toBe(true);
    const complete = withBaseKit([...dressed,'outfit_tracksuit']);
    for (const name of BASE_KIT_NODES) expect(complete.has(name)).toBe(false);
    expect(complete.has('hair_short')).toBe(true);
    expect(withBaseKit(complete)).toEqual(complete);
    for(const name of BASE_KIT_NODES) expect(withBaseKit(['outfit_champion'],false).has(name)).toBe(true);
  });
});
