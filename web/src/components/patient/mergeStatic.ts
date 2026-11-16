import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Materials made one by one but alike (same kind, colour, picture and finish) count as one. */
function look(mt: THREE.Material): string {
  const m = mt as THREE.MeshStandardMaterial & { color?: THREE.Color; emissive?: THREE.Color };
  return [
    mt.type,
    m.color?.getHexString() ?? '',
    m.map?.uuid ?? '',
    m.emissive?.getHexString() ?? '',
    m.emissiveIntensity ?? '',
    m.roughness ?? '',
    m.metalness ?? '',
    m.flatShading ? 'f' : '',
    m.vertexColors ? 'v' : '',
    mt.transparent ? `t${mt.opacity}` : '',
    mt.side,
    m.alphaMap?.uuid ?? '',
    m.normalMap?.uuid ?? '',
  ].join('/');
}

/**
 * Fewer things to draw: the meshes inside a group that share a material become one mesh, so the phone
 * draws a cow, a house or a tower in a few calls instead of dozens. The group itself keeps its place,
 * so moving, turning or hiding it works as before, and so does fading (it goes by the material).
 *
 * Left as they are: anything with bones (people and the hero), meshes marked `userData.dynamic` (they
 * move on their own), groups marked `userData.noMerge`, and meshes with more than one material. A group
 * marked `userData.mergeRoot` is merged on its own, because it may be taken out later as a whole.
 * Call before the first frame: the meshes taken out are not disposed (their geometry may be shared).
 */
export function mergeStatic(root: THREE.Object3D): number {
  let rigged = false;
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh || (o as THREE.Bone).isBone) rigged = true;
  });
  if (rigged || root.userData.noMerge) return 0;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, THREE.Mesh[]>();
  let saved = 0;
  const visit = (o: THREE.Object3D) => {
    for (const c of [...o.children]) {
      if (c.userData.noMerge) continue;
      if (c.userData.mergeRoot) {
        saved += mergeStatic(c);
        continue;
      }
      const m = c as THREE.Mesh;
      if (m.isMesh && !(m as unknown as THREE.InstancedMesh).isInstancedMesh && !m.userData.dynamic && !Array.isArray(m.material) && m.visible) {
        const g = m.geometry;
        const key = `${look(m.material as THREE.Material)}|${Object.keys(g.attributes).sort().join(',')}|${g.index ? 'i' : 'n'}|${Object.keys(g.morphAttributes).length}`;
        const list = buckets.get(key);
        if (list) list.push(m);
        else buckets.set(key, [m]);
      }
      visit(c);
    }
  };
  visit(root);
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map((m) => m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)));
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.castShadow = list.some((m) => m.castShadow);
    mesh.receiveShadow = list.some((m) => m.receiveShadow);
    for (const m of list) m.parent?.remove(m);
    root.add(mesh);
    saved += list.length - 1;
  }
  return saved;
}
