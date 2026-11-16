import type { Site, Vec } from './walk';

/**
 * The patient's village laid out as a town, after the drawn town plan: a square with the well in the
 * middle, the practice in the north, districts round it (training north-west, crafts west, wellbeing
 * north-east, market east, homes south-west, stables and the park south-east), four main roads from
 * the square, a wall with towers and a gate in the south.
 *
 * Units are metres in the 3D village: x to the east, z to the south (north is away from the camera).
 * The therapist's village of homes does not use this: it keeps its own streets.
 */

/** A building that stands here, its door on the side that faces the square. */
export function placeAt(x: number, z: number, step = 2.1): Site {
  const len = Math.hypot(x, z) || 1;
  return { x, z, door: { x: x - (x / len) * step, z: z - (z / len) * step } };
}

export const TOWN = {
  /** How far the hero can walk from the square: through the gates out into the hunting grounds. */
  bound: 46,
  /** The square round the well. */
  square: 5.4,
  wall: 30.5,
  /** The gates in the wall, in degrees (0 = east, 90 = south). */
  gates: [0, 90, 180, 270],
} as const;

/** Where the buildings with a function stand. */
export const SITES = {
  hall: placeAt(-6.6, -11.8),
  board: placeAt(6.6, -11.8),
  dojo: placeAt(-14.5, -15),
  kracht: placeAt(-21.5, -6.5),
  smithy: placeAt(-13, -7.8),
  library: placeAt(8.6, -6.8),
  mobiliteit: placeAt(15.5, -4.8),
  guild: placeAt(-9.6, 3.8),
} as const;

/** Spots that are not a building. */
export const SPOTS = {
  /** The arena in the training district: the boxing school. */
  boxing: { x: -21.5, z: -14 } as Vec,
  /** The campfire on the way to the stables. */
  camp: { x: 6.4, z: 9.2 } as Vec,
  /** Your own home, south of the square near the park. */
  home: { x: 5.4, z: 20.5 } as Vec,
  /** The meadow (manege) with the cows and chickens. */
  meadow: { x: 18.4, z: 12.6 } as Vec,
  meadowR: 3.6,
  /** The pond in the park, where the slimes live. */
  pond: { x: 13.6, z: 21.5 } as Vec,
} as const;

/**
 * The other buildings of the town plan. Most open a part of the app; `soon` ones are closed for now
 * (a later part of the town). `look` picks the roof colour.
 */
export type TownHouse = { key: string; nl: string; en: string; at: Vec; to?: string; roof: number; soon?: boolean; scale?: number };
export const TOWN_HOUSES: TownHouse[] = [
  // Crafts, west.
  { key: 'weaponshop', nl: 'Wapenwinkel', en: 'Weapon shop', at: { x: -22, z: 3.8 }, to: '/p/held/inventaris#backpack-title', roof: 0x8a3a2a },
  { key: 'armourer', nl: 'Pantsermaker', en: 'Armourer', at: { x: -15.5, z: 4.6 }, to: '/p/held/inventaris#gear-title', roof: 0x5c6a7a },
  { key: 'tailor', nl: 'Kleermaker', en: 'Tailor', at: { x: -14.5, z: 10.5 }, to: '/p/held/uiterlijk', roof: 0x9a4a6a },
  { key: 'workshop', nl: 'Werkplaats', en: 'Workshop', at: { x: -23.5, z: 9 }, to: '/p/held/inventaris#craft-title', roof: 0x3d5a8a },
  { key: 'carpenter', nl: 'Timmerwerkplaats', en: 'Carpenter', at: { x: -19.5, z: 14.5 }, to: '/p/held/inventaris#craft-title', roof: 0xa0522d },
  // Wellbeing, north-east.
  { key: 'rehab', nl: 'Revalidatiecentrum', en: 'Rehab centre', at: { x: 13.5, z: -15 }, to: '/p/revalidatie', roof: 0x3d6a8a, scale: 1.15 },
  { key: 'healer', nl: 'Genezershuis', en: 'Healer’s house', at: { x: 15.5, z: -9.5 }, to: '/p/held/pijn', roof: 0xa83a3a },
  { key: 'physio', nl: 'Fysio Praktijk', en: 'Physio practice', at: { x: 21.5, z: -13 }, roof: 0x7a4a8a, soon: true },
  { key: 'massage', nl: 'Massagehuis', en: 'Massage house', at: { x: 25.5, z: -8.5 }, roof: 0x6a8a5a, soon: true },
  { key: 'pool', nl: 'Zwemhuis', en: 'Swimming house', at: { x: 22, z: -3.6 }, roof: 0x3a7ab8, soon: true, scale: 1.15 },
  // Market, east of the square.
  { key: 'grocer', nl: 'Kruidenier', en: 'Grocer', at: { x: 10.5, z: 3.8 }, to: '/p/voeding', roof: 0x5a8a3a },
  { key: 'baker', nl: 'Bakker', en: 'Baker', at: { x: 12, z: 7.8 }, to: '/p/voeding', roof: 0xb8782a },
  { key: 'inn', nl: 'Herberg', en: 'Inn', at: { x: 17.5, z: 4.5 }, to: '/p/held/vrienden', roof: 0x8a3a2a, scale: 1.15 },
  { key: 'tradepost', nl: 'Handelspost', en: 'Trading post', at: { x: 25.5, z: 7.5 }, roof: 0x7a5a3a, soon: true },
  // Middle south: the market and the town hall.
  { key: 'townhall', nl: 'Raadhuis', en: 'Town hall', at: { x: -4.2, z: 14.5 }, to: '/p/instellingen', roof: 0x3a4a8a, scale: 1.25 },
  // Stables, south-east.
  { key: 'stables', nl: 'Stallen', en: 'Stables', at: { x: 12.5, z: 13.5 }, roof: 0x8a5a3a, soon: true },
];

/** The market stalls south of the square: striped awnings, no door. */
export const MARKET: Vec[] = [{ x: -5.6, z: 6.9 }, { x: -3, z: 7.6 }, { x: -6.4, z: 9.4 }, { x: -3.4, z: 10.1 }];

/** The homes of the residential district, south-west: dwellings of every size (stage 0..5). */
export const RESIDENTS: { at: Vec; stage: number }[] = [
  { at: { x: -9.5, z: 16 }, stage: 2 },
  { at: { x: -13.5, z: 19 }, stage: 3 },
  { at: { x: -7, z: 21.5 }, stage: 1 },
  { at: { x: -17.5, z: 21 }, stage: 4 },
  { at: { x: -11.5, z: 24.5 }, stage: 2 },
  { at: { x: -21.5, z: 18 }, stage: 0 },
  { at: { x: -4, z: 25.5 }, stage: 3 },
];

/** Where the creatures and things to harvest live in the town. */
export const WILD: { kind: string; x: number; z: number }[] = [
  // Slimes by the pond in the park; the giant one further in.
  { kind: 'slime', x: 10.8, z: 23.2 },
  { kind: 'slime', x: 16.4, z: 23.6 },
  { kind: 'giant_slime', x: 18, z: 19.4 },
  // The thirst imp on the dry ground by the trading post; the couch lurkers among the homes.
  { kind: 'imp', x: 22.4, z: 4.2 },
  { kind: 'couch', x: -8.2, z: 26.6 },
  { kind: 'couch_king', x: -23.5, z: 23.5 },
  // The meadow.
  { kind: 'cow', x: 17.4, z: 11.2 },
  { kind: 'cow', x: 20.2, z: 13.8 },
  { kind: 'chicken', x: 16.8, z: 14.2 },
  { kind: 'chicken', x: 19.6, z: 10.6 },
  { kind: 'boar', x: 25, z: 10.8 },
  { kind: 'boar', x: 27.2, z: 7.2 },
  // The first Alpha at the far east edge.
  { kind: 'alpha_boar', x: 26.2, z: -1.6 },
  // Oaks and rocks in the woods west, by the crafts district.
  { kind: 'oak', x: -26, z: 4.8 },
  { kind: 'oak', x: -26.4, z: 13.6 },
  { kind: 'rock', x: -25.6, z: -2.2 },
  { kind: 'rock', x: -26.2, z: -9.8 },
  // Berry bushes in the park and by the homes.
  { kind: 'bush', x: 8.4, z: 25.4 },
  { kind: 'bush', x: 21.2, z: 22.6 },
  { kind: 'bush', x: -15, z: 26.4 },
  // Outside the wall. The wolf wood, south of the gate.
  { kind: 'wolf', x: 0.5, z: 37.6 },
  { kind: 'wolf', x: 6.2, z: 40.6 },
  { kind: 'wolf', x: -1.8, z: 42.4 },
  { kind: 'alpha_wolf', x: 7.6, z: 44.2 },
  // The bear hill, east.
  { kind: 'bear', x: 38.6, z: -6.6 },
  { kind: 'bear', x: 41.8, z: -1.2 },
  // The boss of each ground, further in.
  { kind: 'alpha_bear', x: 44, z: -9.4 },
  // The woodcutters' wood, west: oaks for everyone.
  { kind: 'oak', x: -36.8, z: 0.6 },
  { kind: 'oak', x: -40.2, z: 5.6 },
  { kind: 'oak', x: -41.6, z: -0.8 },
  { kind: 'oak', x: -37.6, z: 6.8 },
  // The quarry, north behind the practice.
  { kind: 'rock', x: -6.4, z: -37.4 },
  { kind: 'rock', x: -1.6, z: -41.8 },
  { kind: 'rock', x: -7.6, z: -41.2 },
  { kind: 'rock', x: 0.4, z: -37.6 },
];
