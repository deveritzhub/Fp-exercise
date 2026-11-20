import * as THREE from 'three';
import type { Breed, Coat } from '@shared/pets';
import type { PetModel } from './pets3d';

/**
 * The sighthounds (whippet, greyhound, Italian greyhound) at their best: one smooth body lofted along
 * the spine after the real outline of the breed (the deep keel of the chest, the high tuck-up under a
 * waist you can almost close a hand round, the arch over the loin and the sloping croup), a long
 * arched neck, a long narrow head with the folded rose ears, and fine legs with every joint where it
 * belongs: shoulder, elbow, pastern and hare foot in front; thigh, stifle, the long second thigh, the
 * hock let down low and the foot behind. The long low-set tail ends in a slight upward sweep.
 *
 * Measures are in shares of the height at the withers (H); the dog faces +z, paws on the ground.
 */

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** A small seeded random, so a coat looks the same every visit. */
function seeded(text: string) {
  let a = 0;
  for (let i = 0; i < text.length; i++) a = (Math.imul(a ^ text.charCodeAt(i), 2654435761) + i) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The coat on the body, as a canvas wrapped round it: left to right is front to back, the top row the
 * spine and the bottom row the belly. Short, fine hair: a soft sheen, fine brindle streaks, patches,
 * and the white of the chest under the front.
 */
function bodyCoat(coat: Coat, seed: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const rnd = seeded(seed);
  g.fillStyle = hex(coat.base);
  g.fillRect(0, 0, 512, 256);
  // Darker along the back, lighter towards the belly: how short hair catches the light.
  const shade = g.createLinearGradient(0, 0, 0, 256);
  shade.addColorStop(0, 'rgba(0,0,0,0.16)');
  shade.addColorStop(0.45, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(255,255,255,0.10)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 512, 256);
  const mark = hex(coat.mark ?? 0x2a2420);
  if (coat.pattern === 'brindle') {
    g.strokeStyle = mark;
    for (let i = 0; i < 260; i++) {
      const x = rnd() * 512;
      g.globalAlpha = 0.35 + rnd() * 0.4;
      g.lineWidth = 0.8 + rnd() * 2.4;
      g.beginPath();
      g.moveTo(x, rnd() * 30);
      g.bezierCurveTo(x + rnd() * 14 - 7, 80, x + rnd() * 16 - 8, 160, x + rnd() * 12 - 6, 200 + rnd() * 56);
      g.stroke();
    }
    g.globalAlpha = 1;
  } else if (coat.pattern === 'patches') {
    g.fillStyle = mark;
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      g.beginPath();
      const x = 60 + rnd() * 420;
      const y = 10 + rnd() * 120;
      for (let k = 0; k <= 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const r = 34 + rnd() * 22;
        g.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    }
  }
  if (coat.chest) {
    // The white of the chest: up the front and under the brisket, fading into the coat.
    const bib = g.createRadialGradient(10, 236, 4, 10, 236, 90);
    bib.addColorStop(0, hex(coat.second));
    bib.addColorStop(0.65, hex(coat.second));
    bib.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = bib;
    g.fillRect(0, 120, 120, 136);
  }
  // The finest hair: tiny streaks along the body.
  g.globalAlpha = 0.05;
  g.strokeStyle = '#000';
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * 512;
    const y = rnd() * 256;
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 3 + rnd() * 4, y + rnd() * 2 - 1);
    g.stroke();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A section of a lofted shape: centre, half-width, and half-height above and below the centre. */
type Section = { z: number; y: number; w: number; up: number; down: number; keel?: number };

/**
 * A smooth tube through sections along z (front first), closed at both ends. The lower half narrows
 * by `keel` towards the bottom, for the keel of a deep chest. UVs: u along the length, v from the
 * belly (0) to the spine (1).
 */
function loft(sections: Section[], radial = 28, samples = 64): THREE.BufferGeometry {
  // A smooth path through the sections (Catmull-Rom on every measure).
  const at = (t: number) => {
    const f = t * (sections.length - 1);
    const i = Math.min(sections.length - 2, Math.floor(f));
    const u = f - i;
    const p0 = sections[Math.max(0, i - 1)];
    const p1 = sections[i];
    const p2 = sections[i + 1];
    const p3 = sections[Math.min(sections.length - 1, i + 2)];
    const cr = (k: keyof Section) => {
      const a = (p0[k] ?? 0) as number;
      const b = (p1[k] ?? 0) as number;
      const c = (p2[k] ?? 0) as number;
      const d = (p3[k] ?? 0) as number;
      return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    };
    return { z: cr('z'), y: cr('y'), w: Math.max(0.001, cr('w')), up: Math.max(0.001, cr('up')), down: Math.max(0.001, cr('down')), keel: cr('keel') };
  };
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const s = at(t);
    // Round off both ends so the shape closes smoothly.
    const end = Math.min(1, Math.sin(Math.min(1, Math.min(t, 1 - t) * 10) * Math.PI / 2) * 1.0 + 0.0);
    const k = 0.25 + 0.75 * end;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const sn = Math.sin(a);
      const cs = Math.cos(a);
      const keel = sn < 0 ? 1 - (s.keel ?? 0) * -sn : 1;
      pos.push(cs * s.w * keel * k, s.y + (sn > 0 ? s.up : s.down) * sn * k, s.z);
      uv.push(t, (1 + sn) / 2);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // Caps: the first and last rings closed on their centres.
  for (const [ring, flip] of [[0, true], [samples, false]] as const) {
    const s = at(ring / samples);
    const c = pos.length / 3;
    pos.push(0, s.y, s.z);
    uv.push(ring / samples, 0.5);
    for (let j = 0; j < radial; j++) {
      const a = ring * row + j;
      if (flip) idx.push(c, a + 1, a);
      else idx.push(c, a, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** A tapered limb segment from `a` to `b` (local to its joint), a capsule that thins to `r1`. */
function limb(len: number, r0: number, r1: number, m: THREE.Material, geos: THREE.BufferGeometry[]) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 14, 1);
  geos.push(g);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = -len / 2;
  mesh.castShadow = true;
  const cap = new THREE.SphereGeometry(r0, 14, 10);
  geos.push(cap);
  const joint = new THREE.Mesh(cap, m);
  joint.castShadow = true;
  const holder = new THREE.Group();
  holder.add(mesh, joint);
  return holder;
}

export function sighthoundModel(b: Breed, coat: Coat, coatIndex: number, accent: number, wear: string | null): PetModel {
  const H = b.h;
  const L = H * b.len;
  // A whippet is a little more muscled than a greyhound; the Italian greyhound the finest of all.
  const w = (b.wide ?? 0.7) / 0.7;
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const mat = (p: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.62, ...p });
    mats.push(m);
    return m;
  };
  const tex = bodyCoat(coat, `${b.key}:${coatIndex}`);
  const coatM = mat({ map: tex, roughness: 0.55 });
  const plainM = mat({ color: coat.pattern === 'patches' ? coat.base : coat.base, roughness: 0.55 });
  const markM = coat.pattern === 'patches' ? mat({ color: coat.mark ?? coat.base, roughness: 0.55 }) : plainM;
  const whiteM = mat({ color: coat.second, roughness: 0.6 });
  const sockM = coat.socks || coat.pattern === 'patches' ? whiteM : plainM;
  const noseM = mat({ color: 0x141210, roughness: 0.3 });
  const eyeM = mat({ color: 0x1a120c, roughness: 0.12, metalness: 0.1 });
  const nailM = mat({ color: 0x2a2622, roughness: 0.4 });
  const sphere = (rx: number, ry: number, rz: number, m: THREE.Material, seg = 18) => {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
    geos.push(g);
    const e = new THREE.Mesh(g, m);
    e.scale.set(rx, ry, rz);
    e.castShadow = true;
    return e;
  };

  const group = new THREE.Group();
  group.userData.noMerge = true;
  const zHip = -L * 0.34;
  const hipY = H * 0.78;
  const pivot = new THREE.Group();
  pivot.position.set(0, hipY, zHip);
  group.add(pivot);
  const body = new THREE.Group();
  body.position.set(0, -hipY, -zHip);
  pivot.add(body);

  // The body, front to back: point of the chest, the deep brisket, the ribs, the tuck-up under the
  // waist, the arched loin, the hips and the croup that slopes to the buttock.
  const S = (z: number, top: number, bottom: number, half: number, keel = 0): Section => ({ z: z * L, y: ((top + bottom) / 2) * H, w: half * H * w, up: ((top - bottom) / 2) * H, down: ((top - bottom) / 2) * H, keel });
  const torso = new THREE.Mesh(loft([
    S(0.56, 0.9, 0.74, 0.05),
    S(0.5, 0.97, 0.62, 0.105, 0.3),
    S(0.4, 1.0, 0.53, 0.13, 0.45),
    S(0.27, 0.995, 0.5, 0.135, 0.5),
    S(0.13, 0.99, 0.52, 0.13, 0.45),
    S(0.02, 0.995, 0.6, 0.115, 0.3),
    S(-0.08, 1.01, 0.74, 0.088, 0.1),
    S(-0.17, 1.03, 0.79, 0.08),
    S(-0.27, 1.01, 0.72, 0.1),
    S(-0.37, 0.96, 0.66, 0.112),
    S(-0.46, 0.91, 0.68, 0.1),
    S(-0.52, 0.86, 0.72, 0.06),
  ]), coatM);
  torso.castShadow = true;
  body.add(torso);

  // The neck: long and arched, from the withers up to the head. Lofted along its own axis, then
  // raised: it leaves the shoulders at about fifty degrees.
  const NECK_UP = 0.85;
  const neckRoot = new THREE.Group();
  neckRoot.position.set(0, 0.9 * H, 0.46 * L);
  neckRoot.rotation.x = -NECK_UP;
  body.add(neckRoot);
  const N = H * b.neck * 1.1;
  const neck = new THREE.Mesh(loft([
    { z: -0.08 * H, y: -0.01 * H, w: 0.1 * H * w, up: 0.11 * H, down: 0.12 * H },
    { z: N * 0.3, y: 0.014 * H, w: 0.078 * H * w, up: 0.08 * H, down: 0.085 * H },
    { z: N * 0.62, y: 0.02 * H, w: 0.068 * H * w, up: 0.07 * H, down: 0.07 * H },
    { z: N * 0.98, y: 0.006 * H, w: 0.064 * H * w, up: 0.066 * H, down: 0.064 * H },
  ], 22, 24), coatM);
  neck.castShadow = true;
  neckRoot.add(neck);
  const neckLen = N;
  const headAt = new THREE.Vector3(0, 0.01 * H, N * 0.95);

  // The head: a long narrow wedge, the muzzle as long as the skull, the nose, almond eyes and the
  // small rose ears folded back along the neck.
  const head = new THREE.Group();
  head.position.copy(headAt);
  neckRoot.add(head);
  const hl = H * 0.36;
  const skull = new THREE.Mesh(loft([
    { z: -hl * 0.12, y: 0.0, w: 0.05 * H, up: 0.055 * H, down: 0.05 * H },
    { z: hl * 0.08, y: 0.012 * H, w: 0.068 * H, up: 0.07 * H, down: 0.062 * H },
    { z: hl * 0.3, y: 0.004 * H, w: 0.06 * H, up: 0.06 * H, down: 0.058 * H },
    { z: hl * 0.48, y: -0.012 * H, w: 0.042 * H, up: 0.044 * H, down: 0.05 * H },
    { z: hl * 0.68, y: -0.02 * H, w: 0.034 * H, up: 0.036 * H, down: 0.04 * H },
    { z: hl * 0.86, y: -0.026 * H, w: 0.026 * H, up: 0.028 * H, down: 0.03 * H },
  ], 20, 28), coat.pattern === 'patches' ? markM : coatM);
  skull.castShadow = true;
  // The head is carried a little down from level.
  head.rotation.x = NECK_UP + 0.22;
  head.add(skull);
  const nose = sphere(0.026 * H, 0.022 * H, 0.018 * H, noseM, 14);
  nose.position.set(0, -0.01 * H, hl * 0.87);
  head.add(nose);
  for (const s of [-1, 1]) {
    const eye = sphere(0.017 * H, 0.012 * H, 0.008 * H, eyeM, 14);
    eye.position.set(s * 0.052 * H, 0.026 * H, hl * 0.32);
    eye.rotation.y = s * 0.55;
    head.add(eye);
    // Rose ear: a small thin fold lying back, its tip curling over.
    const ear = new THREE.Group();
    ear.position.set(s * 0.05 * H, 0.062 * H, -hl * 0.04);
    ear.rotation.set(-0.35, s * 0.35, s * 0.6);
    const flap = sphere(0.014 * H, 0.036 * H, 0.065 * H, coat.pattern === 'patches' ? markM : plainM, 14);
    flap.position.z = -0.045 * H;
    const fold = sphere(0.01 * H, 0.02 * H, 0.03 * H, coat.pattern === 'patches' ? markM : plainM, 12);
    fold.position.set(s * 0.008 * H, -0.012 * H, -0.085 * H);
    fold.rotation.x = 0.8;
    ear.add(flap, fold);
    head.add(ear);
  }

  // The collar (a wide hound collar) with its tag, in the salon's colour.
  const accentM = mat({ color: accent, roughness: 0.5 });
  const goldM = mat({ color: 0xe8c25a, roughness: 0.3, metalness: 0.8 });
  const collarGeo = new THREE.CylinderGeometry(0.068 * H * w, 0.07 * H * w, 0.05 * H, 24, 1, true);
  geos.push(collarGeo);
  const collar = new THREE.Mesh(collarGeo, accentM);
  (accentM as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  collar.position.set(0, 0.012 * H, neckLen * 0.72);
  collar.rotation.x = Math.PI / 2;
  collar.castShadow = true;
  neckRoot.add(collar);
  const tag = sphere(0.016 * H, 0.016 * H, 0.004 * H, goldM, 12);
  tag.position.set(0, -0.08 * H, neckLen * 0.72);
  tag.rotation.x = Math.PI / 2;
  neckRoot.add(tag);
  if (wear === 'bandana') {
    const g = new THREE.ConeGeometry(0.08 * H, 0.16 * H, 3);
    geos.push(g);
    const scarf = new THREE.Mesh(g, accentM);
    scarf.scale.z = 0.3;
    scarf.rotation.x = Math.PI + NECK_UP;
    scarf.position.set(0, -0.09 * H, neckLen * 0.66);
    neckRoot.add(scarf);
  } else if (wear === 'bow') {
    for (const sd of [-1, 1]) {
      const g = new THREE.ConeGeometry(0.03 * H, 0.06 * H, 8);
      geos.push(g);
      const wing = new THREE.Mesh(g, accentM);
      wing.rotation.z = sd * Math.PI / 2;
      wing.position.set(sd * 0.03 * H, -0.075 * H, neckLen * 0.74);
      neckRoot.add(wing);
    }
  } else if (wear === 'harness' || wear === 'coat' || wear === 'sweater') {
    // A coat or sweater fits the body like a second skin over the back (a sweater round the belly too);
    // a harness is two bands and a strap.
    const shell = (scale: number, from: number, to: number, under: boolean) => new THREE.Mesh(loft([
      S(from, 1.0 + 0.02 * scale, under ? 0.33 : 0.62, 0.15 * scale),
      S((from + to) / 2, 1.02 + 0.02 * scale, under ? 0.5 : 0.72, 0.13 * scale),
      S(to, 1.03 + 0.02 * scale, under ? 0.66 : 0.8, 0.105 * scale),
    ], 24, 16), wear === 'sweater' ? mat({ color: accent, roughness: 1 }) : accentM);
    if (wear === 'harness') {
      for (const z of [0.36, 0.12]) {
        const band = shell(1.06, z + 0.03, z - 0.03, true);
        body.add(band);
      }
    } else {
      const cover = shell(1.07, 0.42, -0.24, wear === 'sweater');
      cover.castShadow = true;
      body.add(cover);
    }
  }

  // Legs. Front: shoulder, elbow, pastern, foot. Hind: hip, stifle, hock, foot. Each joint a group.
  type Leg = { root: THREE.Group; knee: THREE.Group; ankle: THREE.Group; front: boolean; side: number };
  const legs: Leg[] = [];
  const legW = (b.legT / 0.07) * H;
  const foot = (parent: THREE.Object3D, m: THREE.Material) => {
    // A hare foot: long and narrow, two middle toes ahead, the nails just showing.
    const pad = sphere(0.022 * legW, 0.016 * legW, 0.042 * legW, m, 14);
    pad.position.set(0, 0.014 * H, 0.03 * H);
    parent.add(pad);
    for (const s of [-1, 1]) {
      const nail = sphere(0.004 * H, 0.004 * H, 0.008 * H, nailM, 8);
      nail.position.set(s * 0.006 * H, 0.006 * H, 0.068 * H);
      parent.add(nail);
    }
  };
  /** A joint chain: segment `len` at angle `ang` (positive leans the far end back), returning the next joint. */
  const segment = (parent: THREE.Object3D, len: number, r0: number, r1: number, ang: number, m: THREE.Material) => {
    const seg = limb(len, r0, r1, m, geos);
    seg.rotation.x = ang;
    parent.add(seg);
    const next = new THREE.Group();
    next.position.set(0, -len * Math.cos(ang), -len * Math.sin(ang));
    parent.add(next);
    return next;
  };
  const makeFront = (side: number) => {
    // Point of the shoulder; the upper arm runs down and back to the elbow by the brisket.
    const root = new THREE.Group();
    root.position.set(side * 0.072 * H * w, 0.78 * H, 0.47 * L);
    body.add(root);
    // The shoulder muscle over the top of the arm.
    const shoulder = sphere(0.036 * H * w, 0.13 * H, 0.072 * H, coatM, 20);
    shoulder.position.set(0, -0.06 * H, -0.03 * H);
    shoulder.rotation.x = 0.35;
    root.add(shoulder);
    const knee = segment(root, 0.29 * H, 0.05 * legW, 0.036 * legW, 0.42, coatM);
    // The forearm: straight down, slim.
    const ankle = segment(knee, 0.37 * H, 0.031 * legW, 0.021 * legW, 0, coat.socks ? sockM : plainM);
    // The pastern: springy, a little forward.
    const toe = segment(ankle, 0.1 * H, 0.02 * legW, 0.018 * legW, -0.22, sockM);
    foot(toe, sockM);
    legs.push({ root, knee, ankle, front: true, side });
  };
  const makeHind = (side: number) => {
    // Hip joint; the thigh runs forward and down to the stifle, the long second thigh back to the
    // hock, and the hock stands near upright on the foot.
    const root = new THREE.Group();
    root.position.set(side * 0.068 * H * w, 0.82 * H, -0.36 * L);
    body.add(root);
    // The broad thigh muscle of a sprinter.
    const muscle = sphere(0.046 * H * w, 0.17 * H, 0.115 * H, coatM, 20);
    muscle.position.set(0, -0.12 * H, 0.0);
    muscle.rotation.x = -0.3;
    root.add(muscle);
    const knee = segment(root, 0.32 * H, 0.06 * legW, 0.042 * legW, -0.36, coatM);
    const gaskin = sphere(0.03 * H * w, 0.1 * H, 0.045 * H, coatM, 16);
    gaskin.position.set(0, -0.08 * H, -0.05 * H);
    gaskin.rotation.x = 0.77;
    knee.add(gaskin);
    const ankle = segment(knee, 0.45 * H, 0.04 * legW, 0.022 * legW, 0.77, coatM);
    const hockLen = Math.max(0.05 * H, root.position.y + knee.position.y + ankle.position.y - 0.03 * H);
    const toe = segment(ankle, hockLen, 0.022 * legW, 0.018 * legW, -0.06, sockM);
    foot(toe, sockM);
    legs.push({ root, knee, ankle, front: false, side });
  };
  makeFront(1);
  makeFront(-1);
  makeHind(1);
  makeHind(-1);

  // The tail: long, thin and low-set, down between the hocks and sweeping up a little at the end.
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 0.8 * H, -0.52 * L);
  body.add(tailRoot);
  const tailSegs: THREE.Group[] = [];
  let parent: THREE.Object3D = tailRoot;
  const n = 6;
  const seg = (H * 0.62) / n;
  for (let i = 0; i < n; i++) {
    const s = new THREE.Group();
    if (i > 0) s.position.y = -seg;
    const r0 = H * (0.024 - i * 0.0033);
    s.add(limb(seg, r0, Math.max(0.004 * H, r0 - 0.0033 * H), i === n - 1 && (coat.socks || coat.pattern === 'patches') ? whiteM : coat.pattern === 'patches' ? markM : plainM, geos));
    parent.add(s);
    tailSegs.push(s);
    parent = s;
  }

  // Motion: walk, trot, and the double-suspension gallop that sighthounds are made for.
  let phase = Math.random() * 6;
  let sitT = 0;
  let wag = 0;
  let t = 0;
  let gait = 0;
  const lerp = (a: number, b2: number, k: number) => a + (b2 - a) * k;
  const sitAngle = 0.62;
  const update = (dt: number, speed: number, sit: boolean) => {
    t += dt;
    const moving = speed > 0.15;
    sitT = lerp(sitT, sit && !moving ? 1 : 0, Math.min(1, dt * 4));
    gait = lerp(gait, speed > 4 ? 2 : speed > 1.6 ? 1 : 0, Math.min(1, dt * 3));
    const stride = H * (0.75 + gait * 0.55);
    if (moving) phase += (speed / stride) * dt * 1.5;
    const amp = moving ? Math.min(1, speed / 1.2) * (0.42 + gait * 0.22) : 0;
    for (const l of legs) {
      const off = gait > 1.5 ? (l.front ? 0 : Math.PI) + (l.side > 0 ? 0.3 : 0) : l.front === l.side > 0 ? 0 : Math.PI;
      const s = Math.sin(phase + off);
      // The foot comes up as the leg swings forward.
      const lift = Math.max(0, Math.sin(phase + off + 1.3)) * amp;
      if (l.front) {
        l.root.rotation.x = lerp(s * amp * 0.9, sitAngle, sitT);
        l.knee.rotation.x = lerp(-lift * 1.1, 0, sitT);
        l.ankle.rotation.x = lerp(lift * 0.9, 0, sitT);
      } else {
        l.root.rotation.x = lerp(s * amp * 0.85, -1.15 + sitAngle, sitT);
        l.knee.rotation.x = lerp(lift * 0.9, 1.15, sitT);
        l.ankle.rotation.x = lerp(-lift * 0.8, -1.35, sitT);
      }
    }
    // In the gallop the back flexes and stretches with every stride.
    pivot.rotation.x = -sitAngle * sitT + (gait > 1.5 ? Math.sin(phase * 2) * 0.07 : 0);
    pivot.position.y = lerp(hipY, H * 0.36, sitT) + (moving ? Math.abs(Math.sin(phase)) * H * 0.02 * (1 - sitT) : 0);
    neckRoot.rotation.x = -NECK_UP + lerp(moving ? 0.25 + gait * 0.12 : 0, -0.25, sitT);
    head.rotation.x = NECK_UP + 0.22 + sitAngle * sitT * 0.5 + (moving ? 0 : Math.sin(t * 0.7) * 0.05);
    head.rotation.y = moving ? 0 : Math.sin(t * 0.45) * 0.3;
    // The tail: low and wagging when glad, carried low in the run, tucked when sitting.
    wag = lerp(wag, moving ? 0.25 : 0.55, Math.min(1, dt * 2));
    tailRoot.rotation.x = lerp(moving ? 0.55 + gait * 0.25 : 0.32, -0.2, sitT);
    tailRoot.rotation.z = Math.sin(t * 9) * wag * (1 - sitT);
    tailSegs.forEach((s2, i) => {
      if (i === 0) return;
      s2.rotation.x = (i >= n - 2 ? 0.32 : 0.06) * (1 - sitT * 0.6);
    });
  };
  update(0, 0, false);

  return {
    group,
    height: H,
    update,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      tex.dispose();
    },
  };
}
