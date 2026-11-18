import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeStatic } from './mergeStatic';

/**
 * The equipment of the practice, modelled in code with more care than plain boxes: rounded padded
 * tops with seams, steel with holes and hooks, plates with their colours, castors and gas lifts,
 * and a real monstera with its split leaves. Each model is merged per material afterwards, so it
 * costs only a few draw calls. All face +z with their middle on the floor at the origin.
 */

const mats = new Map<string, THREE.MeshStandardMaterial>();
const m = (color: number, rough = 0.6, metal = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
  const k = `${color}/${rough}/${metal}/${JSON.stringify(extra)}`;
  let v = mats.get(k);
  if (!v) {
    v = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
    mats.set(k, v);
  }
  return v;
};
const STEEL_BLACK = () => m(0x1c1d1e, 0.45, 0.55);
const CHROME = () => m(0xd5d8da, 0.22, 0.9);
const RUBBER = () => m(0x161616, 0.92);

type Part = THREE.Mesh;
function put(g: THREE.Object3D, mesh: Part, x: number, y: number, z: number) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
const box = (g: THREE.Object3D, w: number, h: number, d: number, mt: THREE.Material, x: number, y: number, z: number) => put(g, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt), x, y, z);
const soft = (g: THREE.Object3D, w: number, h: number, d: number, r: number, mt: THREE.Material, x: number, y: number, z: number) => put(g, new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mt), x, y, z);
const cyl = (g: THREE.Object3D, rt: number, rb: number, h: number, mt: THREE.Material, x: number, y: number, z: number, seg = 16) => put(g, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mt), x, y, z);
const done = (g: THREE.Group) => {
  mergeStatic(g);
  return g;
};

/** A bumper plate standing on edge, its face to ±x: colour band, black hub, steel ring. */
export function plate(color: number, r = 0.225, t = 0.05): THREE.Group {
  const g = new THREE.Group();
  const face = cyl(g, r, r, t, m(color, 0.75), 0, 0, 0, 32);
  face.rotation.z = Math.PI / 2;
  const rim = cyl(g, r * 0.62, r * 0.62, t + 0.004, m(0x1a1a1a, 0.8), 0, 0, 0, 24);
  rim.rotation.z = Math.PI / 2;
  const hub = cyl(g, 0.03, 0.03, t + 0.012, CHROME(), 0, 0, 0, 12);
  hub.rotation.z = Math.PI / 2;
  return g;
}

/** An Olympic barbell along x: knurled grip, collars and sleeves. */
function barbell(g: THREE.Object3D, y: number, z: number, len = 2.2) {
  const shaft = cyl(g, 0.014, 0.014, len * 0.6, m(0xb9bcbe, 0.5, 0.85), 0, y, z, 10);
  shaft.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const collar = cyl(g, 0.03, 0.03, 0.04, CHROME(), s * len * 0.31, y, z, 12);
    collar.rotation.z = Math.PI / 2;
    const sleeve = cyl(g, 0.025, 0.025, len * 0.18, CHROME(), s * len * 0.41, y, z, 12);
    sleeve.rotation.z = Math.PI / 2;
  }
}

/**
 * A power rack (like the ATX one): four uprights with their hole rows, a base frame, pull-up bar,
 * J-hooks with the bar on them, safety arms, and plates on the storage pins; a flat bench inside.
 */
export function powerRack(opts: { plates?: boolean; bench?: boolean } = {}): THREE.Group {
  const g = new THREE.Group();
  const W = 1.22;
  const D = 1.15;
  const H = 2.15;
  const S = 0.07;
  const steel = STEEL_BLACK();
  const hole = m(0x050505, 0.9);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(g, S, H, S, steel, (sx * W) / 2, H / 2, (sz * D) / 2);
      // The row of holes up the front of each upright.
      for (let y = 0.35; y < H - 0.15; y += 0.05) box(g, 0.022, 0.022, 0.004, hole, (sx * W) / 2, y, (sz * D) / 2 + sz * (S / 2 + 0.001));
    }
    box(g, S, S, D + S, steel, (sx * W) / 2, S / 2, 0);
    box(g, S, S, D + S, steel, (sx * W) / 2, H - S / 2, 0);
    // J-hooks and safety arms on the front uprights.
    box(g, 0.08, 0.1, 0.12, steel, (sx * W) / 2, 1.3, D / 2 + 0.09);
    box(g, 0.03, 0.06, 0.03, m(0xe2e2e2, 0.6), (sx * W) / 2, 1.36, D / 2 + 0.14);
    box(g, 0.06, 0.06, 0.62, steel, (sx * W) / 2, 0.75, D / 2 - 0.05);
    // Plate storage pins at the back.
    const pin = cyl(g, 0.025, 0.025, 0.25, steel, (sx * (W / 2 + 0.13)), 0.32, -D / 2 + 0.1, 10);
    pin.rotation.z = Math.PI / 2;
  }
  for (const sz of [-1, 1]) box(g, W + S, S, S, steel, 0, H - S / 2, (sz * D) / 2);
  box(g, W + S, S, S, steel, 0, S / 2, -D / 2);
  const pull = cyl(g, 0.016, 0.016, W + 0.2, m(0xb9bcbe, 0.5, 0.85), 0, H - 0.02, D / 2 + 0.05, 10);
  pull.rotation.z = Math.PI / 2;
  // The brand plate on the top front.
  box(g, 0.32, 0.05, 0.005, m(0xf2f2f2, 0.5), 0, H - S / 2, D / 2 + S / 2 + 0.002);
  barbell(g, 1.42, D / 2 + 0.12);
  const done2 = done(g);
  if (opts.plates !== false) {
    const colours = [0x2f8a4e, 0xe0b52a, 0x2f6fc4];
    colours.forEach((c, i) => {
      for (const sx of [-1, 1]) {
        const p = plate(c, 0.225 - i * 0.0, 0.05);
        p.position.set(sx * (W / 2 + 0.07 + i * 0.055), 0.32, -D / 2 + 0.1);
        done2.add(p);
      }
    });
  }
  if (opts.bench !== false) {
    const bench = flatBench();
    bench.position.set(0, 0, 0.05);
    done2.add(bench);
  }
  return done2;
}

/** A flat bench: padded top with its seam, steel frame, a foot at each end. */
export function flatBench(): THREE.Group {
  const g = new THREE.Group();
  soft(g, 0.3, 0.07, 1.15, 0.025, m(0x1b1b1b, 0.7), 0, 0.44, 0);
  box(g, 0.302, 0.004, 1.152, m(0x333333, 0.6), 0, 0.435, 0);
  box(g, 0.08, 0.06, 1.0, STEEL_BLACK(), 0, 0.38, 0);
  for (const z of [-0.45, 0.45]) {
    box(g, 0.08, 0.34, 0.08, STEEL_BLACK(), 0, 0.2, z);
    box(g, 0.42, 0.05, 0.08, STEEL_BLACK(), 0, 0.025, z);
  }
  return done(g);
}

/**
 * A treatment table lengthwise along x (head at -x): three padded sections with seams and the face
 * hole, an electric column base with its feet and castors, the height bar round the foot.
 * `top` is the upholstery colour, `frame` the base colour.
 */
export function treatmentTable(top: number, frame = 0xd9dcde, opts: { towel?: boolean; roll?: boolean } = {}): THREE.Group {
  const g = new THREE.Group();
  const pad = m(top, 0.85);
  const seam = m(new THREE.Color(top).multiplyScalar(0.75).getHex(), 0.85);
  const H = 0.68;
  // Head, middle and leg sections, slightly apart.
  soft(g, 0.52, 0.11, 0.7, 0.04, pad, -0.72, H, 0);
  soft(g, 0.78, 0.11, 0.7, 0.04, pad, -0.06, H, 0);
  soft(g, 0.66, 0.11, 0.7, 0.04, pad, 0.69, H, 0);
  for (const x of [-0.46, 0.34]) box(g, 0.012, 0.115, 0.68, seam, x, H, 0);
  // The face hole in the head section.
  const holeM = m(0x111111, 0.9);
  const hole2 = cyl(g, 0.07, 0.07, 0.115, holeM, -0.82, H + 0.002, 0, 20);
  hole2.scale.z = 0.7;
  // Under the top: the steel plate, the lift column and the base with castors.
  const base = m(frame, 0.45, 0.35);
  box(g, 1.7, 0.05, 0.5, base, 0, H - 0.08, 0);
  box(g, 0.32, 0.42, 0.26, base, 0, 0.36, 0);
  box(g, 1.4, 0.07, 0.12, base, 0, 0.09, 0);
  for (const x of [-0.68, 0.68]) {
    box(g, 0.1, 0.07, 0.62, base, x, 0.09, 0);
    for (const z of [-0.28, 0.28]) {
      const wheel = cyl(g, 0.04, 0.04, 0.03, RUBBER(), x, 0.04, z, 12);
      wheel.rotation.x = Math.PI / 2;
    }
  }
  // The height bar round the foot end.
  const barM = m(0xbfc3c6, 0.35, 0.8);
  box(g, 0.025, 0.025, 0.62, barM, 0.92, 0.2, 0);
  for (const z of [-0.3, 0.3]) box(g, 0.32, 0.025, 0.025, barM, 0.77, 0.2, z);
  if (opts.roll !== false) {
    const roll = cyl(g, 0.085, 0.085, 0.62, pad, -0.35, H + 0.14, 0, 20);
    roll.rotation.x = Math.PI / 2;
  }
  if (opts.towel) soft(g, 0.5, 0.04, 0.6, 0.015, m(0xfafafa, 0.95), 0.62, H + 0.075, 0);
  return done(g);
}

/** A saddle stool: the saddle seat, the gas lift with its bellows, the five-arm base with castors. */
export function saddleStool(seat = 0x1b1b1b): THREE.Group {
  const g = new THREE.Group();
  const s = soft(g, 0.4, 0.09, 0.36, 0.04, m(seat, 0.7), 0, 0.64, 0);
  s.scale.set(1, 1, 1);
  soft(g, 0.16, 0.06, 0.34, 0.03, m(seat, 0.7), 0, 0.67, 0);
  cyl(g, 0.028, 0.028, 0.22, CHROME(), 0, 0.5, 0, 12);
  cyl(g, 0.04, 0.045, 0.2, m(0x111111, 0.8), 0, 0.3, 0, 12);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = box(g, 0.28, 0.035, 0.05, STEEL_BLACK(), Math.cos(a) * 0.14, 0.09, Math.sin(a) * 0.14);
    arm.rotation.y = -a;
    cyl(g, 0.03, 0.03, 0.03, RUBBER(), Math.cos(a) * 0.27, 0.03, Math.sin(a) * 0.27, 10).rotation.x = Math.PI / 2;
  }
  return done(g);
}

/** A kettlebell of `kg` (size grows with weight), cast black with a coloured band. */
export function kettlebell(kg: number, band = 0xd9a52c): THREE.Group {
  const g = new THREE.Group();
  const r = 0.08 + kg * 0.0022;
  const ball = put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m(0x1d1d1d, 0.55, 0.3)), 0, r, 0);
  ball.scale.y = 0.92;
  put(g, new THREE.Mesh(new THREE.TorusGeometry(r * 0.58, r * 0.14, 8, 24), m(0x1d1d1d, 0.55, 0.3)), 0, r * 1.8, 0);
  cyl(g, r * 0.99, r * 0.99, r * 0.18, m(band, 0.6), 0, r * 0.95, 0, 20);
  return done(g);
}

/**
 * A monstera in a pot: big heart-shaped leaves with their splits, each on a long stalk bending out
 * from the soil, in shades of deep green.
 */
export function monstera(height = 1.1, potColor = 0xb08a52, seed = 3): THREE.Group {
  const g = new THREE.Group();
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // The pot (a basket or ceramic), with soil.
  cyl(g, 0.17, 0.13, 0.3, m(potColor, 0.9), 0, 0.15, 0, 20);
  cyl(g, 0.155, 0.155, 0.02, m(0x3b2a1e, 1), 0, 0.29, 0, 18);
  // One leaf shape: a heart with deep splits from the edge towards the midrib.
  const leafShape = () => {
    const sh = new THREE.Shape();
    const L = 1;
    sh.moveTo(0, 0);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * Math.PI;
      // Heart outline, length L along +y, width ~0.85 L.
      const x = Math.sin(t) * 0.45 * L * (1 - 0.15 * Math.cos(t));
      const y = (1 - Math.cos(t)) * 0.5 * L;
      pts.push([x, y]);
    }
    // Right side with splits, then the left side mirrored.
    const side = (sign: number) => {
      const out: [number, number][] = [];
      pts.forEach(([x, y], i) => {
        const split = i > 3 && i < 21 && i % 4 === 2;
        out.push([sign * x, y]);
        if (split) out.push([sign * x * 0.35, y + 0.02], [sign * x * 0.9, y + 0.06]);
      });
      return out;
    };
    const right = side(1);
    const left = side(-1).reverse();
    for (const [x, y] of right) sh.lineTo(x, y);
    for (const [x, y] of left) sh.lineTo(x, y);
    sh.lineTo(0, 0);
    return sh;
  };
  const geo = new THREE.ShapeGeometry(leafShape(), 2);
  geo.translate(0, -0.02, 0);
  const greens = [0x2f7a3c, 0x3a8a45, 0x2a6e36, 0x358240];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
    const tilt = 0.45 + rnd() * 0.5;
    const len = height * (0.55 + rnd() * 0.45);
    const leafSize = height * (0.32 + rnd() * 0.18);
    // The stalk: from the soil, out and up.
    const stalk = new THREE.Group();
    stalk.position.set(0, 0.3, 0);
    stalk.rotation.set(0, a, 0);
    const lean = new THREE.Group();
    lean.rotation.x = tilt;
    stalk.add(lean);
    const st = put(lean, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, len, 6), m(0x3f7a33, 0.8)), 0, len / 2, 0);
    st.castShadow = false;
    const leaf = new THREE.Mesh(geo, m(greens[i % greens.length], 0.55, 0, { side: THREE.DoubleSide }));
    leaf.castShadow = true;
    leaf.scale.setScalar(leafSize);
    leaf.position.set(0, len, 0);
    // The leaf hangs out from the stalk's tip, tipped down a little, turned a little.
    leaf.rotation.set(-Math.PI / 2 + 0.5 + rnd() * 0.4, rnd() * 0.6 - 0.3, 0);
    lean.add(leaf);
    g.add(stalk);
  }
  return done(g);
}

/** A tall banana-leaf plant (strelitzia) in a woven basket, as in the strength room. */
export function bananaPlant(height = 1.5, seed = 5): THREE.Group {
  const g = new THREE.Group();
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  cyl(g, 0.2, 0.16, 0.32, m(0xb98f55, 0.95), 0, 0.16, 0, 20);
  for (let y = 0.04; y < 0.32; y += 0.05) cyl(g, 0.203 - y * 0.12, 0.203 - y * 0.12, 0.012, m(0x9a7444, 0.95), 0, y, 0, 20);
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(0.17, 0.5, 0, 1);
  leaf.quadraticCurveTo(-0.17, 0.5, 0, 0);
  const geo = new THREE.ShapeGeometry(leaf, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rnd();
    const stem = height * (0.45 + rnd() * 0.35);
    const holder = new THREE.Group();
    holder.position.y = 0.32;
    holder.rotation.y = a;
    const lean = new THREE.Group();
    lean.rotation.x = 0.12 + rnd() * 0.25;
    holder.add(lean);
    put(lean, new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.014, stem, 6), m(0x4c7a3a, 0.8)), 0, stem / 2, 0);
    const l = new THREE.Mesh(geo, m([0x2c6b37, 0x37803f, 0x24592d][i % 3], 0.6, 0, { side: THREE.DoubleSide }));
    l.scale.set(height * 0.55, height * 0.55, 1);
    l.position.y = stem;
    l.rotation.set(0.25 + rnd() * 0.3, 0, rnd() * 0.3 - 0.15);
    l.castShadow = true;
    lean.add(l);
    g.add(holder);
  }
  return done(g);
}
