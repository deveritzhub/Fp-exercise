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
