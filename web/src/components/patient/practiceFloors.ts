import * as THREE from 'three';
import { mirror as liveMirror } from './mirror3d';
import { kit, plant, type RoomWall } from './practice3d';
import { bananaPlant, monstera, powerRack, realPlant, saddleStool, treatmentTable } from './gym3d';
import type { Obstacle, Rect, Vec } from './walk';

/**
 * The rest of the practice at the Noorderhavenkade, around the exercise room, laid out after the 3D
 * scan of the building (room sizes and places in metres; upstairs and downstairs share one frame, so
 * the stairs line up). Upstairs: the landing round the stairwell, treatment room 2, the toilet and the
 * little kitchen; the exercise room is through the landing's west door. Downstairs: exercise room 2
 * with the stone walls and the mirror wall, treatment room 1 with the marble and the long cabinet,
 * the hall with the stairs, the coat nook and waiting room 2 with the slatted wall. The way in from
 * the quay is the street door of the exercise room.
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

/** The physiotherapists of the practice, by where they stand: the exercise room and the treatment room upstairs. */
export const STAFF_NAMES = { practice: 'Syabend', treatment: 'Dinish' } as const;
export const talkKey = (who: string) => `talk:${who}`;

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
  /** Staff who stand on this floor: where, where the hero talks to them from, and which way they look. */
  people?: { who: string; at: Vec; talkAt: Vec; face: number }[];
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

/** A room of the plan: a rectangle in metres (x east, z south), with its floor. A stairwell is a hole in it. */
type PlanRoom = { x0: number; x1: number; z0: number; z1: number; floor: THREE.MeshStandardMaterial; hole?: { x0: number; x1: number; z0: number; z1: number } };
type Floors = { vinyl: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; beige: THREE.MeshStandardMaterial; rubber: THREE.MeshStandardMaterial; yellow: THREE.MeshStandardMaterial; white: THREE.MeshStandardMaterial };
const floorMats = (): Floors => {
  const m = (tex: THREE.Texture | null, color: number, rough: number) => new THREE.MeshStandardMaterial(tex ? { map: tex, roughness: rough } : { color, roughness: rough });
  return {
    vinyl: m(tiles('#cdbb9f', 'rgba(150,128,96,.55)', 1, 1), 0xcdbb9f, 0.8),
    marble: m(marble(1, 1), 0xf1f0ed, 0.16),
    beige: m(tiles('#d8cdb9', 'rgba(170,155,130,.7)', 1, 1), 0xd8cdb9, 0.75),
    rubber: m(tiles('#202121', 'rgba(70,70,70,.9)', 1, 1), 0x202121, 0.95),
    yellow: m(tiles('#e8dcc0', 'rgba(170,150,110,.8)', 1, 1), 0xe8dcc0, 0.6),
    white: m(tiles('#eeeeec', 'rgba(170,170,170,.8)', 1, 1), 0xeeeeec, 0.5),
  };
};
/** A floor slab, its texture repeated per metre (tiles of 60 cm, marble of 90 cm). */
const slabOf = (parent: THREE.Object3D, mat: THREE.MeshStandardMaterial, x0: number, x1: number, z0: number, z1: number, tile = 0.6) => {
  const m2 = mat.clone();
  if (mat.map) {
    m2.map = mat.map.clone();
    m2.map.repeat.set((x1 - x0) / tile, (z1 - z0) / tile);
    m2.map.needsUpdate = true;
  }
  const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0), m2);
  s.position.set((x0 + x1) / 2, -0.05, (z0 + z1) / 2);
  s.receiveShadow = true;
  parent.add(s);
};

/**
 * One floor, built from its plan: the rooms (from the 3D scan of the practice, in metres), the outer
 * walls found round them (full height, left out when they stand between the camera and the hero),
 * low inner walls with door gaps, and everything outside the rooms kept off limits.
 */
function planKit(key: string, at: Vec, rooms: PlanRoom[]) {
  const group = new THREE.Group();
  group.position.set(at.x, 0, at.z);
  group.userData.noMerge = true;
  const room = kit(group);
  const walls: RoomWall[] = [];
  const obstacles: Obstacle[] = [];
  const W = (x: number, z: number): Vec => ({ x: at.x + x, z: at.z + z });
  const inRoom = (x: number, z: number, m = 0) => rooms.some((r) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m && !(r.hole && x > r.hole.x0 - m && x < r.hole.x1 + m && z > r.hole.z0 - m && z < r.hole.z1 + m));
  const inside = (x: number, z: number) => rooms.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
  // Floors (round a stairwell, four slabs).
  for (const r of rooms) {
    const tile = r.floor.map && r.floor.roughness < 0.3 ? 0.9 : 0.6;
    if (!r.hole) slabOf(group, r.floor, r.x0, r.x1, r.z0, r.z1, tile);
    else {
      const h = r.hole;
      slabOf(group, r.floor, r.x0, r.x1, r.z0, h.z0, tile);
      slabOf(group, r.floor, r.x0, r.x1, h.z1, r.z1, tile);
      slabOf(group, r.floor, r.x0, h.x0, h.z0, h.z1, tile);
      slabOf(group, r.floor, h.x1, r.x1, h.z0, h.z1, tile);
    }
  }
  // Outer walls: every stretch of a room's edge with no room behind it.
  const segs: { x0: number; z0: number; x1: number; z1: number; nx: number; nz: number; g: THREE.Group }[] = [];
  for (const r of rooms) {
    const edges: [number, number, number, number, number, number][] = [
      [r.x0, r.z0, r.x1, r.z0, 0, -1],
      [r.x0, r.z1, r.x1, r.z1, 0, 1],
      [r.x0, r.z0, r.x0, r.z1, -1, 0],
      [r.x1, r.z0, r.x1, r.z1, 1, 0],
    ];
    for (const [ax, az, bx, bz, nx, nz] of edges) {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 0.05));
      let start = -1;
      for (let i = 0; i <= n; i++) {
        const t = (i + 0.5) / n;
        const px = ax + (bx - ax) * t;
        const pz = az + (bz - az) * t;
        const open = i < n && !inside(px + nx * 0.08, pz + nz * 0.08);
        if (open && start < 0) start = i;
        if ((!open || i === n) && start >= 0) {
          const t0 = start / n;
          const t1 = i / n;
          if ((t1 - t0) * len > 0.04) {
            const g = new THREE.Group();
            group.add(g);
            const sx0 = ax + (bx - ax) * t0;
            const sz0 = az + (bz - az) * t0;
            const sx1 = ax + (bx - ax) * t1;
            const sz1 = az + (bz - az) * t1;
            const k = kit(g, false);
            const along = nz !== 0;
            k.box(along ? Math.abs(sx1 - sx0) + 0.15 : 0.15, 2.6, along ? 0.15 : Math.abs(sz1 - sz0) + 0.15, WHITE, (sx0 + sx1) / 2 + nx * 0.075, 1.3, (sz0 + sz1) / 2 + nz * 0.075);
            walls.push({ group: g, point: new THREE.Vector3(at.x + (sx0 + sx1) / 2, 0, at.z + (sz0 + sz1) / 2), normal: new THREE.Vector3(nx, 0, nz) });
            segs.push({ x0: sx0, z0: sz0, x1: sx1, z1: sz1, nx, nz, g });
          }
          start = -1;
        }
      }
    }
  }
  /** The outer wall at a point (to hang things on, so they go with the wall when it is left out). */
  const wallAt = (x: number, z: number) => {
    let best = segs[0];
    let bd = Infinity;
    for (const sg of segs) {
      const t = Math.max(0, Math.min(1, ((x - sg.x0) * (sg.x1 - sg.x0) + (z - sg.z0) * (sg.z1 - sg.z0)) / (Math.hypot(sg.x1 - sg.x0, sg.z1 - sg.z0) ** 2 || 1)));
      const dd = Math.hypot(x - (sg.x0 + (sg.x1 - sg.x0) * t), z - (sg.z0 + (sg.z1 - sg.z0) * t));
      if (dd < bd) {
        bd = dd;
        best = sg;
      }
    }
    return best.g;
  };
  // Off limits: everything inside the outline that is not a room (and the stairwell).
  const xs = rooms.flatMap((r) => [r.x0, r.x1]);
  const zs = rooms.flatMap((r) => [r.z0, r.z1]);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  for (let x = box.x0 + 0.1; x < box.x1; x += 0.2) for (let z = box.z0 + 0.1; z < box.z1; z += 0.2) if (!inRoom(x, z, 0)) obstacles.push({ ...W(x, z), r: 0.14 });
  const block = (x: number, z: number, r: number) => obstacles.push({ ...W(x, z), r });
  const line = (x0: number, z0: number, x1: number, z1: number, r = 0.13, gaps: [number, number][] = []) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (let s2 = 0; s2 <= len + 0.001; s2 += 0.2) {
      if (gaps.some(([a, b]) => s2 > a - 0.05 && s2 < b + 0.05)) continue;
      block(x0 + ((x1 - x0) * s2) / len, z0 + ((z1 - z0) * s2) / len, r);
    }
  };
  /** A low inner wall (1.1 m, so the camera sees over it), with door gaps measured from its start. */
  const inner = (x0: number, z0: number, x1: number, z1: number, gaps: [number, number][] = [], h = 1.1) => {
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
      room.box(along ? b - a : 0.12, h, along ? 0.12 : b - a, WHITE, cx, h / 2, cz);
      room.box(along ? b - a : 0.16, 0.04, along ? 0.16 : b - a, OAK, cx, h + 0.02, cz);
    }
    line(x0, z0, x1, z1, 0.13, gaps);
  };
  const seats: Seat[] = [];
  const seat = (x: number, z: number, y: number, face: number, front?: number) => seats.push({ ...W(x, z), y, face, front });
  const labels: Floor['labels'] = [];
  const spots: Floor['spots'] = [];
  const door = (to: string, x: number, z: number, lx = x, lz = z, y = 2.3) => {
    spots.push({ key: doorKey(to), door: W(x, z) });
    labels.push({ key: doorKey(to), at: W(lx, lz), y });
  };
  /** A working mirror: `turn` 0 faces south (+z). */
  const glass = (parent: THREE.Object3D, mw: number, mh: number, x: number, y: number, z: number, turn: number) => {
    const m = liveMirror(mw, mh, { reach: 12 });
    m.position.set(x, y, z);
    m.rotation.y = turn;
    parent.add(m);
    return m;
  };
  const frame = (parent: THREE.Object3D, fw: number, fh: number, x: number, y: number, z: number, turn: number, insideTex: THREE.Texture | number | null, border = WALNUT) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = turn;
    kit(g, false).box(fw, fh, 0.03, border, 0, 0, 0);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.82, fh * 0.82), typeof insideTex === 'object' && insideTex ? new THREE.MeshStandardMaterial({ map: insideTex, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ color: (insideTex as number | null) ?? 0xf3ead9, roughness: 0.9 }));
    pic.position.z = 0.017;
    g.add(pic);
    parent.add(g);
    return g;
  };
  /** A panel on the inside of an outer wall (stone strips, tiles): along x when `alongX`. */
  const panel = (x0: number, z0: number, x1: number, z1: number, mat: THREE.Material, h = 2.5, y0 = 0) => {
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? Math.abs(x1 - x0) : 0.03, h, alongX ? 0.03 : Math.abs(z1 - z0)), mat);
    m.position.set(mx, y0 + h / 2, mz);
    m.receiveShadow = true;
    wallAt(mx, mz).add(m);
    return m;
  };
  const rect: Rect = { x0: at.x + box.x0 + 0.3, x1: at.x + box.x1 - 0.3, z0: at.z + box.z0 + 0.3, z1: at.z + box.z1 - 0.3 };
  return { key, group, room, walls, obstacles, W, block, line, inner, seat, seats, labels, spots, door, glass, frame, panel, wallAt, rect };
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
const sunPrint = () =>
  drawing((g) => {
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
const ringsPrint = () =>
  drawing((g) => {
    for (const [x, y, r] of [[64, 92, 26], [64, 92, 12], [64, 58, 10]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
    }
  });

/** A white shell chair on oak legs, facing `face`; a seat. */
function chair(f: ReturnType<typeof planKit>, x: number, z: number, face: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = face;
  const k = kit(g);
  k.box(0.48, 0.06, 0.46, WHITE, 0, 0.45, 0);
  k.box(0.48, 0.38, 0.06, WHITE, 0, 0.66, -0.22);
  for (const [dx, dz] of [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]]) k.box(0.03, 0.44, 0.03, OAK, dx, 0.22, dz);
  f.group.add(g);
  f.block(x, z, 0.28);
  f.seat(x, z, 0.45, face, 0.5);
}

/** A treatment table lengthwise along x: frame, padded top in `top`, a roll at the head. Not a seat. */
function table(f: ReturnType<typeof planKit>, x: number, z: number, top: number, base = 0xe7e9ea) {
  const t = treatmentTable(top, base, { towel: top !== 0x4f5459 });
  t.position.set(x, 0, z);
  f.group.add(t);
  f.block(x, z, 0.55);
  f.block(x - 0.7, z, 0.4);
  f.block(x + 0.7, z, 0.4);
}

/**
 * Upstairs, after the scan: the landing round the stairwell (sofa, ball, hexagon lights, rattan lamp,
 * the window with its blinds on the street side, prints and coat hooks), treatment room 2 behind it,
 * the toilet and the little kitchen. The exercise room is through the door on the west of the landing.
 */
export function upstairs(): Floor {
  const F = floorMats();
  const hole = { x0: 1.93, x1: 3.68, z0: 0.82, z1: 2.1 };
  const f = planKit(UPSTAIRS_KEY, UP_AT, [
    { x0: 0.58, x1: 4.84, z0: -4.84, z1: -1.2, floor: F.vinyl },
    { x0: 0.47, x1: 4.55, z0: -1.2, z1: 0.12, floor: F.vinyl },
    { x0: 0.75, x1: 5.54, z0: 0.12, z1: 2.45, floor: F.vinyl, hole },
    { x0: 4.55, x1: 5.54, z0: -1.2, z1: 0.12, floor: F.white },
    { x0: 2.92, x1: 5.54, z0: 2.45, z1: 4.03, floor: F.yellow },
  ]);
  const { room } = f;
  // Inner walls: treatment room 2 (door to the landing), the toilet (door on its west), the kitchen.
  f.inner(0.58, -1.2, 4.84, -1.2, [[1.4, 2.4]]);
  f.inner(4.55, -1.2, 4.55, 0.12, [[0.2, 1.2]]);
  f.inner(4.55, 0.12, 5.54, 0.12);
  f.inner(2.92, 2.45, 5.54, 2.45, [[0.7, 1.75]]);

  // The stairs going down, seen through the stairwell, and the white railing (open at the top, west).
  for (let i = 0; i < 9; i++) {
    const x = hole.x0 + 0.12 + i * 0.19;
    room.box(0.19, 0.06, 1.0, WHITE, x, -0.2 - i * 0.18, 1.46);
    room.box(0.15, 0.012, 0.7, 0xc8b493, x, -0.165 - i * 0.18, 1.46);
  }
  room.box(hole.x1 - hole.x0, 0.02, hole.z1 - hole.z0, 0x2b2b2b, (hole.x0 + hole.x1) / 2, -1.9, (hole.z0 + hole.z1) / 2);
  // The stairwell's own walls, so the stairs below never stick out under the floor.
  const cx = (hole.x0 + hole.x1) / 2;
  const cz = (hole.z0 + hole.z1) / 2;
  room.box(hole.x1 - hole.x0, 1.95, 0.05, 0xeeeeea, cx, -0.98, hole.z0);
  room.box(hole.x1 - hole.x0, 1.95, 0.05, 0xeeeeea, cx, -0.98, hole.z1);
  room.box(0.05, 1.95, hole.z1 - hole.z0, 0xeeeeea, hole.x0, -0.98, cz);
  room.box(0.05, 1.95, hole.z1 - hole.z0, 0xeeeeea, hole.x1, -0.98, cz);
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const along = z0 === z1;
    room.box(along ? len + 0.06 : 0.06, 0.05, along ? 0.06 : len + 0.06, WHITE, (x0 + x1) / 2, 1.0, (z0 + z1) / 2);
    room.box(along ? len : 0.04, 0.04, along ? 0.04 : len, WHITE, (x0 + x1) / 2, 0.12, (z0 + z1) / 2);
    for (let s2 = 0; s2 <= len + 0.001; s2 += 0.13) room.box(0.03, 0.9, 0.03, WHITE, x0 + ((x1 - x0) * s2) / len, 0.55, z0 + ((z1 - z0) * s2) / len);
  };
  rail(hole.x0, hole.z0, hole.x1, hole.z0);
  rail(hole.x0, hole.z1, hole.x1, hole.z1);
  rail(hole.x1, hole.z0, hole.x1, hole.z1);
  room.cyl(0.006, 0.6, 0xffffff, 2.8, 2.4, 1.46);
  const shade = room.cyl(0.3, 0.32, 0xe6c38f, 2.8, 1.95, 1.46, { ...glow(0xffcf8a, 0.55), roughness: 1 });
  shade.castShadow = false;
  f.door(DOWNSTAIRS_KEY, 1.3, 1.45, 2.4, 1.45, 1.9);

  // The window with its wooden blinds and the radiator, on the street side of the landing.
  const win = f.wallAt(1.85, 2.45);
  const wk = kit(win, false);
  wk.box(1.2, 1.55, 0.06, WHITE, 1.85, 1.55, 2.42);
  wk.box(1.08, 1.43, 0.02, 0xdfeaf2, 1.85, 1.55, 2.39, glow(0xdfeaf2, 0.35));
  for (let i = 0; i < 18; i++) wk.box(1.08, 0.035, 0.03, 0xa9774a, 1.85, 0.88 + i * 0.075, 2.36);
  wk.box(1.2, 0.6, 0.08, WHITE, 1.85, 0.45, 2.38);
  for (let i = 0; i < 12; i++) wk.box(0.03, 0.56, 0.1, 0xe8e6e1, 1.3 + i * 0.1, 0.45, 2.33);
  // The sofa along the east wall with its mustard pillows; the hexagon lights over it; the ball.
  room.box(0.75, 0.4, 2.0, 0xd6cdbd, 5.15, 0.2, 1.35);
  room.box(0.2, 0.5, 2.0, 0xd6cdbd, 5.45, 0.55, 1.35);
  for (let i = 0; i < 5; i++) room.box(0.77, 0.01, 0.02, 0xbfb5a3, 5.15, 0.405, 0.45 + i * 0.45);
  for (const z of [0.7, 1.3]) {
    const pil = room.box(0.16, 0.5, 0.5, 0xc9a45c, 5.3, 0.68, z);
    pil.rotation.z = -0.25;
  }
  f.line(5.25, 0.45, 5.25, 2.3, 0.3);
  f.seat(4.95, 0.9, 0.42, -Math.PI / 2, 0.55);
  f.seat(4.95, 1.9, 0.42, -Math.PI / 2, 0.55);
  const east = f.wallAt(5.54, 1.3);
  for (const [z, y] of [[1.2, 2.0], [1.45, 1.78], [1.2, 1.56], [0.95, 1.78], [1.45, 1.34]]) {
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 6), new THREE.MeshStandardMaterial({ color: OAK, ...glow(0xffb45a, 0.35) }));
    hex.rotation.z = Math.PI / 2;
    hex.position.set(5.5, y, z);
    east.add(hex);
  }
  room.ball(0.3, 0x1b1b1b, 5.1, 0.3, 0.05, { roughness: 0.35 });
  f.block(5.1, 0.25, 0.3);
  // West wall of the landing: the door to the exercise room (its blue TV seen through it), prints, hooks.
  const west = f.wallAt(0.47, -0.6);
  const wst = kit(west, false);
  wst.box(0.04, 2.08, 0.98, 0x9aa3a8, 0.49, 1.04, -0.6);
  wst.box(0.02, 0.4, 0.7, 0x5aa7e8, 0.52, 1.55, -0.6, glow(0x5aa7e8, 1.1));
  f.door('practice', 0.95, -0.6, 0.9, -0.6, 2.45);
  const w2 = f.wallAt(0.75, 1.2);
  f.frame(w2, 0.42, 0.52, 0.78, 1.75, 1.0, Math.PI / 2, sunPrint());
  f.frame(w2, 0.42, 0.52, 0.78, 1.1, 1.0, Math.PI / 2, ringsPrint());
  for (let i = 0; i < 5; i++) {
    const peg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: OAK }));
    peg.position.set(0.82, 1.7 + (i % 2) * 0.05, 1.7 + i * 0.1);
    peg.rotation.y = 0.4;
    w2.add(peg);
  }

  // Treatment room 2: grey table, saddle stool, standing mirror, chart over the radiator, bookcase, chair.
  table(f, 2.7, -3.1, 0x4f5459);
  const stool = saddleStool();
  stool.position.set(3.95, 0, -2.4);
  stool.rotation.y = Math.PI / 2;
  f.group.add(stool);
  f.block(3.95, -2.4, 0.25);
  f.seat(3.95, -2.4, 0.62, -Math.PI / 2, 0.45);
  room.cyl(0.3, 0.04, 0xf2f2f2, 4.4, 0.02, -1.85);
  const mf = new THREE.Group();
  mf.position.set(4.4, 0, -1.85);
  mf.rotation.y = -Math.PI / 2 - 0.5;
  kit(mf).box(0.62, 1.66, 0.04, 0xf4f4f4, 0, 0.88, -0.03);
  f.glass(mf, 0.54, 1.58, 0, 0.88, 0, 0);
  f.group.add(mf);
  f.block(4.4, -1.85, 0.32);
  const north = f.wallAt(2.7, -4.84);
  const nk = kit(north, false);
  nk.box(1.3, 0.55, 0.08, WHITE, 3.3, 0.5, -4.79);
  for (let i = 0; i < 13; i++) nk.box(0.03, 0.5, 0.1, 0xe8e6e1, 2.7 + i * 0.1, 0.5, -4.74);
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
    };
    body(40);
    body(88);
  }, '#ffffff');
  f.frame(north, 0.5, 0.66, 2.1, 1.6, -4.81, 0, chart, BLACK);
  room.box(0.36, 1.9, 1.0, WHITE, 0.78, 0.95, -2.2);
  for (let r = 0; r < 4; r++) {
    room.box(0.32, 0.02, 0.94, 0xe9e7e2, 0.8, 0.35 + r * 0.45, -2.2);
    for (let b = 0; b < 6; b++) room.box(0.22, 0.28, 0.08, [0x2f6fc4, 0xc23a3a, 0x2f8a52, 0xd9a52c, 0x24211e, 0x7a4ab8][(b + r) % 6], 0.8, 0.51 + r * 0.45, -2.55 + b * 0.12);
  }
  f.block(0.8, -2.4, 0.3);
  f.block(0.8, -2.0, 0.3);
  chair(f, 1.3, -4.2, 0.4);
  f.block(3.5, -1.9, 0.36);
  room.cyl(0.02, 0.9, WHITE, 4.4, 0.45, -4.4);
  const fan = room.cyl(0.18, 0.06, 0xf4f4f4, 4.4, 0.95, -4.4);
  fan.rotation.x = Math.PI / 2;
  f.block(4.4, -4.4, 0.25);

  // The toilet: bowl and a little basin.
  room.box(0.4, 0.4, 0.55, WHITE, 5.25, 0.2, -0.85);
  room.box(0.4, 0.45, 0.16, WHITE, 5.45, 0.55, -0.85);
  room.box(0.35, 0.12, 0.3, WHITE, 5.35, 0.85, -0.05);
  f.block(5.25, -0.85, 0.3);
  // The little kitchen: counter with a sink along the street wall, a kettle, a fridge, yellow tiles.
  const kitchenTiles = new THREE.MeshStandardMaterial({ map: tiles('#efe2bd', 'rgba(170,150,110,.8)', 6, 2), roughness: 0.5 });
  f.panel(2.95, 4.02, 5.5, 4.02, kitchenTiles, 1.4, 0.0);
  room.box(2.0, 0.86, 0.6, WHITE, 4.4, 0.43, 3.7);
  room.box(2.04, 0.04, 0.64, 0xc9a77a, 4.4, 0.88, 3.7);
  room.box(0.45, 0.02, 0.35, CHROME, 4.0, 0.905, 3.7, { metalness: 0.8, roughness: 0.3 });
  room.cyl(0.08, 0.2, BLACK, 4.9, 1.0, 3.75);
  room.box(0.6, 1.4, 0.6, 0xf2f2f2, 3.2, 0.7, 3.7);
  f.line(3.2, 3.7, 5.3, 3.7, 0.35);

  return {
    key: UPSTAIRS_KEY,
    group: f.group,
    walls: f.walls,
    at: UP_AT,
    rect: f.rect,
    entries: {
      practice: { ...f.W(1.4, -0.55), face: Math.PI / 2 },
      [DOWNSTAIRS_KEY]: { ...f.W(1.3, 0.45), face: Math.PI },
    },
    entry: f.W(1.4, -0.55),
    face: Math.PI / 2,
    exit: f.W(1.3, 1.45),
    obstacles: f.obstacles,
    spots: f.spots,
    seats: f.seats,
    labels: f.labels,
    // The physiotherapist of treatment room 2 stands by the table, looking at whoever comes in.
    people: [{ who: 'treatment', at: f.W(3.5, -1.9), talkAt: f.W(2.65, -2.0), face: Math.atan2(2.65 - 3.5, -2.0 + 1.9) }],
  };
}

/**
 * Downstairs, after the scan: exercise room 2 with the stone walls and the mirror wall (the two old
 * rooms on the west side, now one), treatment room 1 with the marble and the long cabinet, the hall
 * with the stairs, the coat nook and waiting room 2 with the slatted wall.
 */
export function downstairs(): Floor {
  const F = floorMats();
  const f = planKit(DOWNSTAIRS_KEY, DOWN_AT, [
    { x0: -3.09, x1: 0.82, z0: -4.84, z1: -1.5, floor: F.rubber },
    { x0: -4.03, x1: -1.28, z0: -1.5, z1: 0.47, floor: F.rubber },
    { x0: -1.28, x1: 0.82, z0: -1.5, z1: -0.88, floor: F.rubber },
    { x0: 0.88, x1: 4.84, z0: -4.55, z1: -0.82, floor: F.marble },
    { x0: -1.28, x1: 3.6, z0: -0.82, z1: 0.76, floor: F.beige },
    { x0: 3.6, x1: 5.5, z0: -0.82, z1: 3.73, floor: F.beige },
    { x0: 0.93, x1: 3.6, z0: 0.76, z1: 2.1, floor: F.beige },
    { x0: -0.88, x1: 0.23, z0: 0.76, z1: 2.28, floor: F.beige },
    { x0: 1.1, x1: 3.6, z0: 2.1, z1: 3.73, floor: F.marble },
  ]);
  const { room } = f;
  const stone = new THREE.MeshStandardMaterial({ map: stones(3, 1.5), roughness: 0.95 });
  // Inner walls: the exercise room (mirror wall to the treatment room, door to the hall), the
  // treatment room's door, waiting room 2 (behind the stairs, door to the hall), the stairs' side.
  f.inner(0.85, -4.84, 0.85, -0.85);
  room.box(0.12, 1.5, 3.99, WHITE, 0.85, 1.85, -2.85);
  f.inner(-1.28, -0.85, 0.85, -0.85, [[0.3, 1.45]]);
  f.inner(-1.28, -0.85, -1.28, 0.47);
  f.inner(0.88, -0.82, 4.84, -0.82, [[1.6, 2.7]]);
  f.inner(1.1, 2.1, 3.6, 2.1);
  f.inner(0.93, 0.76, 3.6, 0.76);
  f.inner(3.6, 2.1, 3.6, 3.73, [[0.3, 1.4]]);

  // Exercise room 2: stone on its outer walls, the mirror wall, the rack, plants, ball, lamp, stool.
  f.panel(-3.07, -4.82, 0.8, -4.82, stone);
  f.panel(-3.07, -4.8, -3.07, -1.52, stone);
  f.panel(-4.01, -1.48, -4.01, 0.45, stone);
  for (const z of [-4.3, -3.1, -1.9]) room.box(0.03, 2.0, 0.05, BLACK, 0.78, 1.05, z);
  f.glass(f.group, 3.7, 1.9, 0.78, 1.05, -2.85, -Math.PI / 2);
  const pr = powerRack();
  pr.position.set(-2.2, 0, -3.95);
  f.group.add(pr);
  f.block(-2.2, -3.95, 0.95);
  for (const [x, sd] of [[-0.7, 5], [-0.05, 9]]) {
    const bp = bananaPlant(1.55, sd);
    bp.position.set(x, 0, -4.5);
    f.group.add(bp);
    f.block(x, -4.5, 0.32);
  }
  room.ball(0.33, 0x1d1d1d, -0.6, 0.33, -3.3, { roughness: 0.4 });
  f.block(-0.6, -3.3, 0.38);
  const matM = room.box(0.8, 0.012, 1.6, 0xf4f4f4, -2.9, 0.006, -0.6);
  matM.castShadow = false;
  for (const [dx, dz] of [[-0.18, 0], [0.12, 0.14], [0.12, -0.14]]) {
    const leg = room.box(0.025, 1.3, 0.025, OAK, -3.6 + dx * 0.5, 0.62, -1.1 + dz * 0.5);
    leg.rotation.z = -dx * 0.6;
    leg.rotation.x = dz * 0.6;
  }
  room.cyl(0.2, 0.3, 0xf4e6c4, -3.6, 1.38, -1.1, glow(0xffd99a, 0.8), 0.24);
  f.block(-3.6, -1.1, 0.3);
  room.cyl(0.22, 0.04, 0xd2ac6a, 0.35, 0.5, -1.2);
  for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [0, 0.15]]) room.box(0.03, 0.5, 0.03, 0xd2ac6a, 0.35 + dx, 0.25, -1.2 + dz);
  f.block(0.35, -1.2, 0.25);
  f.seat(0.35, -1.2, 0.5, -Math.PI / 2, 0.45);

  // Treatment room 1: the long cabinet with the black marble top along the north wall, the bowl, prints
  // over a warm light strip, the infrared panel, the table on its rug, the desk, the mirror.
  room.box(3.5, 0.82, 0.5, WHITE, 2.85, 0.41, -4.25);
  room.box(3.6, 0.05, 0.56, 0x18181a, 2.85, 0.845, -4.25, { roughness: 0.12, metalness: 0.2 });
  room.box(0.32, 0.82, 0.52, 0xffffff, 2.85, 0.41, -4.25, { map: stones(1, 2), roughness: 0.95 });
  const bowl = room.ball(0.17, 0xffffff, 2.85, 0.87, -4.25, { roughness: 0.2 });
  bowl.scale.y = 0.5;
  room.cyl(0.015, 0.3, CHROME, 2.85, 1.02, -4.42, { metalness: 0.9, roughness: 0.2 });
  const tn = f.wallAt(2.85, -4.55);
  kit(tn, false).box(3.4, 0.04, 0.03, 0xffd28a, 2.85, 1.12, -4.52, glow(0xffc670, 1.4));
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
    }),
    joint((g) => {
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.ellipse(64, 30 + i * 12, 7, 4, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }),
  ];
  prints.forEach((tex, i) => f.frame(tn, 0.46, 0.58, 1.55 + i * 1.3, 1.6, -4.52, 0, tex, 0xb89a74));
  const pot = monstera(0.62, 0x2b2b2b, 7);
  pot.position.set(1.35, 0.87, -4.25);
  f.group.add(pot);
  plant(f.group, 3.5, 0.87, -4.25, 6, 0.12, 0.35, 0.12);
  const ir = room.box(0.6, 0.74, 0.03, 0xf4f4f4, 4.35, 1.3, -4.15);
  ir.rotation.y = -0.4;
  f.line(1.1, -4.25, 4.6, -4.25, 0.3);
  const rug = room.box(2.6, 0.012, 1.5, 0xb7a993, 2.2, 0.006, -2.6, { roughness: 1 });
  rug.castShadow = false;
  table(f, 2.2, -2.6, 0xd7c6ad, 0xc9cbcc);
  room.box(0.6, 0.05, 0.68, 0xfafafa, 2.85, 0.78, -2.6);
  room.box(0.72, 0.04, 1.3, WHITE, 4.4, 0.74, -2.1);
  for (const [dx, dz] of [[-0.3, -0.6], [0.3, -0.6], [-0.3, 0.6], [0.3, 0.6]]) room.box(0.04, 0.72, 0.04, WHITE, 4.4 + dx, 0.37, -2.1 + dz);
  room.box(0.05, 0.36, 0.58, BLACK, 4.7, 1.12, -2.1);
  room.box(0.02, 0.32, 0.53, 0x3a6fb0, 4.67, 1.12, -2.1, glow(0x3a6fb0, 0.6));
  f.block(4.4, -2.4, 0.4);
  f.block(4.4, -1.8, 0.4);
  chair(f, 3.75, -1.6, Math.PI / 2);
  room.box(0.03, 1.9, 0.8, 0xf4f4f4, 0.92, 1.05, -3.4);
  f.glass(f.group, 0.72, 1.82, 0.95, 1.05, -3.4, Math.PI / 2);

  // The hall: the stairs going up westward from the foot on the hall's east side, and the coat nook.
  for (let i = 0; i < 12; i++) {
    const x = 3.49 - i * 0.215;
    const h = 0.2 + i * 0.2;
    room.box(0.215, h, 1.2, WHITE, x, h / 2, 1.43);
    room.box(0.17, 0.012, 0.8, 0xc8b493, x, h + 0.006, 1.43);
  }
  for (let x = 1.1; x < 3.45; x += 0.25) for (const z of [0.95, 1.25, 1.55, 1.85]) f.block(x, z, 0.15);
  f.door(UPSTAIRS_KEY, 3.95, 1.45, 2.6, 1.45, 2.0);
  const nook = f.wallAt(-0.88, 1.5);
  for (let i = 0; i < 5; i++) {
    const peg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), new THREE.MeshStandardMaterial({ color: OAK }));
    peg.position.set(-0.84, 1.7, 1.0 + i * 0.25);
    nook.add(peg);
  }
  room.box(0.4, 0.42, 1.2, OAK, -0.65, 0.21, 1.6);
  f.block(-0.65, 1.6, 0.35);
  f.seat(-0.6, 1.6, 0.42, Math.PI / 2, 0.5);
  // The moss wall in the hall, and two white chairs by the east wall. (The way in from the quay is
  // the street door of the exercise room, upstairs on the quay side.)
  const moss = painted(64, 64, (g) => {
    g.fillStyle = '#2d5a26';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = ['#3f7a33', '#25481f', '#57913f'][Math.floor(rnd() * 3)];
      g.fillRect(rnd() * 64, rnd() * 64, 3, 3);
    }
  }, [2, 3]);
  f.panel(5.48, 2.2, 5.48, 3.3, new THREE.MeshStandardMaterial(moss ? { map: moss, roughness: 1 } : { color: 0x2d5a26 }), 1.8, 0.5);
  chair(f, 5.1, 0.4, -Math.PI / 2);
  chair(f, 5.1, 1.2, -Math.PI / 2);
  // Waiting room 2: marble, the slatted wall (walnut squares on black, turned every other way).
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 2; r++) {
      const x = 1.55 + c * 0.72;
      const y = 0.4 + r * 0.72;
      room.box(0.7, 0.7, 0.03, 0x161616, x, y, 2.17);
      const upright = (r + c) % 2 === 0;
      for (let i = 0; i < 9; i++) {
        if (upright) room.box(0.045, 0.68, 0.04, WALNUT, x - 0.31 + i * 0.077, y, 2.2);
        else room.box(0.68, 0.045, 0.04, WALNUT, x, y - 0.31 + i * 0.077, 2.2);
      }
    }
  }
  room.box(2.2, 0.1, 0.05, 0x161616, 2.27, 1.17, 2.2);
  chair(f, 1.5, 3.25, Math.PI * 0.85);
  chair(f, 2.3, 3.3, Math.PI);
  const house = realPlant(1.0);
  house.position.set(3.25, 0, 3.4);
  f.group.add(house);
  f.block(3.25, 3.4, 0.33);

  return {
    key: DOWNSTAIRS_KEY,
    group: f.group,
    walls: f.walls,
    at: DOWN_AT,
    rect: f.rect,
    entries: { [UPSTAIRS_KEY]: { ...f.W(4.4, 0.3), face: -Math.PI / 2 } },
    entry: f.W(4.4, 0.3),
    face: Math.PI / 2,
    exit: f.W(3.95, 1.45),
    obstacles: f.obstacles,
    spots: f.spots,
    seats: f.seats,
    labels: f.labels,
  };
}
