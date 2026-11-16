import * as THREE from 'three';
import { mat } from '@/components/patient/Village3D';
import { cottage, painted } from '@/components/patient/WalkVillage3D';

/**
 * The six homes of the practice village, from a camp to a villa (shared/practiceVillage.ts).
 * Each one faces +z and stands on its own plot of about four by four.
 */
type Opts = Partial<THREE.MeshStandardMaterialParameters>;
function kit(g: THREE.Group) {
  const add = <T extends THREE.Mesh>(m: T, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  return {
    box: (w: number, h: number, d: number, c: number, x: number, y: number, z: number, o: Opts = {}) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, { flatShading: false, ...o })), x, y, z),
    cyl: (r: number, h: number, c: number, x: number, y: number, z: number, o: Opts = {}, r2 = r, seg = 12) => add(new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat(c, { flatShading: seg < 8, ...o })), x, y, z),
    cone: (r: number, h: number, c: number, x: number, y: number, z: number, seg = 4, o: Opts = {}) => add(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c, o)), x, y, z),
    ball: (r: number, c: number, x: number, y: number, z: number, o: Opts = {}) => add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(c, { flatShading: false, ...o })), x, y, z),
  };
}
const LIT: Opts = { emissive: 0xffd36b, emissiveIntensity: 0.6 };
const WOODEN = (): Opts => ({ map: painted('wood') });
const TILED = (): Opts => ({ map: painted('shingle', 2, 1) });

function gable(width: number, height: number, depth: number, color: number) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, mat(color, { map: painted('shingle', 0.5, 0.9), flatShading: false }));
  m.castShadow = true;
  return m;
}

function hedge(k: ReturnType<typeof kit>, x: number, z: number, w: number, d: number) {
  k.box(w, 0.45, d, 0x3f7d3a, x, 0.225, z);
}

/** Stage 0: a tent by a camp fire. */
function camp(g: THREE.Group) {
  const k = kit(g);
  const tent = k.cone(1.15, 1.25, 0xd9c9a3, -0.3, 0.62, -0.2, 4);
  tent.rotation.y = Math.PI / 4;
  tent.scale.z = 1.25;
  k.box(0.5, 0.75, 0.04, 0x4f3b25, -0.3, 0.38, 0.72);
  k.cyl(0.04, 1.5, 0x6b4a2b, -0.3, 0.75, -0.2);
  for (let i = 0; i < 6; i++) k.ball(0.11, 0x8d8a82, 1.0 + Math.cos(i) * 0.42, 0.06, 0.6 + Math.sin(i) * 0.42);
  for (const r of [0.4, -0.6]) k.cyl(0.06, 0.6, 0x5d4027, 1.0, 0.1, 0.6).rotation.set(Math.PI / 2, 0, r);
  k.cone(0.2, 0.5, 0xff9a3c, 1.0, 0.35, 0.6, 6, { emissive: 0xff6a1c, emissiveIntensity: 1.3 });
  k.cyl(0.16, 0.8, 0x7a5232, 1.75, 0.16, -0.2).rotation.z = Math.PI / 2;
  k.box(0.5, 0.3, 0.4, 0x8a6038, -1.3, 0.15, 0.6, WOODEN());
}

/** Stage 1: a plank hut with a lean-to roof and a wood pile. */
function hut(g: THREE.Group) {
  const k = kit(g);
  k.box(1.9, 1.3, 1.6, 0x9a7146, 0, 0.65, 0, WOODEN());
  const roof = k.box(2.3, 0.12, 2.0, 0x5d4027, 0, 1.45, 0, WOODEN());
  roof.rotation.x = 0.22;
  k.box(0.5, 0.9, 0.05, 0x4f3520, -0.3, 0.45, 0.81);
  k.box(0.4, 0.35, 0.05, 0xfff1b8, 0.5, 0.85, 0.81, LIT);
  for (const [x, y] of [[1.35, 0.12], [1.6, 0.12], [1.47, 0.33], [1.85, 0.12]]) k.cyl(0.12, 0.7, 0x7a5232, x, y, 0.2).rotation.x = Math.PI / 2;
  for (const x of [-1.7, -1.2]) k.box(0.08, 0.6, 0.08, 0x6b4a2b, x, 0.3, 1.2);
  k.box(0.7, 0.07, 0.06, 0x6b4a2b, -1.45, 0.45, 1.2);
}

/** Stage 3: a full house with a shed, a fence and a garden bed. */
function house(g: THREE.Group, roof: number) {
  g.add(cottage(roof, 1));
  const k = kit(g);
  k.box(1.0, 1.1, 1.3, 0xe9dcc0, 1.75, 0.55, -0.2, { map: painted('plaster') });
  const lean = k.box(1.15, 0.1, 1.5, roof, 1.75, 1.2, -0.2, TILED());
  lean.rotation.z = -0.25;
  for (let i = 0; i < 6; i++) k.box(0.07, 0.5, 0.07, 0xf2efe8, -1.9 + i * 0.5, 0.25, 1.95);
  k.box(2.6, 0.06, 0.05, 0xf2efe8, -0.65, 0.38, 1.95);
  k.box(1.1, 0.12, 0.55, 0x5d4027, -1.25, 0.06, 1.45);
  for (const [dx, c] of [[-0.35, 0xe8536b], [0, 0xf4c542], [0.35, 0xb07ae0]]) k.ball(0.1, c, -1.25 + dx, 0.2, 1.45);
}

/** Stage 4: a manor of two floors with a wing, hedges and lanterns. */
function manor(g: THREE.Group, roof: number) {
  const k = kit(g);
  k.box(3.3, 0.3, 2.5, 0xa9a59b, 0, 0.15, 0, { map: painted('stone', 2, 0.5) });
  k.box(3.1, 2.5, 2.3, 0xf3e6c8, 0, 1.55, 0, { map: painted('plaster') });
  for (const x of [-1.55, -0.5, 0.5, 1.55]) k.box(0.13, 2.5, 0.06, 0x6b4a2b, x, 1.55, 1.16);
  k.box(3.2, 0.13, 0.06, 0x6b4a2b, 0, 1.6, 1.16);
  const top = gable(3.7, 1.4, 2.7, roof);
  top.position.y = 2.8;
  g.add(top);
  k.box(1.5, 1.6, 1.7, 0xf3e6c8, -2.3, 1.1, -0.2, { map: painted('plaster') });
  const wing = gable(1.9, 0.9, 2.0, roof);
  wing.position.set(-2.3, 1.9, -0.2);
  g.add(wing);
  k.box(0.7, 1.25, 0.08, 0x7a5232, 0, 0.92, 1.17, WOODEN());
  k.box(1.2, 0.14, 0.6, 0xa9a59b, 0, 0.07, 1.5);
  for (const x of [-1.05, 1.05]) for (const y of [1.0, 2.15]) k.box(0.5, 0.55, 0.07, 0xfff1b8, x, y, 1.17, LIT);
  k.box(0.5, 0.55, 0.07, 0xfff1b8, 0, 2.15, 1.17, LIT);
  for (const x of [0.9, -0.9]) k.box(0.32, 1.1, 0.32, 0x8d8a82, x, 3.75, -0.5);
  hedge(k, -1.7, 2.1, 2.2, 0.4);
  hedge(k, 1.7, 2.1, 2.2, 0.4);
  for (const x of [-0.75, 0.75]) {
    k.cyl(0.04, 1.3, 0x4f3520, x, 0.65, 2.1);
    k.box(0.2, 0.24, 0.2, 0xfff1b8, x, 1.4, 2.1, { emissive: 0xffc35a, emissiveIntensity: 1.5 });
  }
}

/** Stage 5: a white villa with columns, a balcony, a pool, cypresses and a fountain. */
function villa(g: THREE.Group, roof: number) {
  const k = kit(g);
  const stone = 0xf6f1e4;
  k.box(4.3, 0.25, 3.0, 0xd9d4c9, 0, 0.125, 0);
  k.box(3.9, 2.3, 2.5, stone, 0, 1.4, 0);
  k.box(2.5, 1.5, 2.0, stone, 0, 3.3, -0.15);
  for (const [w, d, y, x0, z0] of [[4.3, 2.9, 2.6, 0, 0], [2.9, 2.4, 4.1, 0, -0.15]]) k.box(w, 0.14, d, 0xe4ded0, x0, y, z0);
  const hip = k.cone(2.1, 0.75, roof, 0, 4.55, -0.15, 4, TILED());
  hip.rotation.y = Math.PI / 4;
  for (const x of [-1.5, -0.5, 0.5, 1.5]) k.cyl(0.13, 2.3, 0xffffff, x, 1.4, 1.55, {}, 0.11, 14);
  k.box(3.6, 0.16, 0.7, 0xe4ded0, 0, 2.6, 1.55);
  for (let i = 0; i < 9; i++) k.box(0.05, 0.4, 0.05, 0xffffff, -1.6 + i * 0.4, 2.9, 1.85);
  k.box(3.4, 0.06, 0.07, 0xffffff, 0, 3.1, 1.85);
  k.box(0.8, 1.5, 0.08, 0x7a5232, 0, 1.0, 1.27, WOODEN());
  for (const x of [-1.25, 1.25]) k.box(0.7, 1.0, 0.07, 0x9fd3e6, x, 1.4, 1.27, { roughness: 0.1, metalness: 0.4 });
  for (const x of [-0.7, 0.7]) k.box(0.6, 0.8, 0.07, 0x9fd3e6, x, 3.3, 0.87, { roughness: 0.1, metalness: 0.4 });
  // The pool, the garden and the gold on the roof.
  k.box(2.3, 0.14, 1.4, 0xf2efe8, 3.5, 0.07, 0.6);
  k.box(2.0, 0.06, 1.1, 0x38b6d9, 3.5, 0.13, 0.6, { roughness: 0.08, metalness: 0.2, emissive: 0x1c7fa0, emissiveIntensity: 0.25 });
  k.box(0.5, 0.05, 1.0, 0xe8536b, 3.5, 0.17, -0.6);
  for (const [x, z] of [[-2.7, 1.8], [-2.7, -1.2], [5.0, -1.0]]) {
    k.cyl(0.07, 0.4, 0x5d4027, x, 0.2, z);
    k.cone(0.34, 2.0, 0x2f6b3a, x, 1.35, z, 8);
  }
  hedge(k, -1.6, 2.5, 2.2, 0.4);
  hedge(k, 1.6, 2.5, 2.2, 0.4);
  k.cyl(0.6, 0.22, 0xd9d4c9, 0, 0.11, 3.3, {}, 0.6, 16);
  k.cyl(0.5, 0.05, 0x38b6d9, 0, 0.23, 3.3, { roughness: 0.1 }, 0.5, 16);
  k.cyl(0.07, 0.6, 0xd9d4c9, 0, 0.5, 3.3);
  k.ball(0.14, 0xe4bc63, 0, 0.88, 3.3, { metalness: 0.7, roughness: 0.25 });
  k.cyl(0.03, 1.1, 0xe4bc63, 0, 5.4, -0.15, { metalness: 0.7, roughness: 0.3 });
  k.box(0.5, 0.3, 0.03, 0xe4bc63, 0.27, 5.75, -0.15, { metalness: 0.5, roughness: 0.4 });
}

const ROOFS = [0xb5532c, 0x2759a0, 0x8e3b5f, 0x29483c, 0xc9a14a, 0x7a2f24];

/** The home for a stage (0 = camp … 5 = villa). `no` only varies the roof colour. */
export function dwelling(stage: number, no: number) {
  const g = new THREE.Group();
  const roof = ROOFS[no % ROOFS.length];
  if (stage <= 0) camp(g);
  else if (stage === 1) hut(g);
  else if (stage === 2) g.add(cottage(roof, 0.85));
  else if (stage === 3) house(g, roof);
  else if (stage === 4) manor(g, roof);
  else villa(g, roof);
  return g;
}

/** Height of the label over each stage. */
export const DWELLING_TOP = [1.9, 2.3, 3.2, 3.7, 4.9, 6.3];
