import * as THREE from 'three';
import type { CreatureKind } from '@shared/adventure';

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

export function creature(kind: CreatureKind): THREE.Group {
  // The big ones are the small ones grown: the same shape, larger, with a crown for the king.
  if (kind === 'giant_slime' || kind === 'couch_king') {
    const g = new THREE.Group();
    const inner = creature(kind === 'giant_slime' ? 'slime' : 'couch');
    inner.scale.setScalar(kind === 'giant_slime' ? 1.9 : 1.7);
    g.add(inner);
    if (kind === 'couch_king') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.14, 8, 1, true), m(0xe4bc63, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }));
      crown.position.set(0, 1.05, -0.2);
      g.add(crown);
    }
    return g;
  }
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
