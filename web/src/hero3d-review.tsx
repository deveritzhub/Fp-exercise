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
const look = { ...DEFAULT_LOOK, ...Object.fromEntries(params), gear: (params.get('gear') ?? 'watch,gloves,shin_guards,balance_shoes,belt').split(',') };
createRoot(document.getElementById('root')!).render(<I18nProvider><main className="mx-auto max-w-[360px] p-4"><h1 className="mb-3 text-lg">3D-held: {look.frame} / {look.build}</h1>{params.has('village') ? <WalkVillage3D look={look} buildings={[]} tvLabel="Oefenzaal" tvTitle="Synthetische test" tvLines={[]} onNear={()=>{}} onArrive={()=>{}} className="h-[600px] w-full"/> : <Hero3D look={look} className="h-[520px] w-full"/>}</main></I18nProvider>);

/** Exercise the exact exported clips and skeleton without changing the live inventory UI. */
export async function checkMotions() {
  const gltf = await loadModel(hero3dScene(look).url);
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
