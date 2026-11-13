import { GEAR_SLOT, onePerSlot } from '@shared/hero';
import { EYE_COLOURS, HAIR_COLOURS, KIT, SKIN_TONES, type FigureLook } from './HumanFigure';

/**
 * What the 3D hero shows: which nodes of the model (tools/blender/mh_hero.py) are visible and which
 * colours the tintable materials get. Pure, so it can be tested without WebGL.
 */

/** Bump when the .glb files change, so phones fetch the new model. */
export const HERO3D_VERSION = 4;
export const HERO3D_BUILDS = ['slim', 'average', 'athletic', 'full'] as const;
export type Hero3dBuild = typeof HERO3D_BUILDS[number];
export const hero3dUrl = (frame?: string, build: string = 'average') =>
  `/hero3d/hero_${frame === 'm' ? 'm' : 'f'}_${HERO3D_BUILDS.includes(build as Hero3dBuild) ? build : 'average'}.glb?v=${HERO3D_VERSION}`;

/** Match the existing measured-body categories; never stretch the mesh. */
export function hero3dBuild(look: FigureLook): Hero3dBuild {
  const body = look.body;
  if (body) {
    if (body.kind === 'full' || body.kind === 'soft' || body.fat >= 0.5) return 'full';
    if (body.kind === 'muscular' || body.kind === 'athletic' || (body.muscle >= 0.45 && body.fat < 0.4)) return 'athletic';
    if (body.kind === 'lean' || (body.fat < 0.2 && body.muscle < 0.4)) return 'slim';
    return 'average';
  }
  return HERO3D_BUILDS.includes(look.build as Hero3dBuild) ? look.build as Hero3dBuild : 'average';
}

/** Motions in the model (tools/blender/mh_hero.py) and the ground speed that fits each gait, in body heights
 * per second (1.25 and 2.6 m/s for the 1.67 m figure, 1.38 and 2.9 m/s for the 1.80 m one). */
export const HERO_MOTIONS = ['idle', 'walk', 'run', 'cheer'] as const;
export type HeroMotion = (typeof HERO_MOTIONS)[number];
export const GAIT_SPEED = { walk: 0.75, run: 1.6 } as const;

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

/** Kits that are a patterned cloth; the plain kits wear the grey knit in their own colour. */
export const FABRICS = new Set(['flits', 'honing', 'camo', 'ridder', 'ruit', 'tovenaar', 'leer', 'malien']);
export const FABRIC_PLAIN = 'effen';
/** Bump when the cloth pictures change. */
export const FABRIC_VERSION = 1;
export const fabricUrl = (key: string) => `/hero3d/fabric/${key}.webp?v=${FABRIC_VERSION}`;

export type Hero3dScene = {
  url: string;
  visible: Set<string>;
  tints: Record<'skin' | 'hair' | 'iris' | 'kit_main' | 'kit_dark' | 'kit_soft', string>;
  build: Hero3dBuild;
  /** The patterned cloth on the shirt, or null for a plain kit colour. */
  fabric: string | null;
};

export function hero3dScene(look: FigureLook): Hero3dScene {
  const all = look.gear ?? [];
  const worn = onePerSlot(all.filter((k) => GEAR_SLOT[k]));
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
  const build = hero3dBuild(look);
  return {
    url: hero3dUrl(look.frame, build),
    visible,
    tints: {
      skin: SKIN_TONES[look.skin] ?? SKIN_TONES.s4,
      hair: HAIR_COLOURS[look.hairColor ?? 'darkbrown'] ?? HAIR_COLOURS.darkbrown,
      iris: EYE_COLOURS[look.eyeColor ?? 'brown'] ?? EYE_COLOURS.brown,
      kit_main: kit.main,
      kit_dark: kit.dark,
      kit_soft: kit.soft,
    },
    build,
    // A sport outfit brings its own club colours; the cloth belongs to the hero's own kit.
    fabric: !(outfit && SPORT_KIT[outfit]) && FABRICS.has(look.outfit) ? look.outfit : null,
  };
}
