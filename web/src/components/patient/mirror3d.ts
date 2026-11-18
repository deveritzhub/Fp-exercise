import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

/**
 * A working mirror: the room is drawn a second time from the mirrored point of view onto a texture,
 * so the hero (and everything else) moves in it. Kept light for phones:
 *  - three only draws it when the mirror itself is in view (a wall that is left out costs nothing);
 *  - the reflection only reaches a few metres, so the village behind the walls is not drawn again;
 *  - one mirror at a time: a mirror seen in another shows its last picture instead of drawing again;
 *  - a small texture, smaller still on a small screen.
 * Faces +z; place it a hair in front of the glass.
 */
let reflecting = false;

export function mirror(width: number, height: number, opts: { reach?: number; tint?: number } = {}): THREE.Mesh {
  const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 600;
  const longSide = small ? 384 : 640;
  const tall = height >= width;
  const tw = Math.round(tall ? (longSide * width) / height : longSide);
  const th = Math.round(tall ? longSide : (longSide * height) / width);
  const r = new Reflector(new THREE.PlaneGeometry(width, height), { textureWidth: tw, textureHeight: th, color: opts.tint ?? 0xc9d2d6, clipBias: 0.003 });
  r.userData.noMerge = true;
  const draw = r.onBeforeRender;
  r.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    if (reflecting) return;
    const cam = camera as THREE.PerspectiveCamera;
    const far = cam.far;
    reflecting = true;
    try {
      // Only what is near: the room itself. The reflection camera copies the scene camera's projection.
      cam.far = Math.min(far, opts.reach ?? 14);
      cam.updateProjectionMatrix();
      draw.call(this, renderer, scene, camera, geometry, material, group);
    } finally {
      cam.far = far;
      cam.updateProjectionMatrix();
      reflecting = false;
    }
  };
  return r;
}
