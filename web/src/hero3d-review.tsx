import { createRoot } from 'react-dom/client';
import { DEFAULT_LOOK } from '@shared/hero';
import WalkVillage3D from './components/patient/WalkVillage3D';
import Hero3D, { loadModel } from './components/hero/Hero3D';
import { hero3dScene, HERO_MOTIONS } from './components/hero/hero3d';
import { I18nProvider } from './lib/i18n';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import './index.css';
import './components/hero/rpg.css';
if (!import.meta.env.DEV) throw new Error('Development visual review only');
const params = new URLSearchParams(location.search);
const study = params.has('study');
const look = { ...DEFAULT_LOOK, ...(study ? { frame: 'f', build: 'average', hair: 'bun', skin: 's5', outfit: 'forest', hairColor: 'darkbrown' } : {}), ...Object.fromEntries(params), gear: (params.get('gear') ?? (study ? '' : 'watch,gloves,shin_guards,balance_shoes,belt')).split(',') };
createRoot(document.getElementById('root')!).render(<I18nProvider><main className="mx-auto max-w-[480px] p-4"><h1 className="mb-3 text-lg">3D-held: {look.frame} / {look.build}</h1>{params.has('village') ? <WalkVillage3D look={look} buildings={[]} tvLabel="Oefenzaal" tvTitle="Synthetische test" tvLines={[]} onNear={()=>{}} onArrive={()=>{}} className="h-[600px] w-full"/> : <Hero3D look={look} studio={!params.has('legacyLighting')} palette={study || params.has('studio') ? { main: '#606852', dark: '#343b35', soft: '#eee5d2' } : undefined} portrait={params.has('portrait')} modelUrl={study ? '/hero3d/study/hero_f_average.glb' : undefined} className="h-[640px] w-full"/>}</main></I18nProvider>);

/** Exercise the exact exported clips and skeleton without changing the live inventory UI. */
export async function checkMotions() {
  const gltf = await loadModel(study ? '/hero3d/study/hero_f_average.glb' : hero3dScene(look).url);
  return HERO_MOTIONS.map(name => {
    const model = clone(gltf.scene);
    const mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations.find(c => c.name === name);
    if (!clip) throw new Error(`Missing ${name}`);
    const bones: THREE.Bone[] = [];
    model.traverse(o => { if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone); });
    const action = mixer.clipAction(clip).play();
    mixer.setTime(0);
    const before = bones.map(b => b.quaternion.toArray());
    mixer.setTime(clip.duration * .31);
    model.updateMatrixWorld(true);
    const changed = bones.filter((b, i) => b.quaternion.toArray().some((n, j) => Math.abs(n - before[i][j]) > .0001)).length;
    const finite = bones.every(b => b.matrixWorld.elements.every(Number.isFinite));
    action.stop(); mixer.uncacheRoot(model);
    return { name, changed, finite };
  });
}

/** Real browser decoding: a missing WebP map must not pass as an untextured fallback. */
export async function checkDecodedMaps() {
  const { scene } = await loadModel(hero3dScene(look).url);
  const result = { skin: false, iris: false, hair: false };
  const loaded = (texture: THREE.Texture | null) => {
    const image = texture?.image as { width?: number; height?: number } | undefined;
    return (image?.width ?? 0) > 0 && (image?.height ?? 0) > 0;
  };
  scene.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of materials) {
      const material = raw as THREE.MeshStandardMaterial;
      if (material.name === 'skin') result.skin ||= loaded(material.map) && loaded(material.normalMap);
      if (material.name === 'iris') result.iris ||= loaded(material.map);
      if (mesh.name === 'hair_bun') result.hair ||= loaded(material.map) && loaded(material.normalMap);
    }
  });
  return result;
}

/** Packed geometry must retain the original metre-based body size after skinning. */
export async function checkBodyHeight() {
  const gltf = await loadModel(hero3dScene(look).url);
  const model = clone(gltf.scene);
  model.updateMatrixWorld(true);
  const body = model.getObjectByName('body') ?? model;
  return new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3()).y;
}
