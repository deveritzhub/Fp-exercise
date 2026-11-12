import * as THREE from 'three';
import { mat } from './Village3D';
import type { Obstacle, Vec } from './walk';

/**
 * The practice: a town building in the village and, behind its door, the exercise room. The room
 * follows the real one: TV, half rack and monstera on one wall, the street window with the door
 * and the bike on the next, cable tower, band board and ball rack on the third, wall bars and
 * whiteboard on the fourth. Simple shapes in the real colours; a likeness, not a copy.
 */

/** Where the room stands in the scene: far from the village, so neither is seen from the other. */
export const ROOM_AT: Vec = { x: 0, z: 400 };
const at = (x: number, z: number): Vec => ({ x: ROOM_AT.x + x, z: ROOM_AT.z + z });
export const ROOM = {
  rect: { x0: ROOM_AT.x - 3.55, x1: ROOM_AT.x + 3.55, z0: ROOM_AT.z - 2.8, z1: ROOM_AT.z + 2.8 },
  tv: at(0.6, -1.7),
  tvWall: at(0.6, -3.1),
  exit: at(3.1, -2.3),
  entry: at(2.5, -1.6),
  coach: at(1.75, -2.45),
  obstacles: [
    [-1.6, -2.75, 0.85], [-3.45, -2.7, 0.6], [-2.75, -1.95, 0.5], [2.6, -2.95, 0.45], [2.9, 0.5, 0.65], [3.35, 2.75, 0.7], [2.5, 1.9, 0.55],
  ].map(([x, z, r]): Obstacle => ({ ...at(x, z), r })),
} as const;

const WHITE = 0xf4f2ee;
const BLACK = 0x1d1f1e;
const WOOD = 0xc79a62;
const YELLOW = 0xd9e021;
const GLASS = 0xa8d2e0;
const LEAF = 0x2f6b3a;

type Opts = Partial<THREE.MeshStandardMaterialParameters>;
function kit(parent: THREE.Object3D, shadow = true) {
  const add = <T extends THREE.Mesh>(m: T, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  return {
    box: (w: number, h: number, d: number, color: number, x: number, y: number, z: number, opts: Opts = {}) =>
      add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, { flatShading: false, ...opts })), x, y, z),
    cyl: (r: number, h: number, color: number, x: number, y: number, z: number, opts: Opts = {}, r2 = r) =>
      add(new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, 14), mat(color, { flatShading: false, ...opts })), x, y, z),
    ball: (r: number, color: number, x: number, y: number, z: number, opts: Opts = {}) =>
      add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color, { flatShading: false, ...opts })), x, y, z),
  };
}

const glass = (opacity = 0.3): Opts => ({ transparent: true, opacity, roughness: 0.1, metalness: 0.1 });
const mirror: Opts = { roughness: 0.08, metalness: 0.85 };

/** Leaves on a stem: flat green ovals turned every way. */
function plant(parent: THREE.Object3D, x: number, y: number, z: number, leaves: number, spread: number, height: number, size = 0.3) {
  const k = kit(parent);
  for (let i = 0; i < leaves; i++) {
    const a = i * 2.4;
    const h = y + (height * (i + 1)) / leaves;
    const leaf = k.ball(size, i % 3 ? LEAF : 0x3f8048, x + Math.cos(a) * spread, h, z + Math.sin(a) * spread);
    leaf.scale.set(1, 0.08, 0.62);
    leaf.rotation.set(Math.sin(a) * 0.7, a, Math.cos(a) * 0.6);
  }
}

/** The practice in the village: shop front with the big window and the white door, brick above. */
export function practiceBuilding() {
  const g = new THREE.Group();
  const k = kit(g);
  k.box(6, 2.0, 2.4, 0xf2efe8, 0, 1.0, 0);
  k.box(6, 1.7, 2.4, 0x9c5a40, 0, 2.85, 0);
  for (let i = 0; i < 5; i++) k.box(6.02, 0.03, 2.42, 0x7d4532, 0, 2.2 + i * 0.32, 0).castShadow = false;
  k.box(6.3, 0.18, 2.7, 0xe9e4da, 0, 3.79, 0);
  k.box(6.1, 0.1, 2.5, 0x3a3f3c, 0, 2.05, 0);
  // Shop window with the frosted band, and the door to its left.
  k.box(3.4, 1.5, 0.08, 0x3a3f3c, 0.95, 1.15, 1.2);
  k.box(3.2, 1.3, 0.1, GLASS, 0.95, 1.15, 1.21, { roughness: 0.12, metalness: 0.3 });
  k.box(3.2, 0.62, 0.11, 0xf3f6f6, 0.95, 0.82, 1.215);
  k.box(1.1, 1.95, 0.08, 0xe9e4da, -1.9, 0.98, 1.2);
  k.box(0.95, 1.85, 0.1, 0xfafafa, -1.9, 0.93, 1.21);
  k.box(0.6, 0.85, 0.11, GLASS, -1.9, 1.3, 1.215, { roughness: 0.12, metalness: 0.3 });
  k.box(0.05, 0.16, 0.14, BLACK, -1.52, 0.95, 1.24);
  k.box(1.3, 0.1, 0.5, 0xb9b4a8, -1.9, 0.05, 1.45);
  // Sign in the practice colours.
  k.box(3.4, 0.44, 0.1, 0x29483c, 0.95, 2.3, 1.22);
  k.box(3.4, 0.05, 0.12, 0xe4bc63, 0.95, 2.06, 1.22, { metalness: 0.5, roughness: 0.4 });
  k.box(0.26, 0.26, 0.12, 0xe4bc63, -0.45, 2.3, 1.23, { metalness: 0.5, roughness: 0.4 });
  for (const x of [-1.9, 0, 1.9]) {
    k.box(1.0, 1.1, 0.08, 0xe9e4da, x, 2.9, 1.2);
    k.box(0.84, 0.94, 0.1, GLASS, x, 2.9, 1.21, { roughness: 0.12, metalness: 0.3 });
  }
  return g;
}

export type RoomWall = { group: THREE.Group; point: THREE.Vector3; normal: THREE.Vector3 };

/** The exercise room. Walls are separate, so the one between the camera and the room can be left out. */
export function practiceRoom(tv: THREE.Texture) {
  const group = new THREE.Group();
  group.position.set(ROOM_AT.x, 0, ROOM_AT.z);
  const room = kit(group);
  const walls: RoomWall[] = [];
  const wall = (nx: number, nz: number) => {
    const g = new THREE.Group();
    group.add(g);
    walls.push({ group: g, point: new THREE.Vector3(ROOM_AT.x + nx * 4, 0, ROOM_AT.z + nz * 3.2), normal: new THREE.Vector3(nx, 0, nz) });
    return kit(g, false);
  };

  // Floor: light vinyl with faint tile seams, and the door mat.
  room.box(8.3, 0.1, 6.7, 0xd8cfc1, 0, -0.05, 0).castShadow = false;
  for (let i = -3; i <= 3; i++) room.box(0.015, 0.012, 6.4, 0xc6bcab, i * 1.1, 0.005, 0).castShadow = false;
  for (let i = -2; i <= 2; i++) room.box(8, 0.012, 0.015, 0xc6bcab, 0, 0.005, i * 1.1).castShadow = false;
  room.box(0.7, 0.03, 1.0, 0x4a4c4a, 3.3, 0.015, -2.35).castShadow = false;

  // North wall: the TV, and the tall mirror behind the rack.
  const n = wall(0, -1);
  n.box(8.3, 2.6, 0.15, WHITE, 0, 1.3, -3.275);
  n.box(1.95, 1.1, 0.08, BLACK, 0.6, 1.75, -3.16);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.96), new THREE.MeshBasicMaterial({ map: tv, toneMapped: false }));
  screen.position.set(0.6, 1.75, -3.11);
  n.box(0.02, 0.7, 0.02, 0xdddddd, 0.6, 0.86, -3.19);
  walls[0].group.add(screen);
  n.box(1.0, 2.05, 0.04, WHITE, -1.6, 1.12, -3.19);
  n.box(0.9, 1.95, 0.05, 0xcfd8dc, -1.6, 1.12, -3.185, mirror);

  // East wall: the street door, then the wide window with its frosted band, sill and radiator.
  const e = wall(1, 0);
  e.box(0.15, 2.6, 1.9, WHITE, 4.075, 1.3, -2.25);
  e.box(0.15, 2.6, 0.5, WHITE, 4.075, 1.3, 2.95);
  e.box(0.15, 0.8, 4.0, WHITE, 4.075, 0.4, 0.7);
  e.box(0.15, 0.4, 4.0, WHITE, 4.075, 2.4, 0.7);
  e.box(0.04, 1.4, 4.0, GLASS, 4.05, 1.5, 0.7, glass(0.22));
  e.box(0.05, 0.72, 4.0, 0xffffff, 4.04, 1.16, 0.7, glass(0.82));
  e.box(0.12, 0.14, 4.0, 0x5b5f5d, 3.98, 2.16, 0.7);
  e.box(0.45, 0.08, 4.0, 0xfafafa, 3.78, 0.84, 0.7);
  e.box(0.1, 0.5, 1.7, 0xfafafa, 3.92, 0.42, 1.3);
  e.box(0.07, 2.05, 0.95, 0xfafafa, 3.97, 1.02, -2.35);
  e.box(0.08, 1.05, 0.56, GLASS, 3.96, 1.4, -2.35, glass(0.35));
  e.box(0.05, 0.16, 0.05, BLACK, 3.92, 1.0, -2.02);
  // On the sill: the big-leaved plant, kettlebells and the hanging fern.
  e.cyl(0.14, 0.24, 0xf1eee8, 3.75, 1.0, -0.55);
  plant(walls[1].group, 3.75, 1.1, -0.55, 6, 0.2, 0.9, 0.26);
  for (const [z, r] of [[-1.15, 0.1], [-1.38, 0.09], [-0.95, 0.08]]) e.ball(r, BLACK, 3.76, 0.88 + r, z);
  plant(walls[1].group, 3.6, 1.75, 0.4, 7, 0.16, 0.35, 0.16);

  // South wall: doorway to the hall, ball rack, mirror, band board and the cable tower in the corner.
  const s = wall(0, 1);
  s.box(8.3, 2.6, 0.15, WHITE, 0, 1.3, 3.275);
  s.box(1.0, 2.15, 0.05, 0xf2c27a, -2.7, 1.07, 3.18, { emissive: 0xf2a84a, emissiveIntensity: 0.55 });
  s.box(0.3, 2.0, 0.06, WOOD, -1.0, 1.25, 3.17);
  for (let r = 0; r < 4; r++) for (const dx of [-0.17, 0.17]) s.ball(0.16, BLACK, -1.0 + dx, 0.55 + r * 0.48, 3.08);
  s.box(1.0, 2.0, 0.04, WHITE, 0.25, 1.15, 3.19);
  s.box(0.9, 1.9, 0.05, 0xcfd8dc, 0.25, 1.15, 3.185, mirror);
  s.box(1.0, 0.75, 0.05, 0xd2b07c, 1.55, 1.62, 3.17);
  [0xb23a2e, 0x2e2e2e, 0xe0a021, 0x2e2e2e, 0x3d7a3a, 0x2e2e2e].forEach((c, i) => s.box(0.05, 0.75 + (i % 2) * 0.2, 0.03, c, 1.15 + i * 0.16, 0.95 - (i % 2) * 0.1, 3.14));
  s.box(0.95, 2.1, 0.7, BLACK, 3.35, 1.05, 2.85);
  s.box(0.45, 0.14, 0.02, 0xf2f2f2, 3.35, 1.85, 2.49);
  s.ball(0.33, 0x2a2c2b, 3.35, 2.42, 2.85);

  // West wall: wall bars, whiteboard and the small mirror.
  const w = wall(-1, 0);
  w.box(0.15, 2.6, 6.7, WHITE, -4.075, 1.3, 0);
  for (const z of [1.55, 2.3]) w.box(0.08, 2.35, 0.09, WOOD, -3.9, 1.2, z);
  for (let i = 0; i < 9; i++) {
    const rung = w.cyl(0.022, 0.75, WOOD, -3.88, 0.25 + i * 0.24, 1.925);
    rung.rotation.x = Math.PI / 2;
  }
  w.box(0.3, 0.08, 0.09, WOOD, -3.76, 2.3, 1.55);
  w.box(0.3, 0.08, 0.09, WOOD, -3.76, 2.3, 2.3);
  w.box(0.04, 1.0, 0.74, 0xb9bcbc, -3.98, 1.5, 0.5);
  w.box(0.05, 0.92, 0.66, 0xffffff, -3.975, 1.5, 0.5);
  w.box(0.04, 1.75, 0.64, WHITE, -3.98, 1.25, -0.8);
  w.box(0.05, 1.65, 0.56, 0xcfd8dc, -3.975, 1.25, -0.8, mirror);

  // On the floor. Half rack with the bar, in front of the mirror.
  for (const x of [-2.2, -1.0]) {
    room.box(0.09, 2.3, 0.09, BLACK, x, 1.15, -2.85);
    room.box(0.09, 0.08, 1.1, BLACK, x, 0.04, -2.45);
    room.box(0.07, 0.07, 0.3, BLACK, x, 1.2, -2.68);
  }
  room.box(1.3, 0.08, 0.09, BLACK, -1.6, 2.28, -2.85);
  const bar = room.cyl(0.022, 2.6, 0xc9cccc, -1.6, 1.26, -2.58, { metalness: 0.8, roughness: 0.3 });
  bar.rotation.z = Math.PI / 2;
  for (const x of [-2.72, -0.48]) {
    const plate = room.cyl(0.24, 0.06, YELLOW, x, 1.26, -2.58);
    plate.rotation.z = Math.PI / 2;
  }
  // Balance domes, bumper plates against the wall and the sandbag.
  for (const [x, y, z] of [[-1.25, 0.02, -2.15], [-1.5, 0.19, -2.5]]) {
    room.cyl(0.36, 0.04, YELLOW, x, y, z);
    const dome = room.ball(0.33, 0x2a2c2b, x, y + 0.02, z);
    dome.scale.y = 0.5;
  }
  [[0x2b2d2c, -0.35], [0x2b4f9c, 0.05], [0x2f9e44, 0.4]].forEach(([c, x], i) => {
    const plate = room.cyl(0.26, 0.05, c, x, 0.26, -3.02 + i * 0.04);
    plate.rotation.x = Math.PI / 2 - 0.25;
  });
  const bag = room.cyl(0.13, 0.75, 0x6b6f6e, -0.05, 0.14, -2.6);
  bag.rotation.z = Math.PI / 2;
  // Jump box and the step.
  room.box(0.85, 0.8, 0.75, 0xcfa56b, -3.45, 0.4, -2.72);
  const step = room.box(0.95, 0.12, 0.36, BLACK, -2.75, 0.22, -1.95);
  step.rotation.y = 0.5;
  for (const dx of [-0.38, 0.38]) room.box(0.14, 0.17, 0.4, YELLOW, -2.75 + dx * Math.cos(0.5), 0.085, -1.95 - dx * Math.sin(0.5)).rotation.y = 0.5;
  // The monstera by the door.
  room.cyl(0.2, 0.32, 0xe6dccb, 2.6, 0.16, -2.95, {}, 0.24);
  room.cyl(0.03, 2.2, 0x7a5a3a, 2.6, 1.3, -2.95);
  plant(group, 2.6, 0.5, -2.95, 12, 0.24, 1.9, 0.25);
  // Exercise bike in front of the window.
  const bike = new THREE.Group();
  bike.position.set(2.9, 0, 0.5);
  bike.rotation.y = -0.5;
  group.add(bike);
  const bk = kit(bike);
  bk.box(1.2, 0.3, 0.3, BLACK, 0, 0.3, 0);
  bk.box(0.1, 0.08, 0.6, BLACK, -0.55, 0.04, 0);
  bk.box(0.1, 0.08, 0.6, BLACK, 0.55, 0.04, 0);
  bk.cyl(0.24, 0.12, 0xdfe3e3, -0.25, 0.42, 0).rotation.x = Math.PI / 2;
  bk.box(0.07, 0.7, 0.07, 0x9ea3a3, 0.35, 0.75, 0);
  bk.box(0.34, 0.07, 0.24, BLACK, 0.35, 1.12, 0);
  bk.box(0.07, 1.0, 0.07, BLACK, -0.45, 0.9, 0);
  bk.box(0.06, 0.06, 0.55, BLACK, -0.5, 1.35, 0);
  bk.box(0.05, 0.26, 0.22, BLACK, -0.55, 1.55, 0);
  // Adjustable bench in front of the tower, and the dumbbells by the wall.
  const bench = new THREE.Group();
  bench.position.set(2.5, 0, 1.9);
  bench.rotation.y = 0.9;
  group.add(bench);
  const bn = kit(bench);
  bn.box(0.34, 0.09, 1.25, BLACK, 0, 0.5, 0);
  bn.box(0.08, 0.46, 0.08, BLACK, 0, 0.23, -0.45);
  bn.box(0.08, 0.46, 0.08, BLACK, 0, 0.23, 0.45);
  bn.box(0.5, 0.06, 0.08, BLACK, 0, 0.03, -0.45);
  bn.box(0.5, 0.06, 0.08, BLACK, 0, 0.03, 0.45);
  for (const x of [0.9, 1.25]) {
    const grip = room.cyl(0.025, 0.3, 0x9ea3a3, x, 0.12, 2.85);
    grip.rotation.z = Math.PI / 2;
    for (const dx of [-0.14, 0.14]) room.cyl(0.11, 0.1, BLACK, x + dx, 0.12, 2.85).rotation.z = Math.PI / 2;
  }
  return { group, walls };
}
