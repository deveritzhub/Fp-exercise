import * as THREE from 'three';
import { mergeStatic } from './mergeStatic';
import type { CreatureKind } from '@shared/adventure';
import { loadModel } from '@/components/hero/Hero3D';

/**
 * The little ailments of the village as creatures: a stiffness slime, a thirst imp and a couch
 * lurker. Round, small and a bit silly: something to beat, not something to fear.
 */
const m = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const eye = (g: THREE.Group, x: number, y: number, z: number, r = 0.055) => {
  const white = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m(0xffffff, { roughness: 0.3 }));
  white.position.set(x, y, z);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 10, 8), m(0x15181a));
  pupil.position.set(x, y, z + r * 0.7);
  g.add(white, pupil);
};

/** The sculpted models (web/public/village/creatures). Bump the version when a file changes. */
const MODEL: Partial<Record<CreatureKind, { file: string; scale: number }>> = {
  oak: { file: 'boom_eik', scale: 0.42 },
  // The shadow side, sculpted (each at its own height in the file).
  pride: { file: 'pronkpauw', scale: 1 },
  rage: { file: 'vuurkop', scale: 1 },
  craving: { file: 'graaigeest', scale: 1 },
  fright: { file: 'schrikschim', scale: 1 },
  sorrow: { file: 'tranenslijk', scale: 1 },
  apathy: { file: 'grijze_slaper', scale: 1 },
  guilt: { file: 'schuldketter', scale: 1 },
  shame_lord: { file: 'schaamtevorst', scale: 1 },
  slime: { file: 'stijfheidsslijm', scale: 0.9 },
  imp: { file: 'dorstduiveltje', scale: 0.95 },
  couch: { file: 'bankhanger', scale: 1 },
  giant_slime: { file: 'stijfheidsslijm', scale: 1.9 },
  couch_king: { file: 'bankkoning', scale: 1 },
  chicken: { file: 'kip', scale: 1 },
  cow: { file: 'koe', scale: 0.92 },
  boar: { file: 'zwijn', scale: 1 },
  // The hunting grounds and their bosses, and what grows and lies about.
  wolf: { file: 'wolf', scale: 0.88 },
  alpha_wolf: { file: 'alfawolf', scale: 1.2 },
  bear: { file: 'beer', scale: 0.85 },
  alpha_bear: { file: 'alfabeer', scale: 1.05 },
  alpha_boar: { file: 'alfazwijn', scale: 1.05 },
  rock: { file: 'rots', scale: 1 },
  bush: { file: 'bessenstruik', scale: 0.95 },
  pebble: { file: 'steentjes', scale: 1 },
  twigs: { file: 'takjes', scale: 1.1 },
};
const CREATURES_VERSION = 4;

/**
 * A creature for the village: the sculpted model, with the simple one made here standing in until
 * the file has loaded, and staying when it does not come.
 */
export function creature(kind: CreatureKind): THREE.Group {
  const g = new THREE.Group();
  const simple = simpleCreature(kind);
  // The stand-in is taken out whole when the sculpted model arrives: it is merged on its own.
  simple.userData.mergeRoot = true;
  g.add(simple);
  const m3 = MODEL[kind];
  // What has no sculpted file (the tree to chop) stays as made here.
  if (!m3) return g;
  loadModel(`/village/creatures/${m3.file}.glb?v=${CREATURES_VERSION}`)
    .then((gltf) => {
      const model = gltf.scene.clone(true);
      model.scale.setScalar(m3.scale);
      model.traverse((o) => {
        o.castShadow = true;
        // A file with colours on its points but no material of its own would come out as dark metal.
        const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mm?.isMeshStandardMaterial && mm.metalness === 1 && !mm.map) {
          mm.metalness = 0;
          mm.roughness = 0.85;
        }
      });
      g.remove(simple);
      g.add(model);
      mergeStatic(model);
    })
    .catch(() => undefined);
  return g;
}

function simpleCreature(kind: CreatureKind): THREE.Group {
  // The big ones are the small ones grown: the same shape, larger, with a crown for the king.
  if (kind === 'giant_slime' || kind === 'couch_king') {
    const g = new THREE.Group();
    const inner = simpleCreature(kind === 'giant_slime' ? 'slime' : 'couch');
    inner.scale.setScalar(kind === 'giant_slime' ? 1.9 : 1.7);
    g.add(inner);
    if (kind === 'couch_king') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.14, 8, 1, true), m(0xe4bc63, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }));
      crown.position.set(0, 1.05, -0.2);
      g.add(crown);
    }
    return g;
  }
  if (kind === 'chicken' || kind === 'cow' || kind === 'boar') return animal(kind);
  if (kind === 'alpha_boar') return alphaBoar();
  if (kind === 'wolf' || kind === 'bear') return beast(kind);
  if (SHADOWS.has(kind)) return shadowCreature(kind);
  if (kind === 'pebble' || kind === 'twigs') {
    // A little heap on the ground: a few grey pebbles, or a bundle of twigs.
    const g = new THREE.Group();
    if (kind === 'pebble') {
      for (const [x, z, r] of [[0, 0, 0.14], [0.18, 0.08, 0.1], [-0.15, 0.1, 0.11], [0.05, -0.17, 0.09], [-0.08, -0.06, 0.08]] as const) {
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), m(0x8a8d8f, { flatShading: true, roughness: 0.9 }));
        st.position.set(x, r * 0.6, z);
        st.rotation.set(x * 9, z * 7, 0);
        g.add(st);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.6 + (i % 3) * 0.12, 5), m(0x6a4a2c, { roughness: 0.95 }));
        st.rotation.set(Math.PI / 2, 0, -0.6 + i * 0.25);
        st.position.set(0, 0.04 + (i % 2) * 0.04, (i - 2.5) * 0.03);
        g.add(st);
      }
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 5, 10), m(0xb8963a));
      band.position.set(0, 0.07, 0);
      g.add(band);
    }
    g.traverse((o) => { o.castShadow = true; });
    return g;
  }
  if (kind === 'alpha_wolf' || kind === 'alpha_bear') {
    // The pack leader: the same animal, much bigger and darker, with glowing eyes.
    const g = new THREE.Group();
    const inner = beast(kind === 'alpha_wolf' ? 'wolf' : 'bear', true);
    inner.scale.setScalar(kind === 'alpha_wolf' ? 1.9 : 1.7);
    g.add(inner);
    return g;
  }
  if (kind === 'oak') return oak();
  if (kind === 'rock') return rock();
  if (kind === 'bush') return bush();
  const g = new THREE.Group();
  if (kind === 'slime') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), m(0x8fb2c9, { transparent: true, opacity: 0.9, roughness: 0.25 }));
    body.scale.set(1, 0.72, 1);
    body.position.y = 0.23;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), m(0xe9f6ff, { roughness: 0.1 }));
    shine.position.set(-0.12, 0.36, 0.16);
    g.add(body, shine);
    eye(g, -0.1, 0.27, 0.26);
    eye(g, 0.1, 0.27, 0.26);
  } else if (kind === 'imp') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), m(0xe2733a));
    body.position.y = 0.22;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), m(0xee8a4a));
    head.position.y = 0.5;
    g.add(body, head);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 8), m(0x7a2f1c));
      horn.position.set(s * 0.1, 0.68, 0);
      horn.rotation.z = -s * 0.35;
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), m(0x7a2f1c));
      foot.position.set(s * 0.1, 0.05, 0.05);
      g.add(horn, foot);
    }
    // An empty cup in the hand: this one keeps you from drinking.
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 10), m(0xd9e6ee, { roughness: 0.2 }));
    cup.position.set(0.24, 0.26, 0.08);
    g.add(cup);
    eye(g, -0.07, 0.53, 0.14, 0.045);
    eye(g, 0.07, 0.53, 0.14, 0.045);
  } else {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.42), m(0x7d5aa6));
    seat.position.y = 0.2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.14), m(0x6b4a93));
    back.position.set(0, 0.42, -0.14);
    g.add(seat, back);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.42), m(0x6b4a93));
      arm.position.set(s * 0.33, 0.33, 0);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.09, 8), m(0x3a2a22));
      foot.position.set(s * 0.24, 0.045, 0.12);
      g.add(arm, foot);
    }
    eye(g, -0.12, 0.44, -0.05, 0.06);
    eye(g, 0.12, 0.44, -0.05, 0.06);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** A four-legged body: barrel, head, legs. The cow and the boar are both made of it. */
function animal(kind: 'chicken' | 'cow' | 'boar'): THREE.Group {
  const g = new THREE.Group();
  const dark = 0x2a2420;
  if (kind === 'chicken') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), m(0xf4efe4));
    body.scale.set(0.9, 0.95, 1.2);
    body.position.y = 0.26;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), m(0xf4efe4));
    head.position.set(0, 0.46, 0.14);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), m(0xe8a23a));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.45, 0.25);
    const comb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), m(0xc8322c));
    comb.scale.set(0.5, 1, 1.3);
    comb.position.set(0, 0.56, 0.13);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 8), m(0xe6dfd0));
    tail.rotation.x = -0.9;
    tail.position.set(0, 0.38, -0.2);
    g.add(body, head, beak, comb, tail);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.13, 6), m(0xe8a23a));
      leg.position.set(s * 0.06, 0.065, 0.02);
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m(0xe6dfd0));
      wing.scale.set(0.35, 0.7, 1);
      wing.position.set(s * 0.15, 0.28, -0.01);
      g.add(leg, wing);
      eye(g, s * 0.05, 0.48, 0.2, 0.022);
    }
  } else {
    const cow = kind === 'cow';
    const hideC = cow ? 0xf2ede2 : 0x5a4636;
    const len = cow ? 0.95 : 0.78;
    const tall = cow ? 0.62 : 0.42;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(cow ? 0.27 : 0.23, len - 0.5, 6, 14), m(hideC));
    body.rotation.x = Math.PI / 2;
    body.position.y = tall;
    g.add(body);
    if (cow) {
      // Black patches on the white hide.
      for (const [x, y, z, r] of [[0.2, 0.72, 0.12, 0.16], [-0.21, 0.66, -0.16, 0.18], [0.05, 0.86, -0.25, 0.14]] as const) {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m(dark));
        patch.scale.set(0.55, 0.7, 1);
        patch.position.set(x, y, z);
        g.add(patch);
      }
      const udder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m(0xe9a9a6));
      udder.position.set(0, tall - 0.26, -0.18);
      g.add(udder);
    } else {
      // A ridge of bristles down the back.
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, len * 0.8), m(dark));
      ridge.position.set(0, tall + 0.24, -0.02);
      g.add(ridge);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(cow ? 0.26 : 0.24, cow ? 0.26 : 0.22, cow ? 0.34 : 0.36), m(cow ? hideC : 0x4d3b2d));
    head.position.set(0, tall + (cow ? 0.12 : 0.02), len / 2 + 0.12);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(cow ? 0.22 : 0.16, cow ? 0.14 : 0.12, 0.1), m(cow ? 0xe9a9a6 : 0x8a6a5a));
    nose.position.set(0, tall + (cow ? 0.06 : -0.02), len / 2 + 0.33);
    g.add(head, nose);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m(cow ? dark : 0x4d3b2d));
      ear.scale.set(1.4, 0.6, 0.5);
      ear.position.set(s * 0.18, tall + (cow ? 0.22 : 0.14), len / 2 + 0.04);
      // Horns on the cow, tusks on the boar.
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, cow ? 0.14 : 0.12, 8), m(0xf1e6c8));
      if (cow) {
        horn.position.set(s * 0.1, tall + 0.3, len / 2 + 0.08);
        horn.rotation.z = -s * 0.5;
      } else {
        horn.position.set(s * 0.09, tall - 0.01, len / 2 + 0.36);
        horn.rotation.z = -s * 0.3;
      }
      g.add(ear, horn);
      eye(g, s * (cow ? 0.09 : 0.08), tall + (cow ? 0.16 : 0.07), len / 2 + 0.29, 0.035);
      for (const z of [len / 2 - 0.12, -len / 2 + 0.12]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, tall - 0.12, 8), m(cow ? hideC : 0x3f3026));
        leg.position.set(s * 0.15, (tall - 0.12) / 2, z);
        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.06, 8), m(dark));
        hoof.position.set(s * 0.15, 0.03, z);
        g.add(leg, hoof);
      }
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, cow ? 0.42 : 0.16, 6), m(cow ? hideC : dark));
    tail.position.set(0, tall + (cow ? -0.05 : 0.1), -len / 2 - 0.1);
    tail.rotation.x = cow ? 0.25 : -0.9;
    g.add(tail);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/**
 * The first Alpha: the boar of the meadow grown huge and dark, with glowing eyes, long tusks and a
 * mane of spikes. Big enough to read as the boss of the field from far away.
 */
function alphaBoar(): THREE.Group {
  const g = new THREE.Group();
  const S = 2.8;
  const body = animal('boar');
  const drop: THREE.Object3D[] = [];
  body.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
      const c = o.material.color.getHex();
      // The friendly eyes and the small tusks of the meadow boar go; the Alpha gets its own.
      if (c === 0xffffff || c === 0x15181a || c === 0xf1e6c8) drop.push(o);
      // Darker, almost black fur.
      else o.material = m(new THREE.Color(c).multiplyScalar(0.5).getHex(), { roughness: 0.85 });
    }
  });
  drop.forEach((o) => o.parent?.remove(o));
  body.scale.setScalar(S);
  g.add(body);
  const tall = 0.42 * S;
  const front = (0.78 / 2) * S;
  // A mane of spikes along the back.
  for (let i = 0; i < 7; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34 - Math.abs(i - 3) * 0.04, 6), m(0x1b1714, { roughness: 0.9 }));
    spike.position.set(0, tall + 0.62, front * 0.7 - i * 0.24);
    spike.rotation.x = -0.35;
    g.add(spike);
  }
  // The snout tip, in world units (the boar's own nose sits at len/2 + 0.33).
  const snoutZ = (0.78 / 2 + 0.33) * S;
  for (const sd of [-1, 1]) {
    // Long tusks curving up and out from the side of the snout.
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.5, 10), m(0xf1e6c8, { roughness: 0.35 }));
    tusk.position.set(sd * 0.27, tall - 0.02, snoutZ - 0.05);
    tusk.rotation.set(-0.55, 0, -sd * 0.55);
    g.add(tusk);
    // Small, deep eyes that glow red, under a heavy brow.
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshStandardMaterial({ color: 0xff3b1f, emissive: 0xff2a10, emissiveIntensity: 2.4 }));
    glow.position.set(sd * 0.2, tall + 0.2, (0.78 / 2 + 0.29) * S + 0.04);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.12), m(0x1b1714, { roughness: 0.9 }));
    brow.position.set(sd * 0.2, tall + 0.29, (0.78 / 2 + 0.29) * S);
    brow.rotation.z = sd * 0.35;
    g.add(glow, brow);
  }
  // Scars of old fights.
  for (const [x, y, z] of [[0.6, tall + 0.15, 0.2], [-0.58, tall + 0.05, -0.3]] as const) {
    const scar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.4), m(0x8a3a2c));
    scar.position.set(x, y, z);
    scar.rotation.x = 0.5;
    g.add(scar);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** An oak to chop: a thick trunk, a round crown, a cut mark where the axe goes in. */
function oak(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.5, 10), m(0x6b4a2e, { roughness: 0.9 }));
  trunk.position.y = 0.75;
  const cut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.1), m(0xd9b98a));
  cut.position.set(0, 0.55, 0.24);
  g.add(trunk, cut);
  for (const [x, y, z, r] of [[0, 2.0, 0, 0.85], [0.45, 1.75, 0.15, 0.55], [-0.42, 1.8, -0.1, 0.6], [0.05, 2.4, -0.15, 0.55]] as const) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m(0x3f7a35, { roughness: 0.85, flatShading: true }));
    leaf.position.set(x, y, z);
    g.add(leaf);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** A rock to break: a few grey boulders with a lighter vein of stone. */
function rock(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, y, z, r, c] of [[0, 0.42, 0, 0.55, 0x8a8d8f], [0.45, 0.25, 0.2, 0.32, 0x7b7e80], [-0.38, 0.22, 0.18, 0.28, 0x96999b]] as const) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), m(c, { roughness: 0.95, flatShading: true }));
    b.position.set(x, y, z);
    b.rotation.set(x * 2, z * 3, 0.3);
    g.add(b);
  }
  const vein = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), m(0xd8d2c4));
  vein.position.set(0.05, 0.62, 0.42);
  vein.rotation.z = 0.4;
  g.add(vein);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

const flat = (r: number, color: number, o: THREE.MeshStandardMaterialParameters = {}) => {
  const d = new THREE.Mesh(new THREE.CircleGeometry(r, 28), m(color, { roughness: 1, ...o }));
  d.rotation.x = -Math.PI / 2;
  d.position.y = 0.015;
  d.receiveShadow = true;
  return d;
};
const reed = (x: number, z: number, h = 0.7) => {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, h, 5), m(0x5f7d3a));
  stem.position.set(x, h / 2, z);
  const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.14, 4, 8), m(0x6b4a2e));
  tip.position.set(x, h + 0.05, z);
  g.add(stem, tip);
  return g;
};
const stone = (x: number, z: number, r: number, color = 0x8a8d8f) => {
  const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), m(color, { roughness: 0.95, flatShading: true }));
  s.position.set(x, r * 0.55, z);
  s.rotation.set(x, z, 0.4);
  s.castShadow = true;
  return s;
};
const bale = (x: number, z: number) => {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 14), m(0xd9b65b, { roughness: 1 }));
  b.rotation.z = Math.PI / 2;
  b.position.set(x, 0.28, z);
  b.castShadow = true;
  return b;
};

/**
 * Where a creature lives, drawn round it on the ground: a swamp for the slime, a dry patch for the
 * thirst imp, an old rug for the couch lurker, straw for the chickens, a trough for the cows, a mud
 * wallow for the boar and a lair of standing stones for the Alpha. Local +z points to the square, so
 * the props stand behind and to the sides, never between the creature and the hero.
 */
export function habitat(kind: CreatureKind): THREE.Group | null {
  const g = new THREE.Group();
  if (kind === 'slime' || kind === 'giant_slime') {
    const big = kind === 'giant_slime' ? 1.6 : 1;
    g.add(flat(1.1 * big, 0x3d4a2a), flat(0.45 * big, 0x2f5a4a, { roughness: 0.2, metalness: 0.2 }));
    g.children[1].position.set(-0.5 * big, 0.02, -0.4 * big);
    for (const [x, z] of [[-0.9, -0.5], [-0.75, -0.8], [0.8, -0.6], [0.95, -0.25], [-0.2, -1.0]]) g.add(reed(x * big, z * big, 0.6 + Math.abs(x) * 0.2));
  } else if (kind === 'imp') {
    g.add(flat(0.95, 0xc9a96e));
    // A dead bush: bare twigs.
    for (let i = 0; i < 5; i++) {
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.5, 4), m(0x6e5536));
      twig.position.set(-0.55 + i * 0.03, 0.22, -0.6);
      twig.rotation.set(0.3 * Math.sin(i * 2), 0, -0.6 + i * 0.3);
      g.add(twig);
    }
    g.add(stone(0.6, -0.45, 0.12, 0xb59a6a));
  } else if (kind === 'couch' || kind === 'couch_king') {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 1.1), m(kind === 'couch_king' ? 0x6b1f3a : 0x8a3b2c, { roughness: 1 }));
    rug.position.y = 0.012;
    rug.receiveShadow = true;
    g.add(rug);
    for (const [x, z, c] of [[-0.6, -0.45, 0xd9a441], [0.65, -0.35, 0x4f6fa8]] as const) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.3), m(c));
      cushion.position.set(x, 0.07, z);
      cushion.rotation.y = x;
      g.add(cushion);
    }
    if (kind === 'couch_king') {
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.14), m(0x6b1f3a));
      back.position.set(0, 0.65, -0.75);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.16), m(0xe4bc63, { metalness: 0.5, roughness: 0.4 }));
      trim.position.set(0, 1.32, -0.75);
      g.add(back, trim);
    }
  } else if (kind === 'chicken') {
    g.add(flat(0.6, 0xd9c27a));
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 6, 14), m(0xb08d4a, { roughness: 1 }));
    nest.rotation.x = -Math.PI / 2;
    nest.position.set(-0.35, 0.05, -0.35);
    g.add(nest, bale(0.45, -0.45));
  } else if (kind === 'cow') {
    const trough = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.32), m(0x6b4a2e));
    trough.position.set(0, 0.15, -0.85);
    const water = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.24), m(0x4a90c2, { roughness: 0.15, metalness: 0.2 }));
    water.position.set(0, 0.29, -0.85);
    g.add(flat(1.0, 0x86a656), trough, water, bale(-0.85, -0.3));
  } else if (kind === 'wolf') {
    // A den: trampled earth, a few rocks behind it and gnawed bones.
    g.add(flat(1.3, 0x4a3f33));
    for (const [x, z, r] of [[-0.9, -0.8, 0.45], [0.2, -1.2, 0.55], [1.0, -0.7, 0.4]] as const) g.add(stone(x, z, r, 0x6d6f70));
    for (const [x, z, rot] of [[0.7, 0.5, 0.4], [-0.6, 0.3, -1.1]] as const) {
      const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.28, 4, 8), m(0xece3cf));
      bone.rotation.set(Math.PI / 2, 0, rot);
      bone.position.set(x, 0.04, z);
      g.add(bone);
    }
  } else if (kind === 'bear') {
    // A cave: a dark mouth in a mound of boulders behind the bear.
    g.add(flat(1.8, 0x3f3428));
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i - 3) * 0.38;
      g.add(stone(Math.sin(a) * 1.9, Math.cos(a) * 1.9, 0.6 + (i % 3) * 0.18, 0x6a6560));
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m(0x1a1714, { roughness: 1 }));
    mouth.scale.set(1.2, 0.9, 0.5);
    mouth.position.set(0, 0, -1.7);
    g.add(mouth);
  } else if (kind === 'boar') {
    g.add(flat(0.9, 0x5a4330));
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8), m(0x5b432b));
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0.12, -0.7);
    g.add(log);
  } else if (kind === 'alpha_boar' || kind === 'alpha_wolf' || kind === 'alpha_bear' || kind === 'shame_lord') {
    // The lair: scorched ground, a half ring of standing stones behind it, bones in the dirt.
    g.add(flat(2.6, 0x2b2420), flat(1.6, 0x3a2a22));
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i - 3) * 0.42;
      const r = 2.3;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2 + (i % 3) * 0.35, 0.3), m(0x5d5f61, { roughness: 0.95, flatShading: true }));
      pillar.position.set(Math.sin(a) * r, pillar.geometry.parameters.height / 2, Math.cos(a) * r);
      pillar.rotation.set(0.05 * (i % 2 ? 1 : -1), a, 0.04 * (i - 3));
      pillar.castShadow = true;
      g.add(pillar);
    }
    for (const [x, z, rot] of [[1.1, 0.4, 0.6], [-1.2, 0.2, -0.4], [0.5, -1.1, 1.2]] as const) {
      const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.32, 4, 8), m(0xece3cf));
      bone.rotation.set(Math.PI / 2, 0, rot);
      bone.position.set(x, 0.05, z);
      g.add(bone);
    }
  } else if (kind === 'rock') {
    for (const [x, z, r] of [[0.7, -0.3, 0.1], [-0.6, -0.4, 0.13], [0.2, -0.75, 0.09]] as const) g.add(stone(x, z, r));
  } else {
    return null;
  }
  return g;
}

/** A pond: still water with stones round the edge and reeds on the far side. */
export function pond(radius = 1.5): THREE.Group {
  const g = new THREE.Group();
  const bank = flat(radius + 0.35, 0x6f6a4a);
  const water = flat(radius, 0x3f86b8, { roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.92 });
  water.position.y = 0.025;
  g.add(bank, water);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(stone(Math.cos(a) * (radius + 0.2), Math.sin(a) * (radius + 0.2), 0.12 + (i % 3) * 0.04));
  }
  for (const [x, z] of [[-0.9, -1.2], [-0.6, -1.4], [0.4, -1.45], [0.9, -1.15], [1.3, -0.7]]) g.add(reed(x * radius / 1.5, z * radius / 1.5, 0.8));
  // Lily pads.
  for (const [x, z] of [[0.3, 0.2], [-0.5, 0.5], [0.6, -0.4]]) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), m(0x4f8a3a, { roughness: 0.6 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.035, z);
    g.add(pad);
  }
  return g;
}

/** A berry bush to pick: a low round shrub with blue and red berries. */
function bush(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0.42, 0, 0.5], [0.38, 0.32, 0.12, 0.34], [-0.36, 0.3, 0.1, 0.36], [0.05, 0.3, -0.34, 0.34]] as const) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m(0x4c8f3c, { roughness: 0.9, flatShading: true }));
    leaf.position.set(x, y, z);
    g.add(leaf);
  }
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const h = 0.25 + ((i * 37) % 50) / 100;
    const rad = 0.42 + (i % 3) * 0.05;
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m(i % 4 === 0 ? 0xd62d44 : 0x4a5fe0, { roughness: 0.3 }));
    berry.position.set(Math.cos(a) * rad * 0.9, h, Math.sin(a) * rad * 0.9 + 0.05);
    g.add(berry);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** The wolf and the bear: four legs, a long head; the wolf lean and grey, the bear big and brown. */
function beast(kind: 'wolf' | 'bear', alpha = false): THREE.Group {
  const g = new THREE.Group();
  const wolf = kind === 'wolf';
  const fur = alpha ? (wolf ? 0x3d4046 : 0x3a2618) : wolf ? 0x8a8d92 : 0x6b4a2f;
  const dark = alpha ? (wolf ? 0x1c1d20 : 0x1e140c) : wolf ? 0x4d5054 : 0x3d2a1a;
  const len = wolf ? 0.9 : 1.15;
  const tall = wolf ? 0.55 : 0.78;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(wolf ? 0.2 : 0.38, len - (wolf ? 0.4 : 0.6), 6, 14), m(fur, { roughness: 0.9 }));
  body.rotation.x = Math.PI / 2;
  body.position.y = tall;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(wolf ? 0.18 : 0.3, 12, 10), m(fur, { roughness: 0.9 }));
  head.position.set(0, tall + (wolf ? 0.16 : 0.12), len / 2 + (wolf ? 0.12 : 0.1));
  const snout = new THREE.Mesh(new THREE.ConeGeometry(wolf ? 0.08 : 0.14, wolf ? 0.26 : 0.24, 8), m(wolf ? 0xb9bcc0 : 0x8a6440));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, tall + (wolf ? 0.12 : 0.06), len / 2 + (wolf ? 0.36 : 0.42));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(wolf ? 0.035 : 0.05, 8, 6), m(0x1a1a1a));
  nose.position.set(0, tall + (wolf ? 0.12 : 0.07), len / 2 + (wolf ? 0.49 : 0.55));
  g.add(head, snout, nose);
  for (const sd of [-1, 1]) {
    const ear = wolf ? new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), m(dark)) : new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m(dark));
    ear.position.set(sd * (wolf ? 0.1 : 0.2), tall + (wolf ? 0.34 : 0.4), len / 2 + (wolf ? 0.08 : 0.04));
    g.add(ear);
    if (alpha) {
      const glow = new THREE.Mesh(new THREE.SphereGeometry(wolf ? 0.032 : 0.042, 8, 6), m(0xff3a2a, { emissive: 0xff2a1a, emissiveIntensity: 2 }));
      glow.position.set(sd * (wolf ? 0.08 : 0.12), tall + 0.2, len / 2 + (wolf ? 0.28 : 0.37));
      g.add(glow);
    } else eye(g, sd * (wolf ? 0.08 : 0.12), tall + (wolf ? 0.2 : 0.2), len / 2 + (wolf ? 0.27 : 0.36), wolf ? 0.03 : 0.04);
    for (const z of [len / 2 - 0.1, -len / 2 + 0.1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(wolf ? 0.05 : 0.11, wolf ? 0.045 : 0.1, tall - 0.08, 8), m(fur, { roughness: 0.9 }));
      leg.position.set(sd * (wolf ? 0.12 : 0.24), (tall - 0.08) / 2, z);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(wolf ? 0.055 : 0.12, 8, 6), m(dark));
      paw.scale.y = 0.55;
      paw.position.set(sd * (wolf ? 0.12 : 0.24), 0.03, z + 0.03);
      g.add(leg, paw);
    }
  }
  if (wolf) {
    // A bushy tail, held low.
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 4, 8), m(fur, { roughness: 0.95 }));
    tail.rotation.x = -0.9;
    tail.position.set(0, tall - 0.02, -len / 2 - 0.22);
    g.add(tail);
  } else {
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), m(fur, { roughness: 0.95 }));
    hump.position.set(0, tall + 0.22, len / 2 - 0.25);
    g.add(hump);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

const SHADOWS = new Set<CreatureKind>(['pride', 'rage', 'craving', 'fright', 'sorrow', 'apathy', 'guilt', 'shame_lord']);
const glowM = (color: number, k = 1.8) => m(color, { emissive: color, emissiveIntensity: k });

/** The shadow side: heavy feelings as creatures, made of simple shapes, darker as they get heavier. */
function shadowCreature(kind: CreatureKind): THREE.Group {
  const g = new THREE.Group();
  const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  if (kind === 'pride') {
    // A puffed-up golden bird with a fan of tail feathers, nose in the air.
    const body = add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), m(0xd4a62a, { metalness: 0.3, roughness: 0.35 })), 0, 0.45, 0);
    body.scale.set(0.9, 1.1, 1);
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), m(0x2c6fb0)), 0, 0.82, 0.14);
    head.rotation.x = -0.4;
    add(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), m(0xe8a23a)), 0, 0.86, 0.27).rotation.x = Math.PI / 2 - 0.4;
    for (let i = 0; i < 9; i++) {
      const a = -1.1 + (i / 8) * 2.2;
      const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.75, 5), m(i % 2 ? 0x2a8a6a : 0x2c6fb0)), Math.sin(a) * 0.32, 0.72 + Math.cos(a) * 0.32, -0.22);
      f.rotation.set(-0.3, 0, -a);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), glowM(0xffd23a, 0.8)), Math.sin(a) * 0.62, 0.72 + Math.cos(a) * 0.62, -0.28);
    }
    for (const sd of [-1, 1]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), m(0xe8a23a)), sd * 0.08, 0.11, 0);
      eye(g, sd * 0.05, 0.86, 0.22, 0.022);
    }
  } else if (kind === 'rage') {
    // A glowing red head that burns: flames on top, gritted white teeth.
    add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), glowM(0xc8321e, 0.6)), 0, 0.42, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 6), glowM(i % 2 ? 0xff8a1e : 0xffc23a, 2)), Math.cos(a) * 0.14, 0.82, Math.sin(a) * 0.14).userData.dynamic = true;
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.04), m(0xf4efe4)), 0, 0.34, 0.28);
    for (const sd of [-1, 1]) {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glowM(0xfff0a0, 2.2)), sd * 0.11, 0.5, 0.26);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), m(0x3a0e08)), sd * 0.11, 0.59, 0.27).rotation.z = sd * 0.5;
    }
  } else if (kind === 'craving') {
    // A see-through ghost with long grabbing arms.
    const ghostM = m(0x9fe0c8, { transparent: true, opacity: 0.6, emissive: 0x2a8a6a, emissiveIntensity: 0.6 });
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 6, 14), ghostM), 0, 0.75, 0);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 12), ghostM), 0, 0.25, 0).rotation.x = Math.PI;
    for (const sd of [-1, 1]) {
      const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.85, 6), ghostM), sd * 0.38, 0.75, 0.25);
      arm.rotation.set(1.1, 0, sd * 0.5);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), ghostM), sd * 0.56, 0.58, 0.58);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), m(0x0d1a16)), sd * 0.09, 0.95, 0.21);
    }
  } else if (kind === 'fright') {
    // A trembling shadow: dark cloak, two big white eyes.
    const dark = m(0x14121c, { transparent: true, opacity: 0.85, roughness: 1 });
    add(new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.3, 12), dark), 0, 0.65, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), dark), 0, 1.25, 0);
    for (const sd of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glowM(0xf4f4ff, 2)), sd * 0.09, 1.27, 0.2);
  } else if (kind === 'sorrow') {
    // A big blue sludge that drips, with sad, drooping eyes.
    const blue = m(0x3a6ab8, { transparent: true, opacity: 0.85, roughness: 0.2 });
    const body = add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 12), blue), 0, 0.45, 0);
    body.scale.set(1, 0.8, 1);
    for (const [x, z] of [[0.5, 0.2], [-0.45, 0.3], [0.2, -0.5], [-0.3, -0.4]] as const) {
      const drip = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), blue), x, 0.06, z);
      drip.scale.y = 0.4;
    }
    for (const sd of [-1, 1]) {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), m(0xeef4ff)), sd * 0.2, 0.62, 0.48);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), m(0x1a2a4a)), sd * 0.2, 0.74, 0.5).rotation.z = -sd * 0.4;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), glowM(0x9fd0ff, 1.2)), sd * 0.22, 0.46, 0.55);
    }
  } else if (kind === 'apathy') {
    // A grey figure half lying down, hardly moving.
    const grey = m(0x7a7a80, { roughness: 1 });
    const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 6, 12), grey), 0, 0.32, 0);
    body.rotation.z = Math.PI / 2 - 0.25;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), grey), 0.62, 0.55, 0);
    for (const sd of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), m(0x3a3a40)), 0.75, 0.58, sd * 0.09).rotation.y = Math.PI / 2;
  } else if (kind === 'guilt') {
    // A hunched figure in chains, one finger pointing.
    const robe = m(0x4a3a5a, { roughness: 0.9 });
    add(new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 12), robe), 0, 0.6, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), m(0x8a7a90)), 0, 1.3, 0.05);
    const chain = m(0x9a9aa2, { metalness: 0.7, roughness: 0.35 });
    for (let i = 0; i < 4; i++) {
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.36 - i * 0.05, 0.03, 6, 18), chain), 0, 0.3 + i * 0.22, 0);
      ring.rotation.x = Math.PI / 2 + (i % 2 ? 0.2 : -0.2);
    }
    const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6), m(0x8a7a90)), 0.25, 1.0, 0.3);
    arm.rotation.x = 1.3;
    for (const sd of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), glowM(0xb08aff, 1.5)), sd * 0.08, 1.32, 0.24);
  } else {
    // The Shame lord: a tall hooded figure bowed low, with a crown of thorns, red eyes and dark wisps.
    const cloak = m(0x1a0f24, { roughness: 1 });
    add(new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 14), cloak), 0, 1.1, 0);
    const hood = add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), cloak), 0, 2.05, 0.1);
    hood.rotation.x = 0.5;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), m(0x050208)), 0, 1.95, 0.18);
    for (const sd of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glowM(0xff1a2a, 2.6)), sd * 0.12, 1.98, 0.45);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 5), m(0x3a2a14)), Math.cos(a) * 0.3, 2.42, Math.sin(a) * 0.3 + 0.05);
    }
    for (const sd of [-1, 1]) {
      const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 8), cloak), sd * 0.62, 1.35, 0.2);
      arm.rotation.set(0.6, 0, sd * 0.5);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m(0x2a1a34)), sd * 0.95, 0.95, 0.55);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m(0x2a0f3a, { transparent: true, opacity: 0.55, emissive: 0x3a0a4a, emissiveIntensity: 1 })), Math.cos(a) * 1.2, 0.4 + (i % 3) * 0.5, Math.sin(a) * 1.2);
    }
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}
