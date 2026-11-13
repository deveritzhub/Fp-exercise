import * as THREE from 'three';
import { kit, plant, type RoomWall } from './practice3d';
import type { Obstacle, Rect, Vec } from './walk';

/**
 * Inside the strength house and the mobility studio: one timber room each, furnished for what
 * happens there. Like the practice room, the walls are separate so the one between the camera and
 * the room can be left out.
 */
/** 'home' is the patient's own house: the bare room, which the patient furnishes. */
export type HouseKind = 'kracht' | 'mobiliteit' | 'home';
export type HouseRoom = {
  group: THREE.Group;
  walls: RoomWall[];
  rect: Rect;
  entry: Vec;
  exit: Vec;
  exitMark: Vec;
  /** The board with the programme, and where the hero stands to read it. */
  board: Vec;
  boardMark: Vec;
  obstacles: Obstacle[];
};

const PLASTER = 0xf1e6cf;
const BEAM = 0x5b3f26;
const WOOD = 0xb98a5a;
const BLACK = 0x1d1f1e;

export function houseRoom(kind: HouseKind, origin: Vec): HouseRoom {
  const group = new THREE.Group();
  group.position.set(origin.x, 0, origin.z);
  const room = kit(group);
  const walls: RoomWall[] = [];
  const wall = (nx: number, nz: number) => {
    const g = new THREE.Group();
    group.add(g);
    walls.push({ group: g, point: new THREE.Vector3(origin.x + nx * 3.2, 0, origin.z + nz * 2.5), normal: new THREE.Vector3(nx, 0, nz) });
    return { g, k: kit(g, false) };
  };
  const at = (x: number, z: number): Vec => ({ x: origin.x + x, z: origin.z + z });
  const obstacles: Obstacle[] = [];
  const block = (x: number, z: number, r: number) => obstacles.push({ ...at(x, z), r });
  const accent = kind === 'kracht' ? 0x7a2f24 : kind === 'mobiliteit' ? 0x2f7f8a : 0x29483c;

  // Plank floor and a rug.
  room.box(6.7, 0.1, 5.3, WOOD, 0, -0.05, 0).castShadow = false;
  for (let i = -5; i <= 5; i++) room.box(0.02, 0.012, 5, 0x8e6740, i * 0.58, 0.005, 0).castShadow = false;

  // North wall: timber frame, a window with evening light, and the programme board.
  const n = wall(0, -1);
  n.k.box(6.7, 2.7, 0.15, PLASTER, 0, 1.35, -2.575);
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) n.k.box(0.14, 2.7, 0.06, BEAM, x, 1.35, -2.48);
  n.k.box(6.7, 0.14, 0.06, BEAM, 0, 2.62, -2.48);
  n.k.box(1.2, 1.0, 0.06, BEAM, -2.4, 1.6, -2.47);
  n.k.box(1.04, 0.84, 0.07, 0xffe2a6, -2.4, 1.6, -2.465, { emissive: 0xffc35a, emissiveIntensity: 0.5 });
  n.k.box(0.05, 0.84, 0.08, BEAM, -2.4, 1.6, -2.46);
  n.k.box(1.04, 0.05, 0.08, BEAM, -2.4, 1.6, -2.46);
  n.k.box(1.3, 0.95, 0.06, 0x6b4a2b, 0, 1.55, -2.47);
  n.k.box(1.16, 0.81, 0.07, 0xd9c08f, 0, 1.55, -2.465);
  for (const [x, y, c] of [[-0.32, 1.7, 0xfaf7f0], [0.1, 1.72, 0xfaf7f0], [0.38, 1.4, 0xfaf7f0], [-0.25, 1.35, accent]] as const) n.k.box(0.3, 0.36, 0.02, c, x, y, -2.42);
  n.k.box(0.9, 1.3, 0.04, accent, 2.4, 1.75, -2.47);
  n.k.box(0.5, 0.5, 0.05, 0xe4bc63, 2.4, 1.85, -2.455, { metalness: 0.5, roughness: 0.4 });

  // West wall with the door back to the village; east wall with a shelf.
  const w = wall(-1, 0);
  w.k.box(0.15, 2.7, 5.3, PLASTER, -3.275, 1.35, 0);
  for (const z of [-2.5, -0.8, 0.9, 2.5]) w.k.box(0.06, 2.7, 0.14, BEAM, -3.18, 1.35, z);
  w.k.box(0.08, 2.05, 1.0, 0x7a5232, -3.17, 1.02, 1.7);
  w.k.box(0.1, 0.12, 0.12, 0xe4bc63, -3.12, 1.0, 1.32, { metalness: 0.6, roughness: 0.3 });
  const e = wall(1, 0);
  e.k.box(0.15, 2.7, 5.3, PLASTER, 3.275, 1.35, 0);
  for (const z of [-2.5, -0.8, 0.9, 2.5]) e.k.box(0.06, 2.7, 0.14, BEAM, 3.18, 1.35, z);
  const s = wall(0, 1);
  s.k.box(6.7, 2.7, 0.15, PLASTER, 0, 1.35, 2.575);
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) s.k.box(0.14, 2.7, 0.06, BEAM, x, 1.35, 2.48);

  // A plant by the door (the own home starts empty: what stands there is the patient's choice).
  if (kind !== 'home') {
  // Lanterns on the wall, not from the ceiling: nothing may hang between the camera and the hero.
  for (const x of [-0.95, 0.95]) {
    n.k.box(0.06, 0.06, 0.2, BLACK, x, 2.25, -2.4);
    n.k.box(0.2, 0.26, 0.2, 0xfff1b8, x, 2.1, -2.3, { emissive: 0xffc35a, emissiveIntensity: 1.4 });
  }
  room.cyl(0.18, 0.3, 0x9c5a40, -2.75, 0.15, 0.55, {}, 0.22);
  plant(group, -2.75, 0.35, 0.55, 7, 0.2, 0.9, 0.22);
  block(-2.75, 0.55, 0.4);
  }

  if (kind === 'kracht') {
    // Rubber floor with the rack and the bar.
    room.box(2.4, 0.03, 2.2, 0x2a2c2b, 1.9, 0.015, -1.2).castShadow = false;
    for (const x of [1.3, 2.5]) {
      room.box(0.1, 2.2, 0.1, BLACK, x, 1.1, -1.9);
      room.box(0.1, 0.08, 1.2, BLACK, x, 0.04, -1.45);
      room.box(0.08, 0.08, 0.3, BLACK, x, 1.25, -1.72);
    }
    room.box(1.3, 0.08, 0.1, BLACK, 1.9, 2.18, -1.9);
    room.cyl(0.024, 2.4, 0xc9cccc, 1.9, 1.32, -1.62, { metalness: 0.8, roughness: 0.3 }).rotation.z = Math.PI / 2;
    for (const [x, r, c] of [[0.85, 0.27, 0xb5532c], [0.76, 0.22, 0x2b4f9c], [2.95, 0.27, 0xb5532c], [3.04, 0.22, 0x2b4f9c]]) room.cyl(r, 0.07, c, x, 1.32, -1.62).rotation.z = Math.PI / 2;
    block(1.9, -1.75, 0.95);
    // Bench, dumbbell rack along the east wall, kettlebells, plate tree, heavy bag and chalk.
    room.box(0.36, 0.1, 1.3, 0x3a2a22, 0.3, 0.48, 0.5);
    for (const z of [0, 1.0]) room.box(0.3, 0.44, 0.08, BLACK, 0.3, 0.22, z);
    block(0.3, 0.5, 0.6);
    e.k.box(0.4, 0.06, 2.2, BEAM, 2.95, 0.5, 0.9);
    e.k.box(0.4, 0.06, 2.2, BEAM, 2.95, 1.0, 0.9);
    for (const z of [0.1, 0.9, 1.7]) e.k.box(0.08, 1.0, 0.08, BEAM, 2.95, 0.5, z + 0.2);
    for (let i = 0; i < 5; i++) {
      for (const y of [0.63, 1.13]) {
        const zz = 0.05 + i * 0.42;
        e.k.cyl(0.02, 0.28, 0xc9cccc, 2.95, y, zz).rotation.x = Math.PI / 2;
        for (const dz of [-0.12, 0.12]) e.k.cyl(0.06 + i * 0.012, 0.09, BLACK, 2.95, y, zz + dz).rotation.x = Math.PI / 2;
      }
    }
    for (const [x, r] of [[-2.7, 0.15], [-2.35, 0.13], [-2.02, 0.11]]) {
      room.ball(r, BLACK, x, r, -1.95);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, r * 0.2, 6, 12), new THREE.MeshStandardMaterial({ color: BLACK }));
      handle.position.set(x, r * 2, -1.95);
      group.add(handle);
    }
    block(-2.35, -1.95, 0.55);
    room.cyl(0.05, 1.2, BLACK, 2.6, 0.6, 1.9);
    for (let i = 0; i < 4; i++) room.cyl(0.26 - i * 0.03, 0.07, i % 2 ? 0x2b4f9c : 0xb5532c, 2.6, 0.12 + i * 0.09, 1.9);
    block(2.6, 1.9, 0.45);
    room.box(0.03, 0.9, 0.03, 0x8c8f8a, -1.5, 2.25, -0.4).castShadow = false;
    room.cyl(0.24, 1.15, accent, -1.5, 1.25, -0.4);
    block(-1.5, -0.4, 0.42);
    room.cyl(0.2, 0.34, 0x8c8f8a, -0.6, 0.17, -2.0, {}, 0.24);
    room.cyl(0.2, 0.04, 0xfafafa, -0.6, 0.33, -2.0);
  } else if (kind === 'mobiliteit') {
    // Mats on the floor, wall bars, balls, rollers, a tall mirror and a lot of green.
    [[0x3f8f7a, -0.9], [0x8e6fb0, 0.25], [0xe0a25a, 1.4]].forEach(([c, x]) => {
      room.box(0.85, 0.03, 2.1, c, x, 0.015, 0.45).castShadow = false;
    });
    for (const z of [-1.7, -0.9]) e.k.box(0.09, 2.3, 0.09, 0xc79a62, 3.12, 1.15, z);
    for (let i = 0; i < 9; i++) e.k.cyl(0.022, 0.8, 0xc79a62, 3.1, 0.25 + i * 0.24, -1.3).rotation.x = Math.PI / 2;
    e.k.box(0.05, 2.0, 1.0, 0xfaf7f0, 3.17, 1.2, 1.2);
    e.k.box(0.06, 1.9, 0.9, 0xcfd8dc, 3.165, 1.2, 1.2, { roughness: 0.08, metalness: 0.85 });
    room.ball(0.38, 0x2759a0, 2.45, 0.38, -0.35);
    room.ball(0.3, 0x8e3b5f, 2.6, 0.3, 0.35);
    block(2.5, -0.05, 0.6);
    // Low shelf with rolled mats and foam rollers; cushions; plants.
    room.box(1.7, 0.06, 0.4, BEAM, 1.9, 0.5, -2.25);
    room.box(1.7, 0.06, 0.4, BEAM, 1.9, 0.05, -2.25);
    for (const x of [1.1, 2.7]) room.box(0.06, 0.5, 0.4, BEAM, x, 0.27, -2.25);
    [0x3f8f7a, 0x8e3b5f, 0x2759a0, 0xe0a25a].forEach((c, i) => {
      room.cyl(0.1, 0.36, c, 1.3 + i * 0.4, 0.63, -2.25).rotation.x = Math.PI / 2;
      room.cyl(0.08, 0.34, i % 2 ? BLACK : 0x4a4c4a, 1.3 + i * 0.4, 0.18, -2.25).rotation.x = Math.PI / 2;
    });
    block(1.9, -2.25, 0.85);
    for (const [x, z, c] of [[-1.9, -1.8, 0xe0a25a], [-1.45, -2.0, accent], [-2.3, -1.45, 0xf1e6cf]]) {
      const cushion = room.cyl(0.26, 0.14, c, x, 0.07, z);
      cushion.scale.z = 0.9;
    }
    block(-1.9, -1.8, 0.6);
    room.cyl(0.2, 0.34, 0xe6dccb, -2.75, 0.17, -0.9, {}, 0.24);
    plant(group, -2.75, 0.4, -0.9, 9, 0.24, 1.3, 0.25);
    block(-2.75, -0.9, 0.42);
    plant(group, 1.0, 2.0, -2.2, 6, 0.14, 0.3, 0.14);
    plant(group, -1.0, 2.05, -2.2, 6, 0.14, 0.3, 0.14);
    for (const x of [-1.0, 1.0]) room.box(0.02, 0.5, 0.02, BLACK, x, 2.45, -2.2).castShadow = false;
  }

  return {
    group,
    walls,
    rect: { x0: origin.x - 2.8, x1: origin.x + 2.8, z0: origin.z - 2.05, z1: origin.z + 2.1 },
    entry: at(-2.1, 1.7),
    exit: at(-2.55, 1.7),
    exitMark: at(-3.15, 1.7),
    board: at(0, -1.55),
    boardMark: at(0, -2.4),
    obstacles,
  };
}
