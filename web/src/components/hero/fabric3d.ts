import * as THREE from 'three';
import { FABRIC_PLAIN, fabricUrl } from './hero3d';

/**
 * The painted cloth on the hero's shirt (web/public/hero3d/fabric). A patterned kit shows its own
 * picture in full colour; a plain kit gets a grey knit that the kit colour tints.
 */
const cache = new Map<string, THREE.Texture>();
/** How often the picture repeats over the shirt's own layout. */
const REPEAT = 3;

export function fabricTexture(key: string) {
  let t = cache.get(key);
  if (!t) {
    t = new THREE.TextureLoader().load(fabricUrl(key));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(REPEAT, REPEAT);
    t.flipY = false;
    t.anisotropy = 4;
    cache.set(key, t);
  }
  return t;
}

/** Dress one material of the hero model: the shirt takes the cloth, everything else only its colour. */
export function dress(mat: THREE.MeshStandardMaterial, base: string, tint: string | undefined, fabric: string | null) {
  if (base === 'kit_main') {
    mat.map = fabricTexture(fabric ?? FABRIC_PLAIN);
    mat.color.set(fabric ? '#ffffff' : tint ?? '#ffffff');
    mat.needsUpdate = true;
  } else if (tint) mat.color.set(tint);
}
