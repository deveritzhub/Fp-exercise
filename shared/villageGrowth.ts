/**
 * The 3D village grows with what the patient already did. Purely cosmetic: it never unlocks a zone
 * and never shrinks (a rest day or pain costs nothing).
 */
export type VillageProgress = { workouts: number; bossesDefeated: number; level: number };

export const HOUSE_EVERY = 5; // one extra cottage per 5 completed workouts
export const MAX_HOUSES = 10;
export const MAX_PENNANTS = 8;

export type VillageGrowth = {
  houses: number;
  pennants: number;
  windmill: boolean;
  fields: boolean;
  statue: boolean;
  lighthouse: boolean;
  /** What the next step is and how far away, or null when everything is built. */
  next: { kind: 'house' | 'windmill' | 'fields' | 'statue' | 'lighthouse'; workouts?: number; levels?: number } | null;
};

export const WINDMILL_AT = 15; // workouts
export const FIELDS_AT = 30; // workouts
export const STATUE_LEVEL = 10;
export const LIGHTHOUSE_LEVEL = 20;

export function villageGrowth(p: VillageProgress): VillageGrowth {
  const w = Math.max(0, Math.floor(p.workouts));
  const houses = Math.min(MAX_HOUSES, Math.floor(w / HOUSE_EVERY));
  const g: VillageGrowth = {
    houses,
    pennants: Math.min(MAX_PENNANTS, Math.max(0, p.bossesDefeated)),
    windmill: w >= WINDMILL_AT,
    fields: w >= FIELDS_AT,
    statue: p.level >= STATUE_LEVEL,
    lighthouse: p.level >= LIGHTHOUSE_LEVEL,
    next: null,
  };
  const options: NonNullable<VillageGrowth['next']>[] = [];
  if (houses < MAX_HOUSES) options.push({ kind: 'house', workouts: HOUSE_EVERY * (houses + 1) - w });
  if (!g.windmill) options.push({ kind: 'windmill', workouts: WINDMILL_AT - w });
  if (!g.fields) options.push({ kind: 'fields', workouts: FIELDS_AT - w });
  if (!g.statue) options.push({ kind: 'statue', levels: STATUE_LEVEL - p.level });
  else if (!g.lighthouse) options.push({ kind: 'lighthouse', levels: LIGHTHOUSE_LEVEL - p.level });
  // Nearest workout goal first; a level goal only when no workout goal is left.
  const byWorkouts = options.filter((o) => o.workouts !== undefined).sort((a, b) => a.workouts! - b.workouts! || Number(a.kind === 'house') - Number(b.kind === 'house'));
  g.next = byWorkouts[0] ?? options[0] ?? null;
  return g;
}

export type VillageNews = { nl: string; en: string };
/** What appeared in the village between two growth states (only additions; it never shrinks). */
export function villageChanges(a: VillageGrowth, b: VillageGrowth): VillageNews[] {
  const out: VillageNews[] = [];
  const houses = b.houses - a.houses;
  if (houses > 0) out.push({ nl: houses === 1 ? 'een nieuw huisje' : `${houses} nieuwe huisjes`, en: houses === 1 ? 'a new cottage' : `${houses} new cottages` });
  if (b.pennants > a.pennants) out.push({ nl: 'een bazenvlag', en: 'a boss pennant' });
  if (b.windmill && !a.windmill) out.push({ nl: 'de molen', en: 'the windmill' });
  if (b.fields && !a.fields) out.push({ nl: 'akkers', en: 'fields' });
  if (b.statue && !a.statue) out.push({ nl: 'een standbeeld van je held', en: 'a statue of your hero' });
  if (b.lighthouse && !a.lighthouse) out.push({ nl: 'de vuurtoren', en: 'the lighthouse' });
  return out;
}
