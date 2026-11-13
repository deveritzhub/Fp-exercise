/**
 * Tap-to-walk on the village ground: pure maths, so it is tested without WebGL.
 * The ground is the x/z plane; obstacles are circles; the island is a circle around the origin.
 */

export type Vec = { x: number; z: number };
export type Obstacle = Vec & { r: number };

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);

/** A point the hero can stand on: outside every obstacle and on the island. */
export function reachable(p: Vec, obstacles: readonly Obstacle[], bound: number): Vec {
  let { x, z } = p;
  for (let pass = 0; pass < 3; pass++) {
    for (const o of obstacles) {
      const d = Math.hypot(x - o.x, z - o.z);
      if (d < o.r + 0.01) {
        const ux = d > 1e-4 ? (x - o.x) / d : 1;
        const uz = d > 1e-4 ? (z - o.z) / d : 0;
        x = o.x + ux * (o.r + 0.02);
        z = o.z + uz * (o.r + 0.02);
      }
    }
    const r = Math.hypot(x, z);
    if (r > bound) {
      x = (x / r) * bound;
      z = (z / r) * bound;
    }
  }
  return { x, z };
}

/**
 * One step of `step` length from `pos` toward `target`. The hero slides around an obstacle in
 * the way instead of stopping in front of it.
 */
export function stepToward(pos: Vec, target: Vec, step: number, obstacles: readonly Obstacle[], bound: number): Vec & { arrived: boolean } {
  const left = dist(pos, target);
  if (left <= step) return { ...target, arrived: true };
  let x = pos.x + ((target.x - pos.x) / left) * step;
  let z = pos.z + ((target.z - pos.z) / left) * step;
  for (const o of obstacles) {
    const d = Math.hypot(x - o.x, z - o.z);
    if (d >= o.r) continue;
    const ux = d > 1e-4 ? (x - o.x) / d : 1;
    const uz = d > 1e-4 ? (z - o.z) / d : 0;
    // Out to the rim, then along it on the side the target is on.
    const side = ux * (target.z - o.z) - uz * (target.x - o.x) >= 0 ? 1 : -1;
    x = o.x + ux * o.r - uz * side * step * 0.6;
    z = o.z + uz * o.r + ux * side * step * 0.6;
  }
  const r = Math.hypot(x, z);
  if (r > bound) {
    x = (x / r) * bound;
    z = (z / r) * bound;
  }
  return { x, z, arrived: false };
}

/** Where things stand in the walkable village. Angles in degrees: 0 = east, 270 = north (away from the camera). */
export const VILLAGE_LAYOUT = {
  bound: 12.2,
  /** Building slots around the square; the gym with the TV has the north side. */
  slots: [195, 345, 232, 308, 150, 30],
  ring: 6.6,
  gym: { x: 0, z: -8.2 },
  spawn: { x: 0, z: 2.4 },
} as const;

export function slotPosition(i: number): Vec & { door: Vec } {
  const a = (VILLAGE_LAYOUT.slots[i % VILLAGE_LAYOUT.slots.length] * Math.PI) / 180;
  const x = Math.cos(a) * VILLAGE_LAYOUT.ring;
  const z = Math.sin(a) * VILLAGE_LAYOUT.ring;
  const k = (VILLAGE_LAYOUT.ring - 2.1) / VILLAGE_LAYOUT.ring;
  return { x, z, door: { x: x * k, z: z * k } };
}

export type Site = Vec & { door: Vec };
/** A building at `deg` degrees and `ring` units from the square; its door faces the square. */
export function siteAt(deg: number, ring: number): Site {
  const a = (deg * Math.PI) / 180;
  const k = (ring - 2.1) / ring;
  return { x: Math.cos(a) * ring, z: Math.sin(a) * ring, door: { x: Math.cos(a) * ring * k, z: Math.sin(a) * ring * k } };
}
/** The strength and mobility houses stand further out, west and east of the square. */
export const MODULE_SITES = { kracht: siteAt(172, 10.3), mobiliteit: siteAt(8, 10.3) } as const;

/** The spot within `range` of the hero, nearest first. */
export function nearestSpot<T extends { door: Vec }>(pos: Vec, spots: readonly T[], range = 1.5): T | null {
  let best: T | null = null;
  let bd = range;
  for (const s of spots) {
    const d = dist(pos, s.door);
    if (d <= bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

export type Rect = { x0: number; x1: number; z0: number; z1: number };
/** Keep a point inside a room. */
export function clampRect<T extends Vec>(p: T, r: Rect): T {
  return { ...p, x: Math.min(r.x1, Math.max(r.x0, p.x)), z: Math.min(r.z1, Math.max(r.z0, p.z)) };
}

export type Area = { bound: number } | { rect: Rect };

/**
 * A way from `from` to `to` around the obstacles: straight when nothing is in between, otherwise the
 * shortest route over a fine grid, pulled tight into a few corner points. Sliding along one obstacle
 * is not enough in a village: two that touch form a pocket the hero would never leave.
 */
export function findPath(from: Vec, to: Vec, obstacles: readonly Obstacle[], area: Area, cell = 0.4): Vec[] {
  const inArea = (x: number, z: number) => ('rect' in area ? x >= area.rect.x0 && x <= area.rect.x1 && z >= area.rect.z0 && z <= area.rect.z1 : Math.hypot(x, z) <= area.bound + 0.01);
  const free = (x: number, z: number) => inArea(x, z) && obstacles.every((o) => Math.hypot(x - o.x, z - o.z) >= o.r - 0.02);
  const clear = (a: Vec, b: Vec) => {
    const n = Math.max(1, Math.ceil(dist(a, b) / 0.12));
    for (let i = 1; i < n; i++) if (!free(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n)) return false;
    return true;
  };
  if (clear(from, to)) return [to];
  const x0 = 'rect' in area ? area.rect.x0 : -area.bound;
  const z0 = 'rect' in area ? area.rect.z0 : -area.bound;
  const w = Math.ceil((('rect' in area ? area.rect.x1 : area.bound) - x0) / cell) + 1;
  const h = Math.ceil((('rect' in area ? area.rect.z1 : area.bound) - z0) / cell) + 1;
  const px = (i: number) => x0 + (i % w) * cell;
  const pz = (i: number) => z0 + Math.floor(i / w) * cell;
  const open = new Uint8Array(w * h);
  // A little clear of every obstacle, so the hero does not brush along them.
  for (let i = 0; i < w * h; i++) open[i] = inArea(px(i), pz(i)) && obstacles.every((o) => Math.hypot(px(i) - o.x, pz(i) - o.z) >= o.r + 0.12) ? 1 : 0;
  const nearest = (p: Vec, mustBeOpen: boolean) => {
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < w * h; i++) {
      if (mustBeOpen && !open[i]) continue;
      const d = Math.hypot(px(i) - p.x, pz(i) - p.z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  const start = nearest(from, true);
  const goal = nearest(to, true);
  if (start < 0 || goal < 0) return [to];
  const cost = new Float32Array(w * h).fill(Infinity);
  const prev = new Int32Array(w * h).fill(-1);
  const done = new Uint8Array(w * h);
  cost[start] = 0;
  const queue = [start];
  const est = (i: number) => Math.hypot(px(i) - px(goal), pz(i) - pz(goal));
  while (queue.length) {
    let qi = 0;
    for (let k = 1; k < queue.length; k++) if (cost[queue[k]] + est(queue[k]) < cost[queue[qi]] + est(queue[qi])) qi = k;
    const cur = queue.splice(qi, 1)[0];
    if (cur === goal) break;
    if (done[cur]) continue;
    done[cur] = 1;
    const cx = cur % w;
    const cz = Math.floor(cur / w);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
        const ni = nz * w + nx;
        // No cutting a corner between two blocked cells.
        if (!open[ni] || done[ni] || (dx && dz && (!open[cz * w + nx] || !open[nz * w + cx]))) continue;
        const c = cost[cur] + (dx && dz ? 1.4142 : 1) * cell;
        if (c < cost[ni]) {
          cost[ni] = c;
          prev[ni] = cur;
          queue.push(ni);
        }
      }
    }
  }
  if (prev[goal] < 0 && goal !== start) return [to];
  const cells: Vec[] = [];
  for (let i = goal; i >= 0; i = prev[i]) cells.unshift({ x: px(i), z: pz(i) });
  cells.push(to);
  // Pull the route tight: from each point, go straight to the furthest one in sight.
  const out: Vec[] = [];
  let at: Vec = from;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clear(at, cells[j])) j--;
    out.push(cells[j]);
    at = cells[j];
    i = j + 1;
  }
  return out;
}
