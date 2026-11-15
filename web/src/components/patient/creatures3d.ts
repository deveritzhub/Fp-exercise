import * as THREE from 'three';
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
  slime: { file: 'stijfheidsslijm', scale: 0.9 },
  imp: { file: 'dorstduiveltje', scale: 0.95 },
  couch: { file: 'bankhanger', scale: 1 },
  giant_slime: { file: 'stijfheidsslijm', scale: 1.9 },
  couch_king: { file: 'bankkoning', scale: 1 },
};
const CREATURES_VERSION = 1;

/**
 * A creature for the village: the sculpted model, with the simple one made here standing in until
 * the file has loaded, and staying when it does not come.
 */
export function creature(kind: CreatureKind): THREE.Group {
  const g = new THREE.Group();
  const simple = simpleCreature(kind);
  g.add(simple);
  const m3 = MODEL[kind];
  // The animals are made here; a sculpted file can take their place later.
  if (!m3) return g;
  loadModel(`/village/creatures/${m3.file}.glb?v=${CREATURES_VERSION}`)
    .then((gltf) => {
      const model = gltf.scene.clone(true);
      model.scale.setScalar(m3.scale);
      model.traverse((o) => { o.castShadow = true; });
      g.remove(simple);
      g.add(model);
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
  if (kind === 'oak') return oak();
  if (kind === 'rock') return rock();
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
