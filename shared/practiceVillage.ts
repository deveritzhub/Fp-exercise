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
