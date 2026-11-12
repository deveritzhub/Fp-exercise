import { GEAR_SLOT, onePerSlot } from '@shared/hero';
import { COLLECTION_ITEM_KEYS } from '@shared/gearCollections';
import { EYE_COLOURS, HAIR_COLOURS, KIT, SKIN_TONES, type FigureLook } from './HumanFigure';

/**
 * What the 3D hero shows: which nodes of the model (tools/blender/mh_hero.py) are visible and which
 * colours the tintable materials get. Pure, so it can be tested without WebGL.
 */

/** Bump when the .glb files change, so phones fetch the new model. */
export const HERO3D_VERSION = 3;
/** Motions in the model (tools/blender/mh_hero.py) and the ground speed that fits each gait, in body heights
 * per second (1.25 and 2.6 m/s for the 1.67 m figure, 1.38 and 2.9 m/s for the 1.80 m one). */
export const HERO_MOTIONS = ['idle', 'walk', 'run', 'cheer'] as const;
export type HeroMotion = (typeof HERO_MOTIONS)[number];
export const GAIT_SPEED = { walk: 0.75, run: 1.6 } as const;
export const hero3dUrl = (frame?: string) => `/hero3d/hero_${frame === 'm' ? 'm' : 'f'}.glb?v=${HERO3D_VERSION}`;

/** Node name prefixes the viewer switches on and off; everything else is always shown. */
export const TOGGLE_PREFIXES = ['hair_', 'beard_', 'glasses_', 'gear_', 'outfit_', 'aid_', 'base_shoes'] as const;
export const isToggleNode = (name: string) => TOGGLE_PREFIXES.some((p) => name.startsWith(p));

/** Shoes replace the plain trainers. */
export const SHOE_ITEMS = new Set(['gold_shoes', 'balance_shoes', 'spikes', 'pilgrim_boots', 'wing_shoes']);
/** Big hair styles do not fit under a helmet or cap; they become short hair there. */
const TIGHT_HEADGEAR = new Set(['cap', 'champion_helm']);
const BIG_HAIR = new Set(['afro', 'curly', 'bun']);

/** Sport outfits bring their own club colours; other outfits use the hero's chosen kit colour. */
export const SPORT_KIT: Record<string, { main: string; dark: string; soft: string }> = {
  sport_football: { main: '#1d5f99', dark: '#164a78', soft: '#f4f6f4' },
  sport_basketball: { main: '#b5781a', dark: '#8a5b12', soft: '#fbf0d9' },
  sport_hockey: { main: '#2b6b41', dark: '#1d4a2d', soft: '#f4f6f4' },
  sport_ski: { main: '#8e3b5f', dark: '#6d2d49', soft: '#f6e7ee' },
  sport_running: { main: '#2759a0', dark: '#1d4378', soft: '#e7f0f9' },
  sport_padel: { main: '#46554e', dark: '#34433c', soft: '#e8eee9' },
  champion: { main: '#29483c', dark: '#1d362d', soft: '#e4bc63' },
};

const BUILD_WIDTH: Record<string, number> = { slim: 0.92, average: 1, athletic: 1.05, full: 1.13 };
const BODY_WIDTH: Record<string, number> = { lean: 0.94, athletic: 1.04, muscular: 1.08, average: 1, soft: 1.08, full: 1.13 };

export type Hero3dScene = {
  url: string;
  visible: Set<string>;
  tints: Record<'skin' | 'hair' | 'iris' | 'kit_main' | 'kit_dark' | 'kit_soft', string>;
  /** Horizontal scale for the body build (1 = average). */
  width: number;
};

export function hero3dScene(look: FigureLook): Hero3dScene {
  const all = look.gear ?? [];
  // 3D is a parked prototype: do not reference newly-added 2D-only models that do not exist in its GLB assets.
  const worn = onePerSlot(all.filter((k) => GEAR_SLOT[k] && !COLLECTION_ITEM_KEYS.has(k)));
  const visible = new Set<string>();
  const head = worn.find((k) => GEAR_SLOT[k] === 'head');
  let hair = look.hair;
  if (head && TIGHT_HEADGEAR.has(head) && BIG_HAIR.has(hair)) hair = 'short';
  if (hair && hair !== 'none') visible.add(`hair_${hair}`);
  if (look.beard && look.beard !== 'none') visible.add(`beard_${look.beard}`);
  if (look.glasses && look.glasses !== 'none') visible.add(`glasses_${look.glasses}`);
  let outfit: string | null = null;
  for (const k of worn) {
    if (GEAR_SLOT[k] === 'outfit') {
      outfit = k;
      visible.add(`outfit_${k}`);
    } else visible.add(`gear_${k}`);
  }
  if (all.includes('crutches')) visible.add('aid_crutches');
  if (!worn.some((k) => SHOE_ITEMS.has(k))) visible.add('base_shoes');
  const kit = (outfit && SPORT_KIT[outfit]) || KIT[look.outfit] || KIT.forest;
  const width = look.body?.kind ? BODY_WIDTH[look.body.kind] ?? 1 : BUILD_WIDTH[look.build ?? 'average'] ?? 1;
  return {
    url: hero3dUrl(look.frame),
    visible,
    tints: {
      skin: SKIN_TONES[look.skin] ?? SKIN_TONES.s4,
      hair: HAIR_COLOURS[look.hairColor ?? 'darkbrown'] ?? HAIR_COLOURS.darkbrown,
      iris: EYE_COLOURS[look.eyeColor ?? 'brown'] ?? EYE_COLOURS.brown,
      kit_main: kit.main,
      kit_dark: kit.dark,
      kit_soft: kit.soft,
    },
    width,
  };
}
