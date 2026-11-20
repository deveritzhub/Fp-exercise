import { CREATURES, isAlpha, isHarvest, type CreatureKind, type LootKey } from './adventure';

/**
 * The crypts under the village: a new one every time, made from a seed. Rooms joined by corridors,
 * creatures in most rooms, a chest or two, and a boss in the room furthest from the stairs. The
 * deeper, the stronger. Friends going down together use the same seed, so they share one crypt.
 * Measures in metres, relative to the crypt's middle; the stairs up are in the first room.
 */
export const CRYPT_KEY = 'crypt';
/** Each level down asks a higher adventure level. */
export const cryptLevel = (depth: number) => 3 + (Math.max(1, Math.floor(depth)) - 1) * 2;
export const CRYPT_MAX_DEPTH = 12;

export type Rect = { x0: number; x1: number; z0: number; z1: number };
export type CryptRoom = Rect & { kind: 'start' | 'fight' | 'treasure' | 'boss' };
export type Crypt = {
  seed: number;
  depth: number;
  rooms: CryptRoom[];
  corridors: Rect[];
  mobs: { kind: CreatureKind; x: number; z: number }[];
  chests: { x: number; z: number }[];
  boss: { kind: CreatureKind; x: number; z: number };
  entry: { x: number; z: number };
};

/** A small seeded random (the same seed gives the same crypt everywhere). */
function random(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The creatures that live at a depth: fighters up to its level, not the very weakest further down. */
export function cryptPool(depth: number): CreatureKind[] {
  const lvl = cryptLevel(depth);
  return (Object.keys(CREATURES) as CreatureKind[]).filter((k) => !isHarvest(k) && !isAlpha(k) && k !== 'chicken' && CREATURES[k].level <= lvl && CREATURES[k].level >= lvl - 7);
}
/** The boss at a depth: the strongest that fits it (the Alpha boar, wolf and bear in turn on the way down). */
export function cryptBoss(depth: number): CreatureKind {
  const lvl = cryptLevel(depth);
  const order: CreatureKind[] = ['giant_slime', 'couch_king', 'alpha_boar', 'rage', 'craving', 'alpha_wolf', 'fright', 'sorrow', 'alpha_bear', 'apathy', 'guilt', 'shame_lord'];
  const fits = order.filter((k) => (isAlpha(k) ? (k === 'alpha_boar' ? 7 : k === 'alpha_wolf' ? 11 : k === 'shame_lord' ? 21 : 13) : CREATURES[k].level) <= lvl);
  return fits[fits.length - 1] ?? 'giant_slime';
}

const CELL = 12;

export function buildCrypt(seed: number, depth: number): Crypt {
  const rnd = random(seed * 31 + depth);
  const count = 5 + Math.min(4, Math.floor(depth / 2));
  // A walk over a grid of cells: each new room next to one already there.
  const cells: { gx: number; gz: number; from: number }[] = [{ gx: 0, gz: 0, from: -1 }];
  const taken = new Set(['0,0']);
  for (let guard = 0; cells.length < count && guard < 400; guard++) {
    // Mostly onward from the newest room (long crypts), sometimes a side room.
    const fromIdx = rnd() < 0.7 ? cells.length - 1 : Math.floor(rnd() * cells.length);
    const from = cells[fromIdx];
    const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
    const gx = from.gx + dir[0];
    const gz = from.gz + dir[1];
    if (taken.has(`${gx},${gz}`)) continue;
    taken.add(`${gx},${gz}`);
    cells.push({ gx, gz, from: fromIdx });
  }
  // Centre the crypt on its middle.
  const mx = (Math.min(...cells.map((c) => c.gx)) + Math.max(...cells.map((c) => c.gx))) / 2;
  const mz = (Math.min(...cells.map((c) => c.gz)) + Math.max(...cells.map((c) => c.gz))) / 2;
  const centre = (c: { gx: number; gz: number }) => ({ x: (c.gx - mx) * CELL, z: (c.gz - mz) * CELL });
  // How far each room lies from the stairs (along the corridors): the furthest holds the boss.
  const dist = cells.map(() => 0);
  cells.forEach((c, i) => { if (i > 0) dist[i] = dist[c.from] + 1; });
  let bossAt = 0;
  dist.forEach((d, i) => { if (d > dist[bossAt]) bossAt = i; });
  const treasure = new Set<number>();
  const spare = cells.map((_, i) => i).filter((i) => i !== 0 && i !== bossAt);
  for (let k = 0; k < Math.min(spare.length, 1 + (depth > 2 ? 1 : 0)); k++) treasure.add(spare.splice(Math.floor(rnd() * spare.length), 1)[0]);

  const rooms: CryptRoom[] = cells.map((c, i) => {
    const { x, z } = centre(c);
    const big = i === bossAt ? 4.6 : 3.2 + rnd() * 1.2;
    const deep = i === bossAt ? 4.6 : 3.2 + rnd() * 1.2;
    return { x0: x - big, x1: x + big, z0: z - deep, z1: z + deep, kind: i === 0 ? 'start' : i === bossAt ? 'boss' : treasure.has(i) ? 'treasure' : 'fight' };
  });
  // Corridors: straight, 2.4 m wide, from each room to the one it grew from.
  const corridors: Rect[] = cells.slice(1).map((c) => {
    const a = centre(cells[c.from]);
    const b = centre(c);
    const w = 1.2;
    return a.x === b.x
      ? { x0: a.x - w, x1: a.x + w, z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) }
      : { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: a.z - w, z1: a.z + w };
  });

  const pool = cryptPool(depth);
  const mobs: Crypt['mobs'] = [];
  const chests: Crypt['chests'] = [];
  rooms.forEach((r, i) => {
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    if (r.kind === 'fight') {
      const n = 2 + (rnd() < 0.3 + depth * 0.05 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd();
        mobs.push({ kind: pool[Math.floor(rnd() * pool.length)] ?? 'slime', x: cx + Math.cos(a) * 1.7, z: cz + Math.sin(a) * 1.7 });
      }
    } else if (r.kind === 'treasure') {
      chests.push({ x: cx, z: cz });
      // A guard by the chest.
      mobs.push({ kind: pool[Math.floor(rnd() * pool.length)] ?? 'slime', x: cx + 1.8, z: cz });
    }
    void i;
  });
  const br = rooms[bossAt];
  const start = rooms[0];
  return {
    seed,
    depth,
    rooms,
    corridors,
    mobs,
    chests,
    boss: { kind: cryptBoss(depth), x: (br.x0 + br.x1) / 2, z: (br.z0 + br.z1) / 2 },
    entry: { x: (start.x0 + start.x1) / 2, z: (start.z0 + start.z1) / 2 + 1 },
  };
}

/** What a chest holds at a depth, and what beating the boss gives. */
export const cryptChest = (depth: number) => ({ coins: 6 + depth * 4, loot: (['bone', 'hide', 'gel', 'stone', 'wood', 'feather'] as LootKey[]).slice(0, 2 + Math.min(4, depth)) });
export const cryptClear = (depth: number) => ({ xp: 50 + depth * 40, coins: 15 + depth * 10 });
