import type { Vec } from './walk';

/**
 * The people of the village: who they are, what they wear and where they walk.
 *
 * Until a villager has a model of its own, it is the hero model in other clothes. Give `model` the
 * path of a GLB under /public (a rigged figure with clips whose names contain "idle" and "walk") and
 * that figure takes its place; nothing else has to change.
 */
export type Villager = {
  key: string;
  nl: string;
  en: string;
  /** Own model, e.g. '/npc/smith.glb'. Without it: the hero model with `wear` and `tint`. */
  model?: string;
  wear: string[];
  tint: Record<string, string>;
  /** Patterned cloth on the shirt (web/public/hero3d/fabric); without it a plain knit in the kit colour. */
  fabric?: string;
  /** Where this villager walks: a building's door ('door:<key>') or a point on the ring road round the square (degrees). */
  route: (`door:${string}` | number)[];
  /** Seconds standing at each stop. */
  rest: number;
};

export const VILLAGERS: Villager[] = [
  {
    key: 'smith', nl: 'Smid', en: 'Smith',
    wear: ['hair_buzz', 'beard_beard', 'outfit_tracksuit', 'gear_gloves', 'gear_belt', 'base_shoes'],
    tint: { kit_main: '#5d4027', kit_dark: '#3a2a1c', kit_soft: '#c9a14a', hair: '#2a1d14', skin: '#b98566' },
    fabric: 'leer',
    route: ['door:smithy', 202.5, 'door:smithy', 157.5],
    rest: 7,
  },
  {
    key: 'messenger', nl: 'Bode', en: 'Messenger',
    wear: ['hair_ponytail', 'outfit_sport_running', 'gear_cap', 'gear_wind_cape', 'base_shoes'],
    tint: { kit_main: '#2759a0', kit_dark: '#1d4378', kit_soft: '#e7f0f9', hair: '#8a5a2b', skin: '#e3b08e' },
    fabric: 'flits',
    route: [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5],
    rest: 2.5,
  },
  {
    key: 'librarian', nl: 'Bibliothecaris', en: 'Librarian',
    wear: ['hair_bun', 'glasses_round', 'outfit_tracksuit', 'gear_scarf', 'base_shoes'],
    tint: { kit_main: '#8e3b5f', kit_dark: '#6d2d49', kit_soft: '#f6e7ee', hair: '#6f6f6f', skin: '#d9a98a' },
    fabric: 'tovenaar',
    route: ['door:library', 337.5, 'door:library', 22.5],
    rest: 9,
  },
];

/** Radius of the ring road the villagers use: outside the lanterns, inside the houses. */
export const RING_ROAD = 4.6;

export function routePoint(stop: Villager['route'][number], doorOf: (key: string) => Vec | null): Vec | null {
  if (typeof stop === 'number') {
    const a = (stop * Math.PI) / 180;
    return { x: Math.cos(a) * RING_ROAD, z: Math.sin(a) * RING_ROAD };
  }
  return doorOf(stop.slice(5));
}
