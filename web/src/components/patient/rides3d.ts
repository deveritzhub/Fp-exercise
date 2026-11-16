import * as THREE from 'three';

/**
 * The rides from the stables, built from simple shapes: a bike, a scooter and a small car. Each faces
 * +z with its middle between the wheels on the ground. `seat` is how high the hero stands or sits on
 * it (the car hides the hero inside); `wheels` turn as it goes.
 */
export type RideModel = { group: THREE.Group; wheels: THREE.Object3D[]; seat: number; hideHero: boolean; wheelR: number };

const std = (color: number, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function wheel(r: number, w: number, tyre: THREE.Material, hub: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.TorusGeometry(r - w * 0.5, w * 0.5, 8, 22), tyre);
  t.rotation.y = Math.PI / 2;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, w * 1.1, 10), hub);
  h.rotation.z = Math.PI / 2;
  g.add(t, h);
  // Spokes, so the turning shows.
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, (r - w) * 2, w * 0.3), hub);
    s.rotation.x = (i * Math.PI) / 3;
    g.add(s);
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  return g;
}

const bar = (from: THREE.Vector3, to: THREE.Vector3, r: number, m: THREE.Material) => {
  const len = from.distanceTo(to);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
  b.position.copy(from).add(to).multiplyScalar(0.5);
  b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  b.castShadow = true;
  return b;
};

function bike(): RideModel {
  const g = new THREE.Group();
  const frame = std(0x2a8a5a, 0.4, 0.3);
  const dark = std(0x1d1f1e, 0.8);
  const steel = std(0xb8bcc2, 0.3, 0.8);
  const R = 0.34;
  const back = wheel(R, 0.09, dark, steel);
  back.position.set(0, R, -0.52);
  const front = wheel(R, 0.09, dark, steel);
  front.position.set(0, R, 0.52);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const pedal = V(0, 0.36, -0.05);
  const seatAt = V(0, 0.82, -0.2);
  const head = V(0, 0.8, 0.38);
  g.add(back, front,
    bar(pedal, seatAt, 0.045, frame), bar(pedal, head, 0.045, frame), bar(seatAt, head.clone().setY(0.76), 0.04, frame),
    bar(V(-0.05, R, -0.52), pedal, 0.03, frame), bar(V(0.05, R, -0.52), pedal, 0.03, frame), bar(V(-0.05, R, -0.52), seatAt, 0.03, frame), bar(V(0.05, R, -0.52), seatAt, 0.03, frame),
    bar(V(0, R, 0.52), head, 0.035, steel), bar(head, V(0, 1.0, 0.34), 0.035, steel),
    bar(V(-0.28, 1.0, 0.34), V(0.28, 1.0, 0.34), 0.03, steel));
  // Pedals out to the sides, where the feet stand.
  for (const x of [-0.16, 0.16]) {
    const pd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), dark);
    pd.position.set(x, 0.4, -0.05);
    g.add(pd);
  }
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.24), dark);
  saddle.position.set(0, 0.86, -0.22);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.22), std(0xa0723a, 0.9));
  basket.position.set(0, 0.86, 0.6);
  g.add(saddle, basket);
  return { group: g, wheels: [back, front], seat: 0.42, hideHero: false, wheelR: R };
}

function scooter(): RideModel {
  const g = new THREE.Group();
  const body = std(0xd9482b, 0.35, 0.2);
  const cream = std(0xf2ead8, 0.5);
  const dark = std(0x1d1f1e, 0.8);
  const steel = std(0xb8bcc2, 0.3, 0.8);
  const R = 0.24;
  const back = wheel(R, 0.09, dark, steel);
  back.position.set(0, R, -0.55);
  const front = wheel(R, 0.09, dark, steel);
  front.position.set(0, R, 0.6);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.7), cream);
  floor.position.set(0, 0.3, 0);
  const rear = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 4, 10), body);
  rear.rotation.x = Math.PI / 2;
  rear.position.set(0, 0.5, -0.45);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.46), dark);
  seat.position.set(0, 0.74, -0.42);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.62, 0.1), body);
  shield.position.set(0, 0.6, 0.42);
  shield.rotation.x = -0.25;
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 1.6 }));
  lamp.position.set(0, 1.0, 0.56);
  g.add(back, front, floor, rear, seat, shield, lamp, bar(V(0, R, 0.6), V(0, 1.02, 0.5), 0.03, steel), bar(V(-0.26, 1.04, 0.5), V(0.26, 1.04, 0.5), 0.02, steel));
  for (const m of [floor, rear, seat, shield]) m.castShadow = true;
  return { group: g, wheels: [back, front], seat: 0.3, hideHero: false, wheelR: R };
}

function car(): RideModel {
  const g = new THREE.Group();
  const paint = std(0x2759a0, 0.3, 0.35);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9cc4e4, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.75 });
  const dark = std(0x1d1f1e, 0.8);
  const steel = std(0xc8ccd2, 0.25, 0.8);
  const R = 0.3;
  const wheels: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.68, -0.85], [0.68, -0.85], [-0.68, 0.85], [0.68, 0.85]]) {
    const w = wheel(R, 0.2, dark, steel);
    w.position.set(x, R, z);
    wheels.push(w);
    g.add(w);
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2.5), paint);
  body.position.y = 0.6;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.3), glass);
  cabin.position.set(0, 1.1, -0.15);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 1.2), paint);
  roof.position.set(0, 1.38, -0.18);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.14, 0.12), steel);
  bumperF.position.set(0, 0.42, 1.27);
  const bumperB = bumperF.clone();
  bumperB.position.z = -1.27;
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 1.8 });
  for (const x of [-0.5, 0.5]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.05), lightMat);
    l.position.set(x, 0.66, 1.26);
    g.add(l);
  }
  for (const m of [body, cabin, roof]) m.castShadow = true;
  g.add(body, cabin, roof, bumperF, bumperB);
  return { group: g, wheels, seat: 0, hideHero: true, wheelR: R };
}

const MAKERS: Record<string, () => RideModel> = { bike, scooter, car };

/** A new model of this ride, or null for an unknown key. */
export function rideModel(key: string): RideModel | null {
  const make = MAKERS[key];
  if (!make) return null;
  const m = make();
  m.group.userData.noMerge = true;
  return m;
}
