import * as THREE from 'three';

/**
 * A mirror on the wall: a glossy silver-grey pane, as the mirrors first were. It does not reflect the
 * room (a live reflection looked odd in the game). Faces +z; place it a hair in front of the wall.
 */
export function mirror(width: number, height: number, _opts: { reach?: number; tint?: number } = {}): THREE.Mesh {
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.08, metalness: 0.85 }));
  pane.userData.noMerge = true;
  pane.receiveShadow = true;
  return pane;
}
