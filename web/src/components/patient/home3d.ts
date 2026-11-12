import * as THREE from 'three';
import { kit, plant } from './practice3d';

/**
 * The furniture of the patient's own home (shared/homeDecor.ts): one small model per piece, standing
 * on the floor at the origin and facing +z. Simple shapes in warm colours, like the rest of the room.
 */
const WOOD = 0x9a6b3f;
const DARK = 0x5b3f26;
const CLOTH = 0x8e3b5f;
const CREAM = 0xf1e6cf;
const BLACK = 0x1d1f1e;
const GOLD = { metalness: 0.75, roughness: 0.25 } as const;

export function furniture(key: string): THREE.Group {
  const g = new THREE.Group();
  const k = kit(g);
  switch (key) {
    case 'home_rug': {
      k.box(1.9, 0.03, 1.3, CLOTH, 0, 0.015, 0).castShadow = false;
      k.box(1.6, 0.035, 1.0, 0xe4bc63, 0, 0.017, 0).castShadow = false;
      k.box(1.3, 0.04, 0.7, CLOTH, 0, 0.019, 0).castShadow = false;
      break;
    }
    case 'home_mat': {
      k.box(0.8, 0.035, 1.9, 0x3f8f7a, 0, 0.018, 0).castShadow = false;
      k.cyl(0.09, 0.8, 0x2f6f5e, 0, 0.09, -1.05).rotation.z = Math.PI / 2;
      break;
    }
    case 'home_stool': {
      k.cyl(0.24, 0.07, WOOD, 0, 0.45, 0);
      for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) k.box(0.05, 0.42, 0.05, DARK, x, 0.21, z);
      break;
    }
    case 'home_chair': {
      k.box(0.46, 0.06, 0.46, WOOD, 0, 0.46, 0);
      k.box(0.46, 0.55, 0.06, WOOD, 0, 0.76, -0.2);
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) k.box(0.06, 0.44, 0.06, DARK, x, 0.22, z);
      k.box(0.4, 0.05, 0.4, CLOTH, 0, 0.51, 0.01);
      break;
    }
    case 'home_plant': {
      k.cyl(0.2, 0.34, 0x9c5a40, 0, 0.17, 0, {}, 0.25);
      plant(g, 0, 0.4, 0, 8, 0.2, 1.0, 0.22);
      break;
    }
    case 'home_lamp': {
      k.cyl(0.2, 0.05, BLACK, 0, 0.025, 0);
      k.cyl(0.025, 1.5, BLACK, 0, 0.78, 0);
      k.cyl(0.26, 0.34, 0xfff1b8, 0, 1.62, 0, { emissive: 0xffc35a, emissiveIntensity: 1.2 }, 0.16).castShadow = false;
      break;
    }
    case 'home_table': {
      k.box(1.1, 0.07, 0.75, WOOD, 0, 0.72, 0);
      for (const [x, z] of [[-0.48, -0.3], [0.48, -0.3], [-0.48, 0.3], [0.48, 0.3]]) k.box(0.07, 0.7, 0.07, DARK, x, 0.35, z);
      k.cyl(0.11, 0.05, 0x2759a0, 0.2, 0.78, 0.05);
      k.ball(0.07, 0xe8536b, 0.2, 0.86, 0.05);
      break;
    }
    case 'home_bed': {
      k.box(1.1, 0.26, 1.95, DARK, 0, 0.2, 0);
      k.box(1.0, 0.18, 1.85, CREAM, 0, 0.42, 0);
      k.box(1.02, 0.2, 1.2, 0x2759a0, 0, 0.44, 0.3);
      k.box(0.7, 0.14, 0.36, 0xffffff, 0, 0.55, -0.68);
      k.box(1.1, 0.75, 0.08, DARK, 0, 0.55, -0.98);
      break;
    }
    case 'home_shelf': {
      k.box(1.0, 1.7, 0.34, DARK, 0, 0.85, 0);
      for (let i = 0; i < 4; i++) {
        k.box(0.9, 0.03, 0.3, WOOD, 0, 0.25 + i * 0.4, 0.03);
        [0xb5532c, 0x2759a0, 0x29483c, 0xc9a14a, 0x8e3b5f].forEach((c, j) => k.box(0.1, 0.26 + ((i + j) % 3) * 0.03, 0.2, c, -0.34 + j * 0.15 + (i % 2) * 0.03, 0.4 + i * 0.4, 0.06));
      }
      break;
    }
    case 'home_weights': {
      for (const y of [0.35, 0.75]) k.box(1.0, 0.05, 0.36, DARK, 0, y, 0);
      for (const x of [-0.46, 0.46]) k.box(0.07, 0.85, 0.36, BLACK, x, 0.42, 0);
      for (let i = 0; i < 3; i++) {
        for (const y of [0.45, 0.85]) {
          k.cyl(0.022, 0.24, 0xc9cccc, -0.28 + i * 0.28, y, 0).rotation.x = Math.PI / 2;
          for (const z of [-0.1, 0.1]) k.cyl(0.07 + i * 0.012, 0.08, BLACK, -0.28 + i * 0.28, y, z).rotation.x = Math.PI / 2;
        }
      }
      break;
    }
    case 'home_sofa': {
      k.box(1.6, 0.3, 0.75, CLOTH, 0, 0.3, 0);
      k.box(1.6, 0.6, 0.2, CLOTH, 0, 0.6, -0.3);
      for (const x of [-0.72, 0.72]) k.box(0.18, 0.5, 0.75, 0x6d2d49, x, 0.45, 0);
      for (const x of [-0.36, 0.36]) k.box(0.62, 0.12, 0.5, 0xa5486f, x, 0.5, 0.06);
      k.box(0.34, 0.3, 0.1, 0xe4bc63, -0.4, 0.68, -0.14).rotation.x = -0.25;
      break;
    }
    case 'home_chest': {
      k.box(0.8, 0.42, 0.52, WOOD, 0, 0.21, 0);
      const lid = k.cyl(0.26, 0.8, DARK, 0, 0.42, 0);
      lid.rotation.z = Math.PI / 2;
      lid.scale.set(0.6, 1, 1);
      for (const x of [-0.3, 0.3]) k.box(0.07, 0.5, 0.54, 0xe4bc63, x, 0.25, 0, GOLD);
      k.box(0.12, 0.14, 0.04, 0xe4bc63, 0, 0.34, 0.27, GOLD);
      break;
    }
    case 'home_fireplace': {
      k.box(1.3, 1.25, 0.5, 0x8d8a82, 0, 0.62, 0);
      k.box(1.5, 0.12, 0.6, DARK, 0, 1.3, 0);
      k.box(0.7, 0.62, 0.3, BLACK, 0, 0.36, 0.12);
      k.box(0.5, 2.0, 0.4, 0x8d8a82, 0, 2.1, -0.05);
      for (const [x, r] of [[-0.14, 0.4], [0.14, -0.3]]) k.cyl(0.06, 0.5, 0x5d4027, x, 0.12, 0.2).rotation.set(Math.PI / 2, 0, r);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff6a1c, emissiveIntensity: 1.6 }));
      flame.position.set(0, 0.36, 0.2);
      g.add(flame);
      break;
    }
    case 'home_statue': {
      k.box(0.5, 0.5, 0.5, 0x8d8a82, 0, 0.25, 0);
      k.cyl(0.12, 0.6, 0xe4bc63, 0, 0.8, 0, GOLD, 0.09);
      k.ball(0.11, 0xe4bc63, 0, 1.2, 0, GOLD);
      const arm = k.cyl(0.035, 0.5, 0xe4bc63, 0.16, 1.15, 0, GOLD);
      arm.rotation.z = -0.5;
      k.ball(0.07, 0xe4bc63, 0.3, 1.42, 0, GOLD);
      break;
    }
    default:
      k.box(0.4, 0.4, 0.4, WOOD, 0, 0.2, 0);
  }
  return g;
}
