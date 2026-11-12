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
