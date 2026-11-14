import * as THREE from 'three';
import { FABRIC_PLAIN, fabricUrl } from './hero3d';

/**
 * The painted cloth on the hero's shirt (web/public/hero3d/fabric). A patterned kit shows its own
 * picture in full colour; a plain kit gets a grey knit that the kit colour tints.
 */
const cache = new Map<string, THREE.Texture>();
const readiness = new Map<string, Promise<void>>();
/** How often the picture repeats over the shirt's own layout. */
const REPEAT = 3;

export function fabricTexture(key: string) {
  let t = cache.get(key);
  if (!t) {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const ready = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    // The village paints continuously and does not await a texture; handle that consumer too.
    ready.catch(() => {});
    readiness.set(key, ready);
    t = new THREE.TextureLoader().load(fabricUrl(key), () => resolve(), undefined, () => {
      cache.delete(key); readiness.delete(key);
      reject(new Error('Cloth texture could not load'));
    });
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(REPEAT, REPEAT);
    t.flipY = false;
    t.anisotropy = 4;
    cache.set(key, t);
  }
  return t;
}

/** A ready preview includes its cloth image, rather than a temporary black texture. */
export async function waitForFabric(key: string) {
  fabricTexture(key);
  await readiness.get(key);
}

/** Dress one material of the hero model: the shirt takes the cloth, everything else only its colour. */
export function dress(mat: THREE.MeshStandardMaterial, base: string, tint: string | undefined, fabric: string | null) {
  if (base === 'kit_main') {
    mat.map = fabricTexture(fabric ?? FABRIC_PLAIN);
    mat.color.set(fabric ? '#ffffff' : tint ?? '#ffffff');
    mat.needsUpdate = true;
  } else if (tint) mat.color.set(tint);
}
