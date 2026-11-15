import { BERRIES_FOR, type LootKey } from './adventure';

/**
 * The practice village on the staff side: one home per patient, growing with the hero's level from a
 * camp to a villa. A home carries a number, never a name: the scene can be on a screen others see.
 */
export const HOME_STAGES = [
  { key: 'camp', from: 1, nl: 'Kamp', en: 'Camp' },
  { key: 'hut', from: 2, nl: 'Hut', en: 'Hut' },
  { key: 'cottage', from: 4, nl: 'Huisje', en: 'Cottage' },
  { key: 'house', from: 7, nl: 'Woonhuis', en: 'House' },
  { key: 'manor', from: 11, nl: 'Landhuis', en: 'Manor' },
  { key: 'villa', from: 16, nl: 'Villa', en: 'Villa' },
] as const;
export type HomeStage = (typeof HOME_STAGES)[number]['key'];

/** Stage index (0 = camp … 5 = villa) for a hero level. */
export function homeStage(level: number): number {
  let i = 0;
  HOME_STAGES.forEach((s, k) => {
    if (level >= s.from) i = k;
  });
  return i;
}

/**
 * What it takes to build each home, in loot from the village: wood from oaks, stone from rocks, and
 * from the bigger homes on also what creatures drop. The level still has to allow the home first.
 * Index = the stage that is built (the camp is where everyone starts).
 */
export const HOME_COSTS: Partial<Record<LootKey, number>>[] = [
  {},
  { wood: 6, stone: 2 },
  { wood: 12, stone: 6, hide: 2 },
  { wood: 20, stone: 14, hide: 4, bone: 4 },
  { wood: 30, stone: 24, tusk: 3, crown: 1 },
  { wood: 45, stone: 35, alpha_tusk: 1, crown: 2 },
];

export type NextHome = {
  stage: number;
  cost: Partial<Record<LootKey, number>>;
  levelOk: boolean;
  ready: boolean;
  /** What is still short after berries stood in for animal loot. */
  missing: Partial<Record<LootKey, number>>;
  /** What will be handed in: the loot itself, with berries where animal loot is short. */
  pay: Partial<Record<LootKey, number>>;
};
/**
 * The next home after `built`: what it costs, what is still missing, and whether it can be built now.
 * Animal loot that is short is paid with berries (BERRIES_FOR), so a home never needs hunting.
 */
export function nextHome(built: number, level: number, loot: Partial<Record<LootKey, number>>): NextHome | null {
  const stage = built + 1;
  if (stage >= HOME_STAGES.length) return null;
  const cost = HOME_COSTS[stage];
  const missing: Partial<Record<LootKey, number>> = {};
  const pay: Partial<Record<LootKey, number>> = {};
  let berries = loot.berries ?? 0;
  for (const [k, n] of Object.entries(cost) as [LootKey, number][]) {
    const have = Math.min(n, loot[k] ?? 0);
    if (have > 0) pay[k] = have;
    let short = n - have;
    const rate = BERRIES_FOR[k];
    if (short > 0 && rate) {
      const covered = Math.min(short, Math.floor(berries / rate));
      if (covered > 0) {
        berries -= covered * rate;
        pay.berries = (pay.berries ?? 0) + covered * rate;
        short -= covered;
      }
    }
    if (short > 0) missing[k] = short;
  }
  const levelOk = level >= HOME_STAGES[stage].from;
  return { stage, cost, levelOk, ready: levelOk && Object.keys(missing).length === 0, missing, pay };
}

/** Levels still to go until the next kind of home; null at the villa. */
export function levelsToNextHome(level: number): number | null {
  const next = HOME_STAGES[homeStage(level) + 1];
  return next ? next.from - Math.max(1, level) : null;
}

export type VillageHome = {
  /** Patient id, for the link to the record. The scene shows `no`, never a name. */
  id: string;
  no: number;
  level: number;
  /** 0–1 on the way to the next level. */
  progress: number;
  /** Workouts finished in the last seven days. */
  week: number;
  /** Only when the member asked for names; never part of the default answer. */
  name?: string;
};

/** Plots in rings round the square: the first eight close by, then wider rings. */
export function plotPosition(i: number): { x: number; z: number } {
  let ring = 0;
  let left = i;
  let size = 8;
  while (left >= size) {
    left -= size;
    ring++;
    size = 8 + ring * 6;
  }
  const r = 11.5 + ring * 7.5;
  // Leave the south open: that is where the camera looks in from.
  const a = Math.PI * (0.62 + (1.76 * (left + 0.5)) / size) + (ring % 2 ? 0.08 : 0);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

/**
 * The street of homes in the village the therapist walks through: six homes round the square and
 * twelve on a ring road behind them. More patients than that live in a next neighbourhood.
 */
export const STREET_SIZE = 18;
export const STREET_BOUND = 21.5;
const STREET_INNER = [18, 54, 126, 162, 206, 334];
const STREET_OUTER = [304, 328, 352, 16, 40, 64, 116, 140, 164, 188, 212, 236];
export const STREET_RING = { inner: 8.8, outer: 16.5, road: 12.4 } as const;
/** Where home `i` of a neighbourhood stands: degrees round the square (0 = east, 270 = north) and distance from it. */
export function streetPlot(i: number): { deg: number; ring: number } {
  const k = ((i % STREET_SIZE) + STREET_SIZE) % STREET_SIZE;
  return k < STREET_INNER.length ? { deg: STREET_INNER[k], ring: STREET_RING.inner } : { deg: STREET_OUTER[k - STREET_INNER.length], ring: STREET_RING.outer };
}
