import { describe, expect, it } from 'vitest';
import { findPath, nearestSpot, reachable, slotPosition, stepToward, VILLAGE_LAYOUT, type Obstacle, type Vec } from './walk';

const walk = (from: Vec, to: Vec, obstacles: Obstacle[], bound = 12) => {
  let p = { ...from };
  const target = reachable(to, obstacles, bound);
  for (let i = 0; i < 2000; i++) {
    const n = stepToward(p, target, 0.06, obstacles, bound);
    p = { x: n.x, z: n.z };
    for (const o of obstacles) expect(Math.hypot(p.x - o.x, p.z - o.z)).toBeGreaterThan(o.r - 0.05);
    if (n.arrived) return { p, steps: i + 1 };
  }
  return { p, steps: -1 };
};

describe('walking in the village', () => {
  it('walks straight to a free target', () => {
    const { p, steps } = walk({ x: 0, z: 0 }, { x: 3, z: 4 }, []);
    expect(p).toEqual({ x: 3, z: 4 });
    expect(steps).toBeLessThan(90);
  });

  it('slides around an obstacle that is exactly in the way', () => {
    const { p, steps } = walk({ x: -4, z: 0 }, { x: 4, z: 0 }, [{ x: 0, z: 0, r: 1.5 }]);
    expect(steps).toBeGreaterThan(0);
    expect(p.x).toBeCloseTo(4);
    expect(p.z).toBeCloseTo(0);
  });

  it('stops at the rim when the target is inside a building or off the island', () => {
    const house = { x: 5, z: 0, r: 1.5 };
    const inHouse = walk({ x: 0, z: 0 }, { x: 5, z: 0.2 }, [house]);
    expect(inHouse.steps).toBeGreaterThan(0);
    expect(Math.hypot(inHouse.p.x - 5, inHouse.p.z)).toBeGreaterThanOrEqual(1.5);
    const sea = walk({ x: 0, z: 0 }, { x: 40, z: 0 }, [], 12);
    expect(sea.p.x).toBeCloseTo(12);
  });

  it('gives every building a door on the island, apart from the others and from the gym', () => {
    const doors = VILLAGE_LAYOUT.slots.map((_, i) => slotPosition(i));
    doors.forEach((a, i) => {
      expect(Math.hypot(a.door.x, a.door.z)).toBeLessThan(VILLAGE_LAYOUT.bound);
      expect(Math.hypot(a.x - VILLAGE_LAYOUT.gym.x, a.z - VILLAGE_LAYOUT.gym.z)).toBeGreaterThan(4);
      doors.forEach((b, j) => {
        if (i !== j) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(3.2);
      });
    });
  });

  it('finds a way round obstacles that touch and form a pocket', () => {
    // A wall of touching circles across the direct line, open only at the far south end.
    const wall: Obstacle[] = [-3, -1.5, 0, 1.5, 3].map((z) => ({ x: 0, z, r: 1 }));
    const from = { x: -4, z: 0 };
    const to = { x: 4, z: 0 };
    expect(findPath(from, to, [], { bound: 12 })).toEqual([to]);
    const path = findPath(from, to, wall, { bound: 12 });
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual(to);
    let p = from;
    for (const corner of path) {
      for (let i = 0; i <= 20; i++) {
        const x = p.x + ((corner.x - p.x) * i) / 20;
        const z = p.z + ((corner.z - p.z) * i) / 20;
        for (const o of wall) expect(Math.hypot(x - o.x, z - o.z)).toBeGreaterThan(o.r - 0.05);
        expect(Math.hypot(x, z)).toBeLessThanOrEqual(12.05);
      }
      p = corner;
    }
  });

  it('finds a way inside a room', () => {
    const rect = { x0: -3, x1: 3, z0: -2, z1: 2 };
    const path = findPath({ x: -2.5, z: 0 }, { x: 2.5, z: 0 }, [{ x: 0, z: 0, r: 1 }], { rect });
    expect(path.length).toBeGreaterThan(1);
    for (const c of path) expect(Math.abs(c.z)).toBeLessThanOrEqual(2);
  });

  it('finds the nearest spot only within range', () => {
    const spots = [{ key: 'a', door: { x: 0, z: 0 } }, { key: 'b', door: { x: 1, z: 0 } }];
    expect(nearestSpot({ x: 0.8, z: 0 }, spots)?.key).toBe('b');
    expect(nearestSpot({ x: 9, z: 9 }, spots)).toBeNull();
  });
});
