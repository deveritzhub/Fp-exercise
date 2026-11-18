import * as THREE from 'three';
import { mirror as liveMirror } from './mirror3d';
import { kit, plant, type RoomWall } from './practice3d';
import type { Obstacle, Rect, Vec } from './walk';

/**
 * The rest of the practice at the Noorderhavenkade, around the exercise room: upstairs the landing
 * (stairwell with its white railing, the sofa, the ball, the hexagon lights, the rattan lamp and the
 * window with its blinds), the hallway to the exercise room and the treatment room with the grey
 * table; downstairs the hall with the stairs and the moss wall, the treatment room with the marble
 * floor, the slatted wall and the long cabinet, and the strength room with the stone wall, the
 * mirror wall and the rack. Simple shapes in the real colours: a likeness, not a copy.
 *
 * Inner walls are low, so the camera looks over them into the next room; doors are `door:<place>`
 * spots (walk there and the hero goes through).
 */

export const UPSTAIRS_KEY = 'boven';
export const DOWNSTAIRS_KEY = 'beneden';
export const doorKey = (place: string) => `door:${place}`;
/** The words for the doors, by the place they lead to. */
export const DOOR_LABEL: Record<string, [string, string]> = {
  [UPSTAIRS_KEY]: ['Naar boven', 'Upstairs'],
  [DOWNSTAIRS_KEY]: ['Naar beneden', 'Downstairs'],
  practice: ['Oefenzaal', 'Exercise room'],
  gang: ['Naar de gang', 'To the hallway'],
};
const UP_AT: Vec = { x: -220, z: 400 };
const DOWN_AT: Vec = { x: -320, z: 400 };

export type Seat = { x: number; z: number; y: number; face: number; front?: number };
export type Floor = {
  key: string;
  group: THREE.Group;
  walls: RoomWall[];
  at: Vec;
  rect: Rect;
  /** Where the hero comes in, by the place it comes from. */
  entries: Record<string, Vec & { face: number }>;
  entry: Vec;
  face: number;
  exit: Vec;
  obstacles: Obstacle[];
  spots: { key: string; door: Vec }[];
  seats: Seat[];
  /** Where the door labels float. */
  labels: { key: string; at: Vec; y: number }[];
};

const WHITE = 0xf4f2ee;
const BLACK = 0x1d1f1e;
const OAK = 0xc69c6d;
const WALNUT = 0x6b4a33;
const CHROME = 0xc9cccc;
const glow = (color: number, intensity: number) => ({ emissive: color, emissiveIntensity: intensity });

/** A small painted texture (floors and walls), repeated over the surface. */
function painted(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number]): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}
let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
/** White marble with grey veins, in big tiles. */
const marble = (rx: number, rz: number) =>
  painted(256, 256, (g) => {
    g.fillStyle = '#f1f0ed';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,120,125,.35)';
    for (let i = 0; i < 9; i++) {
      g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath();
      let x = rnd() * 256;
      let y = 0;
      g.moveTo(x, y);
      while (y < 256) {
        x += (rnd() - 0.5) * 40;
        y += 12 + rnd() * 20;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.strokeStyle = 'rgba(90,90,90,.5)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, 256, 256);
  }, [rx, rz]);
/** The stone strips of the strength room: beige and white blocks of every length. */
const stones = (rx: number, ry: number) =>
  painted(256, 256, (g) => {
    g.fillStyle = '#8a7a66';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      let x = -rnd() * 40;
      while (x < 256) {
        const w = 24 + rnd() * 50;
        const tone = rnd();
        g.fillStyle = tone < 0.45 ? '#ece6dc' : tone < 0.75 ? '#d9b98c' : '#c99a62';
        g.fillRect(x + 1, y + 1, w - 2, 14);
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.fillRect(x + 1, y + 1, w - 2, 3);
        x += w;
      }
    }
  }, [rx, ry]);
/** Tiles with a thin seam (the vinyl upstairs, the hall downstairs, the rubber in the strength room). */
const tiles = (base: string, seam: string, rx: number, rz: number) =>
  painted(128, 128, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},.05)`;
      g.fillRect(rnd() * 128, rnd() * 128, 2, 2);
    }
    g.strokeStyle = seam;
    g.lineWidth = 2;
    g.strokeRect(0, 0, 128, 128);
  }, [rx, rz]);

/** Shapes, walls and things that are in the way, for one floor. */
function floorKit(key: string, at: Vec, w: number, d: number) {
  const group = new THREE.Group();
  group.position.set(at.x, 0, at.z);
  group.userData.noMerge = true;
  const room = kit(group);
  const walls: RoomWall[] = [];
  const obstacles: Obstacle[] = [];
  const W = (x: number, z: number): Vec => ({ x: at.x + x, z: at.z + z });
  const wall = (nx: number, nz: number) => {
    const g = new THREE.Group();
    group.add(g);
    walls.push({ group: g, point: new THREE.Vector3(at.x + (nx * w) / 2, 0, at.z + (nz * d) / 2), normal: new THREE.Vector3(nx, 0, nz) });
    return { g, k: kit(g, false) };
  };
  const block = (x: number, z: number, r: number) => obstacles.push({ ...W(x, z), r });
  /** A row of obstacles along a line (a wall, a cabinet), leaving the gaps open. */
  const line = (x0: number, z0: number, x1: number, z1: number, r = 0.2, gaps: [number, number][] = []) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (let s = 0; s <= len + 0.001; s += 0.25) {
      if (gaps.some(([a, b]) => s > a - 0.15 && s < b + 0.15)) continue;
      block(x0 + ((x1 - x0) * s) / len, z0 + ((z1 - z0) * s) / len, r);
    }
  };
  /** A low inner wall (1.1 m, so the camera sees over it), with door gaps measured from its start. */
  const inner = (x0: number, z0: number, x1: number, z1: number, gaps: [number, number][] = [], color = WHITE) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const along = z0 === z1;
    const cuts = [0, ...gaps.flat(), len];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i];
      const b = cuts[i + 1];
      if (b - a < 0.05) continue;
      const mid = (a + b) / 2;
      const cx = x0 + ((x1 - x0) * mid) / len;
      const cz = z0 + ((z1 - z0) * mid) / len;
      room.box(along ? b - a : 0.12, 1.1, along ? 0.12 : b - a, color, cx, 0.55, cz);
      room.box(along ? b - a : 0.16, 0.04, along ? 0.16 : b - a, OAK, cx, 1.12, cz);
    }
    line(x0, z0, x1, z1, 0.2, gaps);
  };
  const seats: Seat[] = [];
  const seat = (x: number, z: number, y: number, face: number, front?: number) => seats.push({ ...W(x, z), y, face, front });
  const labels: Floor['labels'] = [];
  const spots: Floor['spots'] = [];
  const door = (to: string, x: number, z: number, lx = x, lz = z, y = 2.3) => {
    spots.push({ key: doorKey(to), door: W(x, z) });
    labels.push({ key: doorKey(to), at: W(lx, lz), y });
  };
  /** A working mirror on a wall group: `turn` 0 faces south (+z). */
  const glass = (parent: THREE.Object3D, mw: number, mh: number, x: number, y: number, z: number, turn: number) => {
    const m = liveMirror(mw, mh, { reach: 12 });
    m.position.set(x, y, z);
    m.rotation.y = turn;
    parent.add(m);
    return m;
  };
  const frame = (parent: THREE.Object3D, fw: number, fh: number, x: number, y: number, z: number, turn: number, inside: THREE.Texture | number, border = WALNUT) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = turn;
    const k = kit(g, false);
    k.box(fw, fh, 0.03, border, 0, 0, 0);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.82, fh * 0.82), typeof inside === 'number' ? new THREE.MeshStandardMaterial({ color: inside, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ map: inside, roughness: 0.9 }));
    pic.position.z = 0.017;
    g.add(pic);
    parent.add(g);
    return g;
  };
  return { key, group, room, walls, obstacles, W, wall, block, line, inner, seat, seats, labels, spots, door, glass, frame };
}

/** A picture drawn on a little canvas (the prints on the walls). */
const drawing = (draw: (g: CanvasRenderingContext2D) => void, bg = '#f3ead9') =>
  painted(128, 160, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 128, 160);
    g.strokeStyle = '#2a2420';
    g.fillStyle = '#2a2420';
    g.lineWidth = 3;
    draw(g);
  }, [1, 1]);

/** Upstairs: landing with the stairwell, hallway to the exercise room, treatment room 2. */
export function upstairs(): Floor {
  const w = 9;
  const d = 7;
  const f = floorKit(UPSTAIRS_KEY, UP_AT, w, d);
  const { room } = f;
  // Floor: light grey vinyl in big tiles, round the stairwell.
  const vinyl = tiles('#d4cfc7', 'rgba(150,145,138,.6)', 1, 1);
  const floorM: Partial<THREE.MeshStandardMaterialParameters> = vinyl ? { map: vinyl, roughness: 0.8 } : {};
  const hole = { x0: -2.5, x1: -0.7, z0: -0.5, z1: 1.6 };
  const slab = (x0: number, x1: number, z0: number, z1: number) => {
    const m = room.box(x1 - x0, 0.1, z1 - z0, 0xffffff, (x0 + x1) / 2, -0.05, (z0 + z1) / 2, floorM);
    m.castShadow = false;
    const tex = (m.material as THREE.MeshStandardMaterial).map;
    if (tex) {
      const t = tex.clone();
      t.repeat.set((x1 - x0) / 0.9, (z1 - z0) / 0.9);
      t.needsUpdate = true;
      (m.material as THREE.MeshStandardMaterial).map = t;
    }
  };
  slab(-w / 2, w / 2, -d / 2, hole.z0);
  slab(-w / 2, w / 2, hole.z1, d / 2);
  slab(-w / 2, hole.x0, hole.z0, hole.z1);
  slab(hole.x1, w / 2, hole.z0, hole.z1);
  // The stairs going down, seen through the stairwell: white steps with beige treads.
  for (let i = 0; i < 9; i++) {
    const x = hole.x1 - 0.12 - i * 0.2;
    room.box(0.2, 0.06, 1.0, WHITE, x, -0.2 - i * 0.18, 0.95);
    room.box(0.16, 0.012, 0.7, 0xc8b493, x, -0.165 - i * 0.18, 0.95);
  }
  room.box(hole.x1 - hole.x0, 0.02, hole.z1 - hole.z0, 0x2b2b2b, (hole.x0 + hole.x1) / 2, -1.9, (hole.z0 + hole.z1) / 2);
  // The white railing round the stairwell, open at the top of the stairs (east, south half).
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const along = z0 === z1;
    room.box(along ? len + 0.06 : 0.06, 0.05, along ? 0.06 : len + 0.06, WHITE, (x0 + x1) / 2, 1.0, (z0 + z1) / 2);
    room.box(along ? len : 0.04, 0.04, along ? 0.04 : len, WHITE, (x0 + x1) / 2, 0.12, (z0 + z1) / 2);
    for (let s = 0; s <= len + 0.001; s += 0.13) room.box(0.03, 0.9, 0.03, WHITE, x0 + ((x1 - x0) * s) / len, 0.55, z0 + ((z1 - z0) * s) / len);
  };
  rail(hole.x0, hole.z0, hole.x1, hole.z0);
  rail(hole.x0, hole.z1, hole.x1, hole.z1);
  rail(hole.x0, hole.z0, hole.x0, hole.z1);
  rail(hole.x1, hole.z0, hole.x1, 0.35);
  // Nobody walks into the stairwell.
  for (let x = hole.x0 + 0.25; x < hole.x1; x += 0.4) for (let z = hole.z0 + 0.25; z < hole.z1; z += 0.4) f.block(x, z, 0.32);
  f.door(DOWNSTAIRS_KEY, -0.3, 1.0, -1.6, 1.0, 1.9);

  // North wall: the toilet door, the round print, the window with its wooden blinds and the radiator.
  const n = f.wall(0, -1);
  n.k.box(w, 2.6, 0.15, WHITE, 0, 1.3, -d / 2 - 0.075);
  n.k.box(0.86, 2.06, 0.04, 0xf7f6f3, -3.3, 1.03, -d / 2 + 0.02);
  n.k.box(0.12, 0.03, 0.05, CHROME, -3.0, 1.0, -d / 2 + 0.06, { metalness: 0.8, roughness: 0.3 });
  const disc = n.k.cyl(0.24, 0.03, 0xf3ece2, -2.1, 1.75, -d / 2 + 0.03);
  disc.rotation.x = Math.PI / 2;
  for (const [dx, dy] of [[-0.06, 0.05], [0.04, 0.09], [0.08, 0.0], [-0.02, -0.04]]) n.k.ball(0.025, 0xc23a3a, -2.1 + dx, 1.75 + dy, -d / 2 + 0.05);
  n.k.box(1.2, 1.55, 0.06, WHITE, -0.8, 1.55, -d / 2 + 0.02);
  n.k.box(1.08, 1.43, 0.02, 0xdfeaf2, -0.8, 1.55, -d / 2 + 0.05, glow(0xdfeaf2, 0.35));
  for (let i = 0; i < 18; i++) n.k.box(1.08, 0.035, 0.03, 0xa9774a, -0.8, 0.88 + i * 0.075, -d / 2 + 0.08);
  n.k.box(1.2, 0.6, 0.08, WHITE, -0.8, 0.45, -d / 2 + 0.06);
  for (let i = 0; i < 12; i++) n.k.box(0.03, 0.56, 0.1, 0xe8e6e1, -1.35 + i * 0.1, 0.45, -d / 2 + 0.11);
  // Hallway part of the north wall: the two prints (sun and circles) and the white closet door.
  const sun = drawing((g) => {
    g.beginPath();
    g.arc(64, 80, 16, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 24, 80 + Math.sin(a) * 24);
      g.lineTo(64 + Math.cos(a + 0.2) * 44, 80 + Math.sin(a + 0.2) * 44);
      g.stroke();
    }
  });
  const rings = drawing((g) => {
    for (const [x, y, r] of [[64, 92, 26], [64, 92, 12], [64, 58, 10]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
    }
  });
  f.frame(n.g, 0.42, 0.52, 1.3, 1.75, -d / 2 + 0.03, 0, sun ?? 0xf3ead9);
  f.frame(n.g, 0.42, 0.52, 1.3, 1.1, -d / 2 + 0.03, 0, rings ?? 0xf3ead9);
  n.k.box(0.82, 2.06, 0.04, 0xf7f6f3, 2.6, 1.03, -d / 2 + 0.02);
  n.k.ball(0.03, 0x8a6a3a, 2.85, 1.0, -d / 2 + 0.06);

  // West wall: the hexagon lights over the sofa.
  const wst = f.wall(-1, 0);
  wst.k.box(0.15, 2.6, d, WHITE, -w / 2 - 0.075, 1.3, 0);
  for (const [z, y] of [[-2.5, 2.0], [-2.25, 1.78], [-2.5, 1.56], [-2.75, 1.78], [-2.25, 1.34]]) {
    const hex = wst.k.cyl(0.13, 0.06, OAK, -w / 2 + 0.04, y, z, glow(0xffb45a, 0.35));
    hex.rotation.z = Math.PI / 2;
    (hex.geometry as THREE.BufferGeometry).dispose();
    hex.geometry = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 6);
  }
  // The sofa: long and low, beige, with two mustard pillows; a black ball in front of it.
  room.box(0.8, 0.4, 3.0, 0xd6cdbd, -4.05, 0.2, -0.3);
  room.box(0.2, 0.5, 3.0, 0xd6cdbd, -4.38, 0.55, -0.3);
  for (let i = 0; i < 6; i++) room.box(0.82, 0.01, 0.02, 0xbfb5a3, -4.05, 0.405, -1.65 + i * 0.5);
  for (const z of [-1.3, -0.4]) {
    const pil = room.box(0.16, 0.5, 0.55, 0xc9a45c, -4.18, 0.68, z);
    pil.rotation.z = 0.25;
  }
  room.ball(0.34, 0x1b1b1b, -3.3, 0.34, 2.0, { roughness: 0.35 });
  f.line(-4.1, -1.7, -4.1, 1.1, 0.42);
  f.block(-3.3, 2.0, 0.38);
  f.seat(-3.9, -0.9, 0.42, Math.PI / 2, 0.55);
  f.seat(-3.9, 0.5, 0.42, Math.PI / 2, 0.55);
  // The rattan lamp over the stairwell.
  room.cyl(0.006, 0.6, 0xffffff, -1.6, 2.4, 0.55);
  const shade = room.cyl(0.3, 0.32, 0xe6c38f, -1.6, 1.95, 0.55, { ...glow(0xffcf8a, 0.55), roughness: 1 });
  shade.castShadow = false;

  // East wall: the open door to the exercise room (its blue TV seen at the end), and the room wall.
  const e = f.wall(1, 0);
  e.k.box(0.15, 2.6, d, WHITE, w / 2 + 0.075, 1.3, 0);
  e.k.box(0.04, 2.08, 0.98, 0x9aa3a8, w / 2 - 0.01, 1.04, -2.2);
  e.k.box(0.02, 0.4, 0.7, 0x5aa7e8, w / 2 - 0.04, 1.55, -2.2, glow(0x5aa7e8, 1.1));
  f.door('practice', 4.05, -2.2, 4.0, -2.2, 2.45);

  // South wall.
  const s = f.wall(0, 1);
  s.k.box(w, 2.6, 0.15, WHITE, 0, 1.3, d / 2 + 0.075);

  // Treatment room 2 (south-east), behind a low wall with a door: the grey table, the saddle stool,
  // the standing mirror, the radiator under the dermatome chart, the bookcase and a white chair.
  f.inner(0.5, -0.4, w / 2, -0.4, [[0.25, 1.25]]);
  f.inner(0.5, -0.4, 0.5, d / 2);
  // The table, lengthwise: white base, dark grey padded top with the face hole at the head.
  room.box(1.5, 0.12, 0.42, 0xe7e9ea, 2.6, 0.12, 1.7);
  room.box(0.18, 0.45, 0.38, 0xb8bcbf, 2.0, 0.4, 1.7, { metalness: 0.4, roughness: 0.4 });
  room.box(0.18, 0.45, 0.38, 0xb8bcbf, 3.2, 0.4, 1.7, { metalness: 0.4, roughness: 0.4 });
  room.box(1.95, 0.13, 0.72, 0x4f5459, 2.6, 0.69, 1.7, { roughness: 0.95 });
  const roll = room.cyl(0.09, 0.62, 0x4f5459, 1.75, 0.82, 1.7);
  roll.rotation.x = Math.PI / 2;
  f.block(2.6, 1.7, 0.55);
  f.block(1.9, 1.7, 0.4);
  f.block(3.3, 1.7, 0.4);
  f.seat(2.6, 2.12, 0.68, 0, 0.5);
  // The saddle stool.
  room.cyl(0.03, 0.55, CHROME, 3.7, 0.3, 0.35, { metalness: 0.8, roughness: 0.3 });
  room.cyl(0.22, 0.04, BLACK, 3.7, 0.04, 0.35);
  room.box(0.4, 0.09, 0.32, BLACK, 3.7, 0.62, 0.35);
  f.block(3.7, 0.35, 0.25);
  f.seat(3.7, 0.35, 0.62, -Math.PI / 2, 0.45);
  // The standing mirror on its round foot, turned to the table.
  room.cyl(0.3, 0.04, 0xf2f2f2, 4.15, 0.02, 2.8);
  const mf = new THREE.Group();
  mf.position.set(4.15, 0, 2.8);
  mf.rotation.y = -Math.PI / 2 - 0.35;
  const mk = kit(mf);
  mk.box(0.62, 1.66, 0.04, 0xf4f4f4, 0, 0.88, -0.03);
  f.glass(mf, 0.54, 1.58, 0, 0.88, 0.0, 0);
  f.group.add(mf);
  f.block(4.15, 2.8, 0.32);
  // The radiator and the dermatome chart on the south wall.
  s.k.box(1.3, 0.55, 0.08, WHITE, 2.6, 0.5, d / 2 - 0.05);
  for (let i = 0; i < 13; i++) s.k.box(0.03, 0.5, 0.1, 0xe8e6e1, 2.0 + i * 0.1, 0.5, d / 2 - 0.1);
  const chart = drawing((g) => {
    const body = (cx: number) => {
      const bands = ['#e8a33a', '#5cb85c', '#d9534f', '#5bc0de', '#9b59b6', '#f0ad4e'];
      g.beginPath();
      g.arc(cx, 26, 9, 0, Math.PI * 2);
      g.fillStyle = '#e7c9a8';
      g.fill();
      for (let i = 0; i < 6; i++) {
        g.fillStyle = bands[i];
        g.fillRect(cx - 12, 38 + i * 18, 24, 18);
      }
      g.fillStyle = '#2f8a52';
      g.fillRect(cx - 12, 146, 9, 10);
      g.fillRect(cx + 3, 146, 9, 10);
    };
    body(40);
    body(88);
  }, '#ffffff');
  f.frame(s.g, 0.5, 0.66, 2.6, 1.6, d / 2 - 0.02, Math.PI, chart ?? 0xffffff, BLACK);
  // The bookcase against the low wall, with books and a skeleton chart.
  room.box(0.36, 1.9, 1.0, WHITE, 0.78, 0.95, 2.7);
  for (let r = 0; r < 4; r++) {
    room.box(0.32, 0.02, 0.94, 0xe9e7e2, 0.8, 0.35 + r * 0.45, 2.7);
    for (let b = 0; b < 6; b++) room.box(0.22, 0.28, 0.08, [0x2f6fc4, 0xc23a3a, 0x2f8a52, 0xd9a52c, 0x24211e, 0x7a4ab8][(b + r) % 6], 0.8, 0.51 + r * 0.45, 2.35 + b * 0.12);
  }
  f.block(0.8, 2.5, 0.3);
  f.block(0.8, 2.9, 0.3);
  // A white shell chair on wooden legs.
  room.box(0.5, 0.06, 0.5, WHITE, 1.35, 0.45, 0.45);
  room.box(0.5, 0.4, 0.06, WHITE, 1.35, 0.68, 0.22);
  for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) room.box(0.03, 0.44, 0.03, OAK, 1.35 + dx, 0.22, 0.45 + dz);
  f.block(1.35, 0.45, 0.3);
  f.seat(1.35, 0.45, 0.45, 0, 0.5);
  // A little white fan by the window side.
  room.cyl(0.02, 0.9, WHITE, 3.9, 0.45, 3.1);
  const fan = room.cyl(0.18, 0.06, 0xf4f4f4, 3.9, 0.95, 3.1);
  fan.rotation.x = Math.PI / 2;

  return {
    key: UPSTAIRS_KEY,
    group: f.group,
    walls: f.walls,
    at: UP_AT,
    rect: { x0: UP_AT.x - w / 2 + 0.35, x1: UP_AT.x + w / 2 - 0.35, z0: UP_AT.z - d / 2 + 0.35, z1: UP_AT.z + d / 2 - 0.35 },
    entries: {
      practice: { ...f.W(2.6, -2.0), face: -Math.PI / 2 },
      [DOWNSTAIRS_KEY]: { ...f.W(0.1, -1.4), face: -Math.PI / 2 },
    },
    entry: f.W(2.6, -2.0),
    face: -Math.PI / 2,
    exit: f.W(-0.3, 1.0),
    obstacles: f.obstacles,
    spots: f.spots,
    seats: f.seats,
    labels: f.labels,
  };
}

/** Downstairs: the hall with the stairs, treatment room 1 and the strength room. */
export function downstairs(): Floor {
  const w = 10;
  const d = 8;
  const f = floorKit(DOWNSTAIRS_KEY, DOWN_AT, w, d);
  const { room } = f;
  const floor = (x0: number, x1: number, z0: number, z1: number, tex: THREE.Texture | null, color: number, rough: number) => {
    const m = room.box(x1 - x0, 0.1, z1 - z0, tex ? 0xffffff : color, (x0 + x1) / 2, -0.05, (z0 + z1) / 2, tex ? { map: tex, roughness: rough } : { roughness: rough });
    m.castShadow = false;
  };
  // Hall: warm beige tiles. Treatment room: shiny white marble. Strength room: black rubber.
  floor(-w / 2, -1.5, -d / 2, d / 2, tiles('#d8cdb9', 'rgba(170,155,130,.7)', 4, 8), 0xd8cdb9, 0.75);
  floor(-1.5, w / 2, -d / 2, 0.4, marble(6, 4), 0xf1f0ed, 0.18);
  floor(-1.5, w / 2, 0.4, d / 2, tiles('#202121', 'rgba(70,70,70,.9)', 6, 4), 0x202121, 0.95);
  const stoneTex = stones(3, 1.5);
  const stoneM = stoneTex ? { map: stoneTex, roughness: 0.95 } : {};

  // North wall: the stairs going up along it, and the long cabinet of the treatment room.
  const n = f.wall(0, -1);
  n.k.box(w, 2.6, 0.15, WHITE, 0, 1.3, -d / 2 - 0.075);
  for (let i = 0; i < 11; i++) {
    const x = -4.7 + i * 0.27;
    const h = 0.2 + i * 0.21;
    room.box(0.27, h, 0.95, WHITE, x, h / 2, -3.48);
    room.box(0.2, 0.012, 0.6, 0xc8b493, x, h + 0.006, -3.48);
  }
  room.box(3.0, 0.05, 0.05, WHITE, -3.3, 1.65, -2.98).rotation.z = 0.66;
  f.line(-4.8, -3.0, -1.8, -3.0, 0.22);
  f.door(UPSTAIRS_KEY, -4.45, -2.45, -4.2, -3.4, 2.0);
  // The moss wall by the stairs, the street door and a plant in the hall (west wall).
  const wst = f.wall(-1, 0);
  wst.k.box(0.15, 2.6, d, WHITE, -w / 2 - 0.075, 1.3, 0);
  const moss = painted(64, 64, (g) => {
    g.fillStyle = '#2d5a26';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = ['#3f7a33', '#25481f', '#57913f'][Math.floor(rnd() * 3)];
      g.fillRect(rnd() * 64, rnd() * 64, 3, 3);
    }
  }, [2, 3]);
  wst.k.box(0.06, 1.8, 1.0, 0xffffff, -w / 2 + 0.03, 1.4, -1.5, moss ? { map: moss, roughness: 1 } : { color: 0x2d5a26 });
  wst.k.box(0.06, 2.15, 1.05, 0x2a2c2b, -w / 2 + 0.03, 1.07, 1.9);
  wst.k.box(0.03, 1.4, 0.75, 0xbcd8e6, -w / 2 + 0.07, 1.25, 1.9, { ...glow(0xdfeef5, 0.5), transparent: true, opacity: 0.85 });
  room.cyl(0.18, 0.34, 0xcfb58c, -4.45, 0.17, 3.4);
  plant(f.group, -4.45, 0.34, 3.4, 8, 0.28, 1.1, 0.3);
  f.block(-4.45, 3.4, 0.35);
  f.labels.push({ key: 'exit', at: f.W(-4.6, 1.9), y: 2.45 });

  // The wall between the hall and the rooms: two doorways, the slatted wall on the treatment side.
  f.inner(-1.5, -d / 2, -1.5, d / 2, [[3.05, 4.05], [5.55, 6.6]]);
  // Slatted wall: squares of walnut slats on black, turned every other way, with a dark top band.
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const z = -3.3 + c * 0.72;
      const y = 0.4 + r * 0.72;
      room.box(0.03, 0.7, 0.7, 0x161616, -1.42, y, z);
      const upright = (r + c) % 2 === 0;
      for (let i = 0; i < 9; i++) {
        if (upright) room.box(0.04, 0.68, 0.045, WALNUT, -1.39, y, z - 0.31 + i * 0.077);
        else room.box(0.04, 0.045, 0.68, WALNUT, -1.39, y - 0.31 + i * 0.077, z);
      }
    }
  }
  room.box(0.05, 0.1, 2.2, 0x161616, -1.4, 1.17, -2.58);
  // Between the treatment room and the strength room: a full wall, all mirror on the strength side.
  f.inner(-1.5, 0.4, w / 2, 0.4);
  room.box(6.5, 1.5, 0.12, WHITE, 1.75, 1.85, 0.4);
  for (const x of [-0.3, 1.3, 2.9, 4.5]) room.box(0.05, 2.0, 0.03, BLACK, x, 1.05, 0.48);
  room.box(5.4, 0.08, 0.04, BLACK, 2.0, 2.06, 0.48);
  f.glass(f.group, 5.2, 1.9, 2.1, 1.0, 0.48, 0);

  // Treatment room 1: the long cabinet with its black marble top, the bowl, the prints over a warm
  // light strip, the infrared panel, the table on its rug, the desk with the screen, the mirror.
  room.box(4.6, 0.82, 0.5, WHITE, 2.1, 0.41, -3.72);
  for (let i = 0; i < 6; i++) room.box(0.72, 0.01, 0.01, 0xd9d7d2, 0.25 + i * 0.75, 0.55, -3.46);
  room.box(4.7, 0.05, 0.56, 0x18181a, 2.1, 0.845, -3.72, { roughness: 0.12, metalness: 0.2 });
  room.box(0.32, 0.82, 0.52, 0xffffff, 1.9, 0.41, -3.72, stoneM);
  const bowl = room.ball(0.17, 0xffffff, 1.9, 0.87, -3.72, { roughness: 0.2 });
  bowl.scale.y = 0.5;
  room.cyl(0.015, 0.3, CHROME, 1.9, 1.02, -3.88, { metalness: 0.9, roughness: 0.2 });
  room.box(4.4, 0.04, 0.03, 0xffd28a, 2.1, 1.12, -3.93, glow(0xffc670, 1.4));
  const joint = (draw: (g: CanvasRenderingContext2D) => void) => drawing((g) => {
    g.lineWidth = 2;
    g.fillStyle = '#e6c9ad';
    g.beginPath();
    g.arc(64, 80, 38, 0, Math.PI * 2);
    g.fill();
    draw(g);
  });
  const prints = [
    joint((g) => {
      g.beginPath();
      g.arc(60, 60, 14, 0, Math.PI * 2);
      g.moveTo(60, 74);
      g.lineTo(76, 120);
      g.stroke();
    }),
    joint((g) => {
      g.beginPath();
      g.moveTo(52, 30);
      g.lineTo(60, 76);
      g.moveTo(68, 84);
      g.lineTo(74, 132);
      g.stroke();
      g.beginPath();
      g.arc(64, 80, 8, 0, Math.PI * 2);
      g.stroke();
    }),
    joint((g) => {
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.ellipse(64, 30 + i * 12, 7, 4, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }),
  ];
  prints.forEach((tex, i) => f.frame(n.g, 0.48, 0.6, 0.5 + i * 1.6, 1.6, -d / 2 + 0.03, 0, tex ?? 0xf3ead9, 0xb89a74));
  plant(f.group, 0.3, 0.87, -3.72, 7, 0.25, 0.5, 0.22);
  plant(f.group, 2.7, 0.87, -3.72, 6, 0.12, 0.35, 0.12);
  const ir = room.box(0.62, 0.76, 0.03, 0xf4f4f4, 3.9, 1.3, -3.7);
  ir.rotation.y = -0.4;
  f.line(-0.15, -3.72, 4.4, -3.72, 0.3);
  // The table on its rug, lengthwise: grey frame, beige padded top, a towel at the foot.
  const rug = room.box(2.7, 0.012, 1.6, 0xb7a993, 0.9, 0.006, -1.6, { roughness: 1 });
  rug.castShadow = false;
  room.box(1.6, 0.1, 0.5, 0xc9cbcc, 0.9, 0.12, -1.6);
  room.box(0.16, 0.45, 0.4, 0xb8bcbf, 0.3, 0.4, -1.6, { metalness: 0.4, roughness: 0.4 });
  room.box(0.16, 0.45, 0.4, 0xb8bcbf, 1.5, 0.4, -1.6, { metalness: 0.4, roughness: 0.4 });
  room.box(1.95, 0.13, 0.72, 0xd7c6ad, 0.9, 0.69, -1.6, { roughness: 0.9 });
  room.box(0.6, 0.05, 0.68, 0xfafafa, 1.55, 0.78, -1.6);
  f.block(0.9, -1.6, 0.55);
  f.block(0.2, -1.6, 0.4);
  f.block(1.6, -1.6, 0.4);
  f.seat(0.9, -1.18, 0.68, 0, 0.5);
  // The desk with its screen and a white chair; the mirror on the east wall.
  room.box(1.4, 0.04, 0.72, WHITE, 3.95, 0.74, -1.0);
  for (const [dx, dz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) room.box(0.04, 0.72, 0.04, WHITE, 3.95 + dx, 0.37, -1.0 + dz);
  room.box(0.05, 0.36, 0.6, BLACK, 4.45, 1.12, -1.0);
  room.box(0.02, 0.32, 0.55, 0x3a6fb0, 4.42, 1.12, -1.0, glow(0x3a6fb0, 0.6));
  room.box(0.18, 0.02, 0.18, BLACK, 4.5, 0.77, -1.0);
  f.block(3.95, -1.0, 0.55);
  f.block(4.5, -1.3, 0.35);
  room.box(0.46, 0.05, 0.46, WHITE, 3.1, 0.45, -0.95);
  room.box(0.06, 0.4, 0.46, WHITE, 2.9, 0.68, -0.95);
  for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) room.box(0.03, 0.44, 0.03, OAK, 3.1 + dx, 0.22, -0.95 + dz);
  f.block(3.1, -0.95, 0.28);
  f.seat(3.1, -0.95, 0.45, Math.PI / 2, 0.5);
  const e = f.wall(1, 0);
  e.k.box(0.15, 2.6, d, WHITE, w / 2 + 0.075, 1.3, 0);
  e.k.box(0.03, 1.9, 0.82, 0xf4f4f4, w / 2 - 0.02, 1.05, -2.6);
  f.glass(e.g, 0.74, 1.82, w / 2 - 0.045, 1.05, -2.6, -Math.PI / 2);

  // The strength room: stone on the south and east walls, the rack, plants, a ball, the lamp, a mat
  // and the round wooden stool by the door.
  e.k.box(0.03, 2.5, 3.55, 0xffffff, w / 2 - 0.02, 1.25, 2.2, stoneM);
  const s = f.wall(0, 1);
  s.k.box(w, 2.6, 0.15, WHITE, 0, 1.3, d / 2 + 0.075);
  const southStone = stones(5, 1.5);
  s.k.box(6.45, 2.5, 0.03, 0xffffff, 1.77, 1.25, d / 2 - 0.02, southStone ? { map: southStone, roughness: 0.95 } : {});
  const rack = (x: number, z: number) => {
    for (const [dx, dz] of [[-0.6, -0.55], [0.6, -0.55], [-0.6, 0.55], [0.6, 0.55]]) room.box(0.07, 2.2, 0.07, BLACK, x + dx, 1.1, z + dz);
    for (const dz of [-0.55, 0.55]) room.box(1.27, 0.07, 0.07, BLACK, x, 2.2, z + dz);
    for (const dx of [-0.6, 0.6]) room.box(0.07, 0.07, 1.17, BLACK, x + dx, 2.2, z);
    for (const dx of [-0.6, 0.6]) room.box(0.07, 0.07, 1.17, BLACK, x + dx, 0.04, z);
    const bar = room.cyl(0.02, 1.4, CHROME, x, 2.05, z - 0.55, { metalness: 0.8, roughness: 0.3 });
    bar.rotation.z = Math.PI / 2;
    room.box(0.32, 0.08, 1.1, BLACK, x, 0.45, z);
    room.box(0.24, 0.36, 0.24, BLACK, x, 0.22, z);
    room.box(0.06, 0.1, 0.08, 0xe6e6e6, x - 0.6, 1.5, z - 0.62);
  };
  rack(3.9, 2.4);
  f.block(3.9, 2.4, 0.95);
  for (const x of [0.2, 0.85]) {
    room.cyl(0.2, 0.32, 0xb08a52, x, 0.16, 3.55);
    plant(f.group, x, 0.32, 3.55, 9, 0.35, 1.35, 0.36);
    f.block(x, 3.55, 0.32);
  }
  room.ball(0.33, 0x1d1d1d, 1.9, 0.33, 2.9, { roughness: 0.4 });
  f.block(1.9, 2.9, 0.38);
  const mat = room.box(0.8, 0.012, 1.6, 0xf4f4f4, 0.4, 0.006, 1.6);
  mat.castShadow = false;
  // Tripod floor lamp against the stone, its shade glowing.
  for (const [dx, dz] of [[-0.18, 0], [0.12, 0.14], [0.12, -0.14]]) {
    const leg = room.box(0.025, 1.3, 0.025, OAK, 2.8 + dx * 0.5, 0.62, 3.6 + dz * 0.5);
    leg.rotation.z = -dx * 0.6;
    leg.rotation.x = dz * 0.6;
  }
  room.cyl(0.2, 0.3, 0xf4e6c4, 2.8, 1.38, 3.6, glow(0xffd99a, 0.8), 0.24);
  f.block(2.8, 3.6, 0.3);
  // The round wooden stool by the door.
  room.cyl(0.22, 0.04, 0xd2ac6a, -0.85, 0.5, 1.0);
  for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [0, 0.15]]) room.box(0.03, 0.5, 0.03, 0xd2ac6a, -0.85 + dx, 0.25, 1.0 + dz);
  f.block(-0.85, 1.0, 0.25);
  f.seat(-0.85, 1.0, 0.5, Math.PI / 2, 0.45);

  return {
    key: DOWNSTAIRS_KEY,
    group: f.group,
    walls: f.walls,
    at: DOWN_AT,
    rect: { x0: DOWN_AT.x - w / 2 + 0.35, x1: DOWN_AT.x + w / 2 - 0.35, z0: DOWN_AT.z - d / 2 + 0.35, z1: DOWN_AT.z + d / 2 - 0.35 },
    entries: { [UPSTAIRS_KEY]: { ...f.W(-3.5, -1.5), face: Math.PI / 2 } },
    entry: f.W(-3.5, -1.5),
    face: Math.PI / 2,
    exit: f.W(-4.4, 1.9),
    obstacles: f.obstacles,
    spots: f.spots,
    seats: f.seats,
    labels: f.labels,
  };
}
