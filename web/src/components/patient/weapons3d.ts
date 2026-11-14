import * as THREE from 'three';

/**
 * The weapons of the adventure, made of simple shapes and put in the hero's right hand. Each is
 * built standing up from the grip (the grip at the origin), in metres.
 */
const m = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...o });
const WOOD = 0x8a5f38;
const STEEL = { metalness: 0.75, roughness: 0.3 };
const part = (g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, y: number, rz = 0) => {
  const o = new THREE.Mesh(geo, mat);
  o.position.y = y;
  o.rotation.z = rz;
  o.castShadow = true;
  g.add(o);
  return o;
};

export function weaponMesh(key: string): THREE.Group | null {
  const g = new THREE.Group();
  if (key === 'staff') {
    part(g, new THREE.CylinderGeometry(0.016, 0.02, 1.25, 8), m(WOOD), 0.3);
    part(g, new THREE.SphereGeometry(0.035, 10, 8), m(0x6b4a2b), 0.94);
  } else if (key === 'club') {
    part(g, new THREE.CylinderGeometry(0.05, 0.02, 0.6, 10), m(0x7a5232), 0.22);
    for (const y of [0.36, 0.44]) part(g, new THREE.TorusGeometry(0.05, 0.008, 6, 14), m(0x8c8f8a, STEEL), y).rotation.x = Math.PI / 2;
  } else if (key === 'hammer') {
    part(g, new THREE.CylinderGeometry(0.016, 0.018, 0.62, 8), m(WOOD), 0.22);
    part(g, new THREE.BoxGeometry(0.2, 0.1, 0.1), m(0x6f7478, STEEL), 0.52);
  } else if (key === 'sword' || key === 'hero_sword') {
    const gold = key === 'hero_sword';
    part(g, new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), m(gold ? 0x29483c : 0x3a2a22), 0);
    part(g, new THREE.BoxGeometry(0.2, 0.025, 0.035), m(gold ? 0xe4bc63 : 0x8c8f8a, STEEL), 0.09);
    part(g, new THREE.BoxGeometry(gold ? 0.06 : 0.05, gold ? 0.8 : 0.68, 0.012), m(gold ? 0xf6e2a6 : 0xd5dadd, gold ? { metalness: 0.8, roughness: 0.2, emissive: 0x7a5a10, emissiveIntensity: 0.35 } : STEEL), gold ? 0.5 : 0.44);
    part(g, new THREE.SphereGeometry(0.024, 10, 8), m(gold ? 0xe4bc63 : 0x8c8f8a, STEEL), -0.1);
  } else if (key === 'axe') {
    part(g, new THREE.CylinderGeometry(0.016, 0.02, 0.78, 8), m(WOOD), 0.28);
    for (const s of [-1, 1]) {
      const blade = part(g, new THREE.CylinderGeometry(0.15, 0.15, 0.018, 16, 1, false, 0, Math.PI), m(0xc9cfd3, STEEL), 0.58);
      blade.rotation.set(Math.PI / 2, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      blade.position.x = s * 0.02;
    }
  } else if (key === 'spear') {
    part(g, new THREE.CylinderGeometry(0.014, 0.016, 1.5, 8), m(WOOD), 0.4);
    part(g, new THREE.ConeGeometry(0.04, 0.2, 8), m(0xd5dadd, STEEL), 1.25);
  } else if (key === 'gloves') {
    // Worn, not held: a padded fist round the hand.
    const fist = part(g, new THREE.SphereGeometry(0.075, 14, 12), m(0xc2201f, { roughness: 0.4 }), 0.05);
    fist.scale.set(1, 1.15, 0.9);
    part(g, new THREE.CylinderGeometry(0.055, 0.06, 0.07, 12), m(0xf4f2ec), -0.04);
  } else return null;
  return g;
}
