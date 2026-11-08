import { skinGroup } from './hero';

/**
 * Pure layout for the 3D proof. No Three.js here, so tests stay free of WebGL.
 * Proportions follow the existing build keys. Skin colours match the drawn figure's groups.
 */
export type BuildKey = 'lean' | 'athletic' | 'muscular' | 'average' | 'soft' | 'full';

export const BUILD_PROPORTIONS: Record<BuildKey, { shoulder: number; hip: number; height: number }> = {
  lean: { shoulder: 0.9, hip: 0.88, height: 1.03 },
  athletic: { shoulder: 1.06, hip: 0.96, height: 1.04 },
  muscular: { shoulder: 1.16, hip: 1.02, height: 1.02 },
  average: { shoulder: 1, hip: 1, height: 1 },
  soft: { shoulder: 1.08, hip: 1.12, height: 0.98 },
  full: { shoulder: 1.14, hip: 1.22, height: 0.96 },
};

/** Same five photo groups as skinGroup(), same hexes as the SVG figure. */
export const SKIN_HEX: Record<string, string> = {
  s1: '#f8e0d0',
  s3: '#e6b994',
  s5: '#c68e66',
  s7: '#8f5c3c',
  s9: '#5a3522',
};

const FROM_BUILD: Record<string, BuildKey> = { slim: 'lean', average: 'average', athletic: 'athletic', full: 'full' };

export function buildKey(build: string | undefined, bodyKind?: string | null): BuildKey {
  if (bodyKind && bodyKind in BUILD_PROPORTIONS) return bodyKind as BuildKey;
  return FROM_BUILD[build ?? 'average'] ?? 'average';
}

export function buildProportions(build: string | undefined, bodyKind?: string | null) {
  return BUILD_PROPORTIONS[buildKey(build, bodyKind)];
}

export function skinHex(skin: string) {
  return SKIN_HEX[skinGroup(skin)] ?? SKIN_HEX.s5;
}

export type HeirloomKind = 'weapon' | 'shield' | 'amulet';
export type HeirloomBone = 'handR' | 'forearmL' | 'chest';

const HEIRLOOM_BONE: Record<HeirloomKind, HeirloomBone> = {
  weapon: 'handR',
  shield: 'forearmL',
  amulet: 'chest',
};

const GLOW = ['#c4b49a', '#b08a4f', '#c9a227', '#e0b84a', '#f3d27a'] as const;

export function heirloomLook(kind: HeirloomKind, tier: number) {
  const step = Math.min(5, Math.max(1, Math.round(tier))) as 1 | 2 | 3 | 4 | 5;
  return { bone: HEIRLOOM_BONE[kind], color: GLOW[step - 1], intensity: 0.12 * step, tier: step };
}

export type Hero3DAttachInput = {
  equipped: readonly string[];
  /** Therapist walking aids, merged into the hero look as gear. */
  aids?: readonly string[];
  operatedSide?: 'left' | 'right' | null;
  heirloom?: { kind: HeirloomKind; tier: number } | null;
};

/**
 * What the mannequin wears. The brace is the proof attachment (operated side, else the right knee).
 * Crutches appear only when that item is equipped. The heirloom follows the patient's one choice.
 * Extra workout volume is not an input.
 */
export function hero3DAttachments(input: Hero3DAttachInput) {
  const worn = new Set([...(input.equipped ?? []), ...(input.aids ?? [])]);
  const side: 'left' | 'right' = input.operatedSide === 'left' ? 'left' : 'right';
  return {
    brace: { side, bone: side === 'left' ? 'shinL' as const : 'shinR' as const },
    crutches: worn.has('crutches') || worn.has('crutch_staff'),
    heirloom: input.heirloom ? { kind: input.heirloom.kind, ...heirloomLook(input.heirloom.kind, input.heirloom.tier) } : null,
  };
}

/** Patient's left is +X when the figure faces the camera. */
export function sideSign(side: 'left' | 'right') {
  return side === 'left' ? 1 : -1;
}
