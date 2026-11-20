import * as THREE from 'three';
import { petByKey, petCoat, petColor, petWearByKey, type Breed, type Coat } from '@shared/pets';
import { sighthoundModel } from './sighthound3d';

/**
 * A pet built from simple low-poly shapes, after the breed's proportions (shared/pets): the deep chest
 * and tucked waist of a sighthound, the long back of a dachshund, the fluffy coat of a Siberian cat.
 * It faces +z with its paws on the ground. `update` moves the legs (walk, trot or gallop with the
 * speed), wags the tail, and lets it sit down when it has stood still for a while.
 */
export type PetModel = {
  group: THREE.Group;
  /** Height at the shoulder, in metres. */
  height: number;
  update: (dt: number, speed: number, sit: boolean) => void;
  dispose: () => void;
};

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

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/**
 * The coat painted on a small canvas, wrapped round the body (top row along the spine, bottom row the
 * belly): stripes for a tabby, fine streaks for a brindle, spots, big patches or a dark saddle.
 */
function coatTexture(coat: Coat, seed: string): THREE.Texture | null {
  if (coat.pattern === 'none' || coat.pattern === 'points') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  const rnd = seeded(seed);
  const mark = hex(coat.mark ?? 0x2a2420);
  g.fillStyle = hex(coat.base);
  g.fillRect(0, 0, 256, 128);
  if (coat.pattern === 'tabby') {
    g.fillStyle = mark;
    for (let x = 4; x < 256; x += 14 + rnd() * 6) {
      g.beginPath();
      const w = 3.5 + rnd() * 3;
      const end = 70 + rnd() * 30;
      g.moveTo(x, 0);
      for (let y = 0; y <= end; y += 8) g.lineTo(x + Math.sin(y * 0.09 + x) * 4, y);
      for (let y = end; y >= 0; y -= 8) g.lineTo(x + w * (1 - y / end / 1.6) + Math.sin(y * 0.09 + x) * 4, y);
      g.closePath();
      g.fill();
    }
    // A darker line along the spine.
    g.fillRect(0, 0, 256, 7);
  } else if (coat.pattern === 'brindle') {
    g.strokeStyle = mark;
    g.globalAlpha = 0.65;
    for (let i = 0; i < 110; i++) {
      const x = rnd() * 256;
      g.lineWidth = 1 + rnd() * 2.2;
      g.beginPath();
      g.moveTo(x, rnd() * 20);
      g.bezierCurveTo(x + rnd() * 8 - 4, 40, x + rnd() * 10 - 5, 80, x + rnd() * 8 - 4, 100 + rnd() * 28);
      g.stroke();
    }
    g.globalAlpha = 1;
  } else if (coat.pattern === 'spots') {
    g.fillStyle = mark;
    for (let i = 0; i < 80; i++) {
      const r = 2.5 + rnd() * 4.5;
      g.beginPath();
      g.ellipse(rnd() * 256, 6 + rnd() * 110, r * 1.3, r, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  } else if (coat.pattern === 'patches') {
    g.fillStyle = mark;
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      g.beginPath();
      g.ellipse(rnd() * 256, 10 + rnd() * 60, 18 + rnd() * 26, 14 + rnd() * 20, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  } else if (coat.pattern === 'saddle') {
    g.fillStyle = mark;
    g.beginPath();
    g.moveTo(0, 0);
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, 48 + Math.sin(x * 0.05) * 6 + rnd() * 6);
    g.lineTo(256, 0);
    g.closePath();
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

type Leg = { root: THREE.Group; knee: THREE.Group; paw: THREE.Object3D; front: boolean; side: number; bend: number };

/** `color` and `wear` come from the grooming salon: the collar's colour and what the pet wears. */
export function petModel(key: string, coatIndex: number, look: { color?: string | null; wear?: string | null } = {}): PetModel | null {
  const b = petByKey(key);
  if (!b) return null;
  // The sighthounds have a model of their own, finer than the rest.
  if (b.ear === 'rose' && b.tail === 'thin') return sighthoundModel(b, petCoat(b, coatIndex), coatIndex, petColor(look.color).hex, petWearByKey(look.wear)?.key ?? null);
  return build(b, petCoat(b, coatIndex), coatIndex, petColor(look.color).hex, petWearByKey(look.wear)?.key ?? null);
}

function build(b: Breed, coat: Coat, coatIndex: number, accent: number, wear: string | null): PetModel {
  const cat = b.kind === 'cat';
  const H = b.h;
  const L = H * b.len;
  const legL = H * b.leg;
  const bodyD = H - legL;
  const deep = b.deep ?? 1;
  const fluff = b.fluff ?? 1;
  const wide = (b.wide ?? 0.9) * Math.sqrt(fluff);
  const sk = H * b.skull * 0.68;

  // Materials: the painted coat on the body and head, plain colours for the rest.
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const mat = (color: number, map: THREE.Texture | null = null, rough = 0.88) => {
    const m = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, map, roughness: rough, flatShading: true });
    mats.push(m);
    return m;
  };
  const tex = coatTexture(coat, `${b.key}:${coatIndex}`);
  const coatM = mat(coat.base, tex);
  const baseM = mat(coat.base);
  const secondM = mat(coat.second);
  const markM = mat(coat.mark ?? coat.base);
  const darkM = mat(0x171513, null, 0.4);
  const eyeM = cat ? mat(0x8aa83a, null, 0.3) : darkM;
  const points = coat.pattern === 'points';
  const legM = points ? markM : baseM;
  const sockM = coat.socks ? secondM : legM;
  const earM = points || coat.pattern === 'saddle' || coat.pattern === 'patches' ? markM : baseM;
  const muzzleM = points ? markM : coat.pattern === 'saddle' ? secondM : baseM;
  const tailM = points || coat.pattern === 'saddle' ? markM : baseM;

  const sphere = new THREE.SphereGeometry(1, 12, 9);
  geos.push(sphere);
  const ell = (rx: number, ry: number, rz: number, m: THREE.Material) => {
    const e = new THREE.Mesh(sphere, m);
    e.scale.set(rx, ry, rz);
    e.castShadow = true;
    return e;
  };
  const cyl = (rTop: number, rBottom: number, len: number, m: THREE.Material, seg = 7) => {
    const g = new THREE.CylinderGeometry(rTop, rBottom, len, seg);
    geos.push(g);
    const c = new THREE.Mesh(g, m);
    c.castShadow = true;
    return c;
  };
  const cone = (r: number, h: number, m: THREE.Material, seg = 4) => {
    const g = new THREE.ConeGeometry(r, h, seg);
    geos.push(g);
    const c = new THREE.Mesh(g, m);
    c.castShadow = true;
    return c;
  };

  const group = new THREE.Group();
  group.userData.noMerge = true;
  // The body turns about the hips when sitting.
  const zHip = -L * 0.36;
  const hipY = legL * 0.98;
  const pivot = new THREE.Group();
  pivot.position.set(0, hipY, zHip);
  group.add(pivot);
  const body = new THREE.Group();
  body.position.set(0, -hipY, -zHip);
  pivot.add(body);

  // Chest, waist and croup: three overlapping ovals.
  const chestRy = bodyD * 0.5 * deep * Math.min(fluff, 1.15);
  const chestRx = chestRy * wide * (deep > 1 ? 0.85 : 0.95);
  const chest = ell(chestRx, chestRy, L * 0.32, coatM);
  chest.position.set(0, H - chestRy * 0.92, L * 0.16);
  const loinRy = bodyD * 0.5 * (deep > 1 ? 0.6 : 0.94) * Math.sqrt(fluff);
  const loin = ell(loinRy * wide * 0.95, loinRy, L * 0.36, coatM);
  loin.position.set(0, H - loinRy * 0.9 + (deep > 1 ? H * 0.025 : 0), -L * 0.12);
  const hipR = bodyD * 0.5 * (deep > 1 ? 0.78 : 0.92) * Math.sqrt(fluff);
  const croup = ell(hipR * wide, hipR, L * 0.23, coatM);
  croup.position.set(0, H - hipR * 0.95, zHip);
  body.add(chest, loin, croup);
  if (coat.chest) {
    const bib = ell(chestRx * 0.7, chestRy * 0.75, L * 0.12, secondM);
    bib.position.set(0, H - chestRy * 1.05, L * 0.16 + L * 0.22);
    body.add(bib);
  }

  // Legs: straight in front; at the back the thigh goes forward and the shin back, the hock between.
  const legR = (H * b.legT) / 2;
  const legs: Leg[] = [];
  const makeLeg = (front: boolean, side: number) => {
    const bend = front ? 0 : 0.35;
    const y = front ? legL + bodyD * 0.12 : hipY;
    const seg = y / Math.cos(bend) / 2;
    const root = new THREE.Group();
    root.position.set(side * (front ? chestRx * 0.55 : hipR * wide * 0.6), y, front ? L * 0.3 : zHip);
    if (!front) {
      // The big muscle of the thigh.
      const thigh = ell(hipR * wide * 0.42, Math.min(seg * 0.42, hipR * 0.9), hipR * 0.72, coatM);
      thigh.position.set(0, -seg * 0.08, -hipR * 0.05);
      root.add(thigh);
    }
    const upper = cyl(legR * 1.35 * Math.sqrt(fluff), legR, seg, legM);
    upper.position.y = -seg / 2;
    const knee = new THREE.Group();
    knee.position.y = -seg;
    const lower = cyl(legR, legR * 0.85, seg, sockM);
    lower.position.y = -seg / 2;
    const paw = ell(legR * 1.3, legR * 0.8, legR * 1.8, sockM);
    paw.position.set(0, -seg + legR * 0.8, legR * 0.6);
    knee.add(lower, paw);
    root.add(upper, knee);
    body.add(root);
    legs.push({ root, knee, paw, front, side, bend });
  };
  makeLeg(true, 1);
  makeLeg(true, -1);
  makeLeg(false, 1);
  makeLeg(false, -1);

  // Neck, up and forward from the chest; the head on it, level.
  const neckLen = Math.max(H * b.neck * 0.85, sk * 0.7);
  const neckTilt = cat ? 0.95 : 0.85;
  const neck = new THREE.Group();
  neck.position.set(0, H - chestRy * 0.3, L * 0.38);
  neck.rotation.x = neckTilt;
  const neckR = Math.min(chestRx * 0.75, sk * 1.0);
  const neckMesh = cyl(sk * 0.72, neckR, neckLen, coatM);
  neckMesh.position.y = neckLen / 2;
  neck.add(neckMesh);
  if (fluff > 1.12) {
    // The ruff of long fur round the neck.
    const ruff = ell(neckR * 1.5, neckR * 1.35, neckR * 1.3, coat.chest ? secondM : coatM);
    ruff.position.y = neckLen * 0.25;
    neck.add(ruff);
  }
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = neckLen;
  head.rotation.x = -neckTilt + 0.12;
  neck.add(head);
  const skull = ell(sk * 0.85, sk * 0.82, sk * 1.02, coatM);
  head.add(skull);
  const snoutLen = Math.max(H * b.snout, sk * 0.25);
  const snoutR = sk * (b.snoutW ?? 0.6) * 1.0;
  const snout = cyl(snoutR * 0.62, snoutR, snoutLen, muzzleM, 8);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -sk * 0.3, sk * 0.55 + snoutLen / 2);
  const nose = ell(snoutR * 0.5, snoutR * 0.4, snoutR * 0.34, darkM);
  nose.position.set(0, -sk * 0.3 + snoutR * 0.3, sk * 0.55 + snoutLen);
  head.add(snout, nose);
  for (const s of [-1, 1]) {
    const eye = ell(sk * (cat ? 0.17 : 0.13), sk * (cat ? 0.15 : 0.13), sk * 0.08, eyeM);
    eye.position.set(s * sk * 0.42, sk * 0.14, sk * 0.86);
    head.add(eye);
    if (cat) {
      const pupil = ell(sk * 0.05, sk * 0.13, sk * 0.04, darkM);
      pupil.position.set(s * sk * 0.42, sk * 0.14, sk * 0.93);
      head.add(pupil);
    }
  }
  // Ears.
  const es = b.earS ?? 1;
  for (const s of [-1, 1]) {
    let ear: THREE.Object3D;
    if (b.ear === 'prick' || b.ear === 'bat' || b.ear === 'cat' || b.ear === 'semi') {
      const wideEar = b.ear === 'bat' ? 0.5 : b.ear === 'cat' ? 0.4 : 0.34;
      const tall = b.ear === 'cat' ? 0.62 : b.ear === 'semi' ? 0.55 : b.ear === 'bat' ? 0.78 : 0.92;
      ear = cone(sk * wideEar * es, sk * tall * es, earM, b.ear === 'bat' ? 8 : 4);
      ear.position.set(s * sk * 0.5, sk * 0.72 + sk * tall * es * 0.35, -sk * 0.1);
      ear.rotation.z = -s * (b.ear === 'bat' ? 0.4 : 0.28);
      if (b.ear === 'semi') ear.rotation.x = 0.55;
      if (cat) {
        const inner = cone(sk * wideEar * es * 0.55, sk * tall * es * 0.7, mat(0xd8a0a0), 4);
        inner.position.set(0, -sk * 0.05, sk * 0.06);
        ear.add(inner);
      }
    } else if (b.ear === 'drop') {
      ear = ell(sk * 0.13, sk * 0.55 * es, sk * 0.34 * es, earM);
      ear.position.set(s * sk * 0.82, -sk * 0.12 * es, -sk * 0.05);
      ear.rotation.z = s * 0.18;
    } else {
      // Rose ears: small, folded back along the head.
      ear = ell(sk * 0.1, sk * 0.2, sk * 0.42, earM);
      ear.position.set(s * sk * 0.5, sk * 0.55, -sk * 0.62);
      ear.rotation.set(-0.5, 0, -s * 0.45);
    }
    head.add(ear);
  }

  // From the grooming salon: always a collar with a tag, and what the pet wears in the same colour.
  const accentM = mat(accent, null, 0.55);
  const goldM = new THREE.MeshStandardMaterial({ color: 0xe8c25a, roughness: 0.3, metalness: 0.8 });
  mats.push(goldM);
  const torus = (r: number, tube: number, m: THREE.Material) => {
    const g = new THREE.TorusGeometry(r, tube, 6, 18);
    geos.push(g);
    const t2 = new THREE.Mesh(g, m);
    t2.castShadow = true;
    return t2;
  };
  const collarY = neckLen * 0.2;
  const collar = torus(neckR * 1.02, Math.max(neckR * 0.17, 0.006), accentM);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = collarY;
  neck.add(collar);
  const tag = ell(neckR * 0.22, neckR * 0.22, neckR * 0.08, goldM);
  tag.position.set(0, collarY - neckR * 0.3, neckR * 1.12);
  neck.add(tag);
  if (wear === 'bandana') {
    const scarf = cone(neckR * 1.25, neckR * 2.1, accentM, 3);
    scarf.scale.z = 0.3;
    // Hanging down in front of the chest (straight down in the world, whatever the neck's tilt).
    scarf.rotation.x = Math.PI - neckTilt;
    scarf.position.set(0, collarY - Math.cos(neckTilt) * neckR * 0.9, neckR * 0.75 + Math.sin(neckTilt) * neckR * 0.9);
    neck.add(scarf);
  } else if (wear === 'bow') {
    for (const sd of [-1, 1]) {
      const wing = cone(neckR * 0.5, neckR * 0.95, accentM, 6);
      wing.rotation.z = sd * Math.PI / 2;
      wing.position.set(sd * neckR * 0.45, collarY, neckR * 1.15);
      neck.add(wing);
    }
    const knot = ell(neckR * 0.22, neckR * 0.22, neckR * 0.2, accentM);
    knot.position.set(0, collarY, neckR * 1.2);
    neck.add(knot);
  } else if (wear === 'harness') {
    for (const z of [L * 0.28, L * 0.04]) {
      const ring = torus(1, 0.075, accentM);
      const rx = (z > 0.1 * L ? chestRx : loinRy * wide * 0.95) * 1.05;
      const ry = (z > 0.1 * L ? chestRy : loinRy) * 1.05;
      ring.scale.set(rx, ry, Math.min(rx, ry));
      ring.position.set(0, z > 0.1 * L ? chest.position.y : loin.position.y, z);
      body.add(ring);
    }
    const strap = new THREE.Mesh(new THREE.BoxGeometry(chestRx * 0.35, H * 0.025, L * 0.3), accentM);
    geos.push(strap.geometry);
    strap.position.set(0, H + H * 0.01, L * 0.16);
    const ringTop = torus(H * 0.03, H * 0.008, goldM);
    ringTop.position.set(0, H + H * 0.04, L * 0.1);
    body.add(strap, ringTop);
  } else if (wear === 'coat' || wear === 'sweater') {
    // A coat covers the back and the flanks; a sweater goes all round, with a roll neck.
    const knit = wear === 'sweater';
    const capGeo = new THREE.SphereGeometry(1, 14, 9, 0, Math.PI * 2, 0, knit ? Math.PI : Math.PI * 0.56);
    geos.push(capGeo);
    const clothM = knit ? mat(accent, null, 1) : accentM;
    if (!knit) (clothM as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    for (const part of [chest, loin]) {
      const cloth = new THREE.Mesh(capGeo, clothM);
      cloth.castShadow = true;
      cloth.scale.set(part.scale.x * 1.1, part.scale.y * 1.08, part.scale.z * 1.04);
      cloth.position.copy(part.position);
      body.add(cloth);
    }
    if (knit) {
      const roll = torus(neckR * 1.05, neckR * 0.32, clothM);
      roll.rotation.x = Math.PI / 2;
      roll.position.y = collarY * 0.4;
      neck.add(roll);
    } else {
      // The trim along the edge of the coat.
      const trim = new THREE.Mesh(new THREE.BoxGeometry(chestRx * 0.25, H * 0.02, L * 0.62), goldM);
      geos.push(trim.geometry);
      trim.position.set(0, H + H * 0.035, L * 0.04);
      body.add(trim);
    }
  }

  // Tail: a chain of segments hanging down from the croup, turned back (and up) by its root.
  const tailSpec: Record<Breed['tail'], { len: number; r: number; base: number; curl: number; fluffy: boolean }> = {
    thin: { len: 0.85, r: 0.035, base: 0.55, curl: 0.22, fluffy: false },
    otter: { len: 0.6, r: 0.07, base: 1.05, curl: 0.08, fluffy: false },
    plume: { len: 0.65, r: 0.06, base: 0.85, curl: 0.15, fluffy: true },
    curl: { len: 0.55, r: 0.07, base: 2.5, curl: 0.55, fluffy: true },
    stub: { len: 0.13, r: 0.06, base: 1.7, curl: 0, fluffy: false },
    pom: { len: 0.4, r: 0.035, base: 2.4, curl: 0, fluffy: false },
    cat: { len: 1.0, r: 0.045, base: 2.4, curl: 0.18, fluffy: false },
    fluffy: { len: 1.0, r: 0.06, base: 2.3, curl: 0.15, fluffy: true },
  };
  const ts = tailSpec[b.tail];
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, H - hipR * 0.45, zHip - L * 0.14);
  body.add(tailRoot);
  const tailSegs: THREE.Group[] = [];
  const nSeg = ts.len > 0.3 ? 4 : 1;
  const segLen = (H * ts.len) / nSeg;
  let parent: THREE.Object3D = tailRoot;
  for (let i = 0; i < nSeg; i++) {
    const s = new THREE.Group();
    if (i > 0) s.position.y = -segLen;
    const r = H * ts.r * (1 - i * 0.16) * (ts.fluffy ? fluff : 1);
    const last = i === nSeg - 1;
    const m = coat.socks && last && !cat ? secondM : tailM;
    const piece = ts.fluffy ? ell(r * 1.45, segLen * 0.8, r * 1.45, m) : cyl(r, r * 0.8, segLen, m, 6);
    piece.position.y = -segLen / 2;
    s.add(piece);
    if (last && b.tail === 'pom') {
      const pom = ell(H * 0.07, H * 0.07, H * 0.07, tailM);
      pom.position.y = -segLen;
      s.add(pom);
    }
    parent.add(s);
    tailSegs.push(s);
    parent = s;
  }

  // Motion.
  let phase = Math.random() * 6;
  let sitT = 0;
  let wag = 0;
  let t = 0;
  let gait = 0;
  // How far the body tips up when sitting: the shoulders stay at their height, the hips go down.
  const sitHip = Math.max(hipR * 0.9, legL * 0.32);
  const reach = L * 0.3 - zHip;
  const sitAngle = Math.min(1.05, Math.asin(Math.min(0.95, Math.max(0.1, (legL + bodyD * 0.12 - sitHip) / reach))));
  const lerp = (a: number, b2: number, k: number) => a + (b2 - a) * k;

  const update = (dt: number, speed: number, sit: boolean) => {
    t += dt;
    const moving = speed > 0.15;
    sitT = lerp(sitT, sit && !moving ? 1 : 0, Math.min(1, dt * 4));
    // Walk below 1.6 m/s, trot to 4, gallop above (the sighthounds stretch right out).
    gait = lerp(gait, speed > 4 ? 2 : speed > 1.6 ? 1 : 0, Math.min(1, dt * 3));
    const stride = Math.max(0.12, legL * (1.1 + gait * 0.5));
    if (moving) phase += (speed / stride) * dt * 1.6;
    const amp = moving ? Math.min(1, speed / 1.2) * (0.45 + gait * 0.18) : 0;
    for (const l of legs) {
      // Trot: diagonal pairs. Gallop: front pair together, back pair together.
      const off = gait > 1.5 ? (l.front ? 0 : Math.PI) + (l.side > 0 ? 0.35 : 0) : (l.front === l.side > 0 ? 0 : Math.PI);
      const s = Math.sin(phase + off);
      const lift = Math.max(0, Math.sin(phase + off + 1.2)) * amp * 0.9;
      if (l.front) {
        l.root.rotation.x = lerp(s * amp, sitAngle, sitT);
        l.knee.rotation.x = lerp(-lift * 0.8, 0, sitT);
      } else {
        l.root.rotation.x = lerp(-l.bend + s * amp, -1.25 + sitAngle, sitT);
        l.knee.rotation.x = lerp(l.bend * 2 + lift, 2.3, sitT);
      }
      l.paw.rotation.x = -(l.root.rotation.x + l.knee.rotation.x) * 0.8;
    }
    // Sitting tips the body up about the hips; walking gives a small bob, a gallop flexes the back.
    pivot.rotation.x = -sitAngle * sitT + (gait > 1.5 ? Math.sin(phase * 2) * 0.05 : 0);
    pivot.position.y = lerp(hipY, sitHip, sitT) + (moving ? Math.abs(Math.sin(phase)) * H * 0.025 * (1 - sitT) : 0);
    head.rotation.x = -neckTilt + sitAngle * sitT * 0.75 + (moving ? 0 : Math.sin(t * 0.7) * 0.06);
    head.rotation.y = moving ? 0 : Math.sin(t * 0.45) * 0.35;
    // Tail: a dog wags, faster when it stands with you; a cat sways the tip slowly, tail up when walking.
    wag = lerp(wag, cat ? 0.12 : moving ? 0.35 : 0.6, Math.min(1, dt * 2));
    const up = cat ? (moving ? ts.base : ts.base - 0.25) : ts.base + (moving ? 0.15 : 0);
    tailRoot.rotation.x = lerp(up, cat ? 0.35 : Math.min(up, 0.9), sitT);
    tailRoot.rotation.z = Math.sin(t * (cat ? 1.8 : 11)) * wag;
    tailSegs.forEach((s, i) => {
      if (i === 0) return;
      s.rotation.x = ts.curl * (cat && i === tailSegs.length - 1 ? 2.2 : 1) * (1 - sitT * 0.5);
      if (cat) s.rotation.z = Math.sin(t * 1.8 - i * 0.7) * 0.12;
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
      tex?.dispose();
    },
  };
}
