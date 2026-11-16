/**
 * Cosmetic ACL journey items. A piece appears when that phase's boss is defeated, or when the
 * named measurement milestone is met. Reps, sets and extra sessions never unlock one.
 * A bad day does not take a piece away.
 */
export type AclRewardSlot = 'head' | 'neck' | 'chest' | 'back' | 'waist' | 'legs' | 'feet' | 'held' | 'outfit' | 'trophy' | 'pet' | 'banner';

export type AclReward = {
  key: string;
  nl: string;
  en: string;
  slot: AclRewardSlot;
  /** Phase whose boss grants it. 0 = not a phase boss. */
  phase: 0 | 1 | 2 | 3 | 4 | 5;
  /** Shown in the trophy hall once a later phase boss has fallen, even if still wearable. */
  memorabilia: boolean;
};

export const ACL_REWARDS: readonly AclReward[] = [
  { key: 'ice_pack', nl: 'IJszak-amulet', en: 'Ice-pack amulet', slot: 'neck', phase: 1, memorabilia: true },
  { key: 'deswell_mantle', nl: 'Kalme mantel', en: 'Calm mantle', slot: 'back', phase: 1, memorabilia: true },
  { key: 'iron_brace', nl: 'IJzeren kniebrace', en: 'Iron knee brace', slot: 'legs', phase: 1, memorabilia: true },
  { key: 'crutch_staff', nl: 'Wandelstaf', en: 'Walking staff', slot: 'held', phase: 2, memorabilia: false },
  { key: 'pilgrim_boots', nl: 'Pelgrimslaarzen', en: 'Pilgrim boots', slot: 'feet', phase: 2, memorabilia: false },
  { key: 'golden_hinge', nl: 'Gouden scharnier', en: 'Golden hinge', slot: 'chest', phase: 2, memorabilia: false },
  { key: 'smith_hammer', nl: 'Smedenhamer', en: 'Smith’s hammer', slot: 'held', phase: 3, memorabilia: false },
  { key: 'rune_guard', nl: 'Runen-knieplaat', en: 'Rune knee guard', slot: 'legs', phase: 3, memorabilia: false },
  { key: 'wing_shoes', nl: 'Gevleugelde loopschoenen', en: 'Winged running shoes', slot: 'feet', phase: 4, memorabilia: false },
  { key: 'spring_belt', nl: 'Veergordel', en: 'Spring belt', slot: 'waist', phase: 4, memorabilia: false },
  { key: 'frog_badge', nl: 'Kikkerbadge', en: 'Frog badge', slot: 'chest', phase: 4, memorabilia: false },
  { key: 'wind_cape', nl: 'Windcape', en: 'Wind cape', slot: 'back', phase: 4, memorabilia: false },
  { key: 'champion_helm', nl: 'Kampioenshelm', en: 'Champion helm', slot: 'head', phase: 5, memorabilia: false },
  { key: 'vkb_banner', nl: 'VKB-veteraan', en: 'ACL veteran', slot: 'banner', phase: 5, memorabilia: false },
  { key: 'sport_football', nl: 'Voetbaltenue', en: 'Football kit', slot: 'outfit', phase: 5, memorabilia: false },
  { key: 'sport_basketball', nl: 'Basketbaltenue', en: 'Basketball kit', slot: 'outfit', phase: 5, memorabilia: false },
  { key: 'sport_hockey', nl: 'Hockeytenue', en: 'Hockey kit', slot: 'outfit', phase: 5, memorabilia: false },
  { key: 'sport_ski', nl: 'Skitenue', en: 'Ski kit', slot: 'outfit', phase: 5, memorabilia: false },
  { key: 'sport_running', nl: 'Hardlooptenue', en: 'Running kit', slot: 'outfit', phase: 5, memorabilia: false },
  { key: 'sport_padel', nl: 'Padeltenue', en: 'Padel kit', slot: 'outfit', phase: 5, memorabilia: false },
  { key: 'guild_banner', nl: 'Gildebanier', en: 'Guild banner', slot: 'banner', phase: 0, memorabilia: false },
  { key: 'pet_wolf', nl: 'Wolvenwelp', en: 'Wolf cub', slot: 'pet', phase: 0, memorabilia: false },
  { key: 'pet_horse', nl: 'Paard', en: 'Horse', slot: 'pet', phase: 5, memorabilia: false },
] as const;

export const ACL_REWARD_KEYS = new Set(ACL_REWARDS.map((r) => r.key));
export const ACL_SPORTS = ['football', 'basketball', 'hockey', 'ski', 'running', 'padel'] as const;
export type AclSport = (typeof ACL_SPORTS)[number];

/** Worn on the paper doll. Banners and pets stay in the hall. */
export const wearableAclReward = (key: string) => {
  const slot = ACL_REWARDS.find((r) => r.key === key)?.slot;
  return !!slot && slot !== 'banner' && slot !== 'pet' && slot !== 'trophy';
};

export type AclUnlockInput = {
  /** Phase numbers whose boss is fully defeated. */
  defeatedPhases: readonly number[];
  /** Phase-2 flexion goal met (the 120° default, or whatever the therapist set). */
  flexionMilestone: boolean;
  /** Walking without crutches, as the therapist recorded it. */
  unassistedGait: boolean;
  /** Best quadriceps limb-symmetry so far, 0–100. Never falls. */
  bestQuadLsi: number;
  /** Distinct weeks with at least one completed prescribed workout. Extra sessions in a week do not add weeks. */
  consistentWeeks: number;
  /** The practice raid fell this week. Not a personal volume prize. */
  guildRaidDefeated: boolean;
};

export function aclUnlocked(input: AclUnlockInput): string[] {
  const phases = new Set(input.defeatedPhases);
  const has = (n: number) => phases.has(n);
  const keys = new Set<string>();
  for (const item of ACL_REWARDS) {
    if (item.phase > 0 && has(item.phase)) keys.add(item.key);
  }
  if (input.unassistedGait || has(2)) keys.add('crutch_staff');
  if (input.flexionMilestone || has(2)) keys.add('golden_hinge');
  if (input.consistentWeeks >= 4) keys.add('pet_wolf');
  if (input.guildRaidDefeated) keys.add('guild_banner');
  return [...keys];
}

/** 1–5 lights on the rune guard. Uses the best index, so a worse day does not dim it. */
export function runeTier(bestQuadLsi: number): 1 | 2 | 3 | 4 | 5 {
  const r = Math.max(0, Math.min(100, bestQuadLsi)) / 100;
  return (1 + Math.min(4, Math.floor(r * 4 + 1e-9))) as 1 | 2 | 3 | 4 | 5;
}

/** Pieces from an earlier phase, shown in the hall once a later boss has fallen. */
export function aclMemorabilia(unlocked: readonly string[], defeatedPhases: readonly number[]): string[] {
  const later = Math.max(0, ...defeatedPhases);
  return ACL_REWARDS.filter((r) => r.memorabilia && unlocked.includes(r.key) && later > r.phase).map((r) => r.key);
}
