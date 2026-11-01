/**
 * Where worn gear sits on the hero photo. All photos share one framing (3:4, standing straight,
 * facing the camera, whole body, centered), so positions are fractions of the photo, measured on
 * the base photos and spread wider for broader builds and masculine figures.
 *
 * x, y: centre of the item; w: width (fraction of the photo width); h: optional height for tall
 * items; side: 'both' places a mirrored pair left and right; back: drawn behind the arms' edge.
 */
export type BodyKind = 'lean' | 'athletic' | 'muscular' | 'average' | 'soft' | 'full';

type Slot = { x: number; y: number; w: number; h?: number; side?: 'both'; spread?: boolean; scale?: boolean };

/** Horizontal spread of the body around the centre, per build (lean = measured photo). */
const SPREAD: Record<BodyKind, number> = { lean: 1, athletic: 1.06, average: 1.1, muscular: 1.18, soft: 1.16, full: 1.28 };
const FRAME_SPREAD = { f: 1, m: 1.1 } as const;

// Measured on the lean feminine photo: head top 0.03, chin 0.15, shoulders 0.19 (x 0.35–0.65),
// waist 0.43 (x 0.39–0.61), wrists 0.51 (x 0.35 / 0.65), knees 0.71 (x 0.42 / 0.58), feet 0.96.
// Only items that can lie flat on (or next to) the photo. Things that wrap around the head or neck
// (cap, visor, headband, crown, scarf, towel, headphones) or sit under the shirt (heart-rate band)
// look pasted on, so they stay small product photos in the corner.
export const WEAR_SLOTS: Record<string, Slot> = {
  medal: { x: 0.5, y: 0.25, w: 0.11 },
  pin: { x: 0.565, y: 0.265, w: 0.04, spread: true },
  captain: { x: 0.345, y: 0.27, w: 0.06, spread: true },
  yoga_mat: { x: 0.69, y: 0.3, w: 0.11, spread: true },
  belt: { x: 0.5, y: 0.43, w: 0.25, scale: true },
  watch: { x: 0.345, y: 0.505, w: 0.045, spread: true },
  wristbands: { x: 0.35, y: 0.5, w: 0.055, side: 'both', spread: true },
  gloves: { x: 0.35, y: 0.56, w: 0.075, side: 'both', spread: true },
  sleeve: { x: 0.578, y: 0.71, w: 0.07, spread: true },
  shin_guards: { x: 0.42, y: 0.8, w: 0.06, side: 'both', spread: true },
  crew_socks: { x: 0.418, y: 0.915, w: 0.065, side: 'both', spread: true },
  gold_shoes: { x: 0.417, y: 0.955, w: 0.095, side: 'both', spread: true },
  balance_shoes: { x: 0.417, y: 0.955, w: 0.095, side: 'both', spread: true },
  spikes: { x: 0.417, y: 0.955, w: 0.095, side: 'both', spread: true },
  sport_item: { x: 0.77, y: 0.9, w: 0.13 },
  crutches: { x: 0.27, y: 0.62, w: 0.09, h: 0.72, side: 'both', spread: true },
};

/** Back items first, then bottom to top, so a scarf lies over a heart-rate band and a cap over the hair. */
const ORDER = ['yoga_mat', 'crutches', 'sport_item', 'gold_shoes', 'balance_shoes', 'spikes', 'crew_socks', 'shin_guards', 'sleeve', 'belt', 'hr_band', 'gloves', 'wristbands', 'watch', 'captain', 'pin', 'medal', 'towel', 'scarf', 'headphones', 'headband', 'visor', 'cap', 'crown'];

export type WearPlacement = { key: string; left: number; top: number; width: number; height?: number; mirror: boolean };

export function wearPlacements(gear: string[], frame: string | undefined, kind: BodyKind | undefined): WearPlacement[] {
  const k = SPREAD[kind ?? 'average'] * FRAME_SPREAD[frame === 'm' ? 'm' : 'f'];
  const out: WearPlacement[] = [];
  for (const key of ORDER) {
    const s = WEAR_SLOTS[key];
    if (!s || !gear.includes(key)) continue;
    const x = s.spread ? 0.5 + (s.x - 0.5) * k : s.x;
    const w = s.scale ? s.w * k : s.w;
    const place = (cx: number, mirror: boolean) => out.push({ key, left: cx - w / 2, top: s.h ? s.y - s.h / 2 : s.y, width: w, height: s.h, mirror });
    place(x, false);
    if (s.side === 'both') place(1 - x, true);
  }
  return out;
}
