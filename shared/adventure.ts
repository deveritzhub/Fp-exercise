/**
 * The adventure in the village: little ailments as creatures to beat, for play. It has its own XP
 * and level, apart from the hero's: that one stands for real exercise, food, water and movement,
 * and nothing done here changes it.
 */
export const CREATURES = {
  slime: { nl: 'Stijfheidsslijm', en: 'Stiffness slime', hp: 3, xp: 12, weakTo: 'moving', level: 1 },
  imp: { nl: 'Dorstduiveltje', en: 'Thirst imp', hp: 3, xp: 12, weakTo: 'hydrated', level: 1 },
  couch: { nl: 'Bankhanger', en: 'Couch lurker', hp: 4, xp: 18, weakTo: 'trained', level: 1 },
  // Bigger ones show themselves to an adventurer who has grown: more blows, more XP.
  giant_slime: { nl: 'Reuzenslijm', en: 'Giant slime', hp: 10, xp: 40, weakTo: 'moving', level: 3 },
  couch_king: { nl: 'Bankkoning', en: 'Couch king', hp: 24, xp: 75, weakTo: 'trained', level: 5 },
} as const;
export type CreatureKind = keyof typeof CREATURES;
export const CREATURE_KINDS = Object.keys(CREATURES) as CreatureKind[];

/** Wins that count per day; after that the creatures can still be beaten, for nothing. */
export const ADVENTURE_DAILY_WINS = 40;

/** Level from adventure XP: 1 at the start, each next level asks a little more. */
export function adventureLevel(xp: number): { level: number; from: number; to: number } {
  let level = 1;
  let from = 0;
  let need = 60;
  let left = Math.max(0, Math.floor(xp));
  while (left >= need) {
    left -= need;
    from += need;
    level++;
    need = 60 + (level - 1) * 30;
  }
  return { level, from, to: from + need };
}

/**
 * Weapons: the adventurer level decides which ones the smith sells; coins buy them; the patient puts
 * one on or off. Fists are always there and cost nothing.
 * The village shows it in the hero's hand (web/src/components/patient/weapons3d.ts).
 */
export const WEAPONS = [
  { key: 'fists', level: 1, power: 0, price: 0, nl: 'Vuisten', en: 'Fists' },
  { key: 'staff', level: 2, power: 1, price: 30, nl: 'Wandelstaf', en: 'Walking staff' },
  { key: 'gloves', level: 3, power: 1.5, price: 60, nl: 'Bokshandschoenen', en: 'Boxing gloves' },
  { key: 'club', level: 4, power: 2, price: 90, nl: 'Knots', en: 'Club' },
  { key: 'hammer', level: 6, power: 3, price: 140, nl: 'Smidshamer', en: 'Smith’s hammer' },
  { key: 'sword', level: 8, power: 4, price: 200, nl: 'IJzeren zwaard', en: 'Iron sword' },
  { key: 'axe', level: 10, power: 5, price: 280, nl: 'Strijdbijl', en: 'Battle axe' },
  { key: 'spear', level: 13, power: 6.5, price: 380, nl: 'Speer', en: 'Spear' },
  { key: 'hero_sword', level: 16, power: 9, price: 600, nl: 'Heldenzwaard', en: 'Hero’s sword' },
] as const;
export type Weapon = (typeof WEAPONS)[number];
/** The best weapon earned at this level, and the next one to come (null at the last). */
export function weaponAt(level: number): { weapon: Weapon; next: Weapon | null } {
  let i = 0;
  WEAPONS.forEach((w, k) => {
    if (level >= w.level) i = k;
  });
  return { weapon: WEAPONS[i], next: WEAPONS[i + 1] ?? null };
}

/** One blow: the weapon's power on top, and double when what the creature stands for was put right in real life today. */
export const blow = (kind: CreatureKind, strong: ReadonlySet<string>, power = 0) => (1 + power) * (strong.has(CREATURES[kind].weakTo) ? 2 : 1);

/** The boxing school: a round on the bag. Hits count up to a full round; a few rounds a day give XP. */
export const BOXING = { beats: 14, beatMs: 850, xpPerHit: 2, roundsPerDay: 6 } as const;
export const boxingXp = (hits: number) => Math.max(0, Math.min(BOXING.beats, Math.floor(hits))) * BOXING.xpPerHit;

/** A weapon by its key; fists for anything unknown or for none. */
export const weaponByKey = (key: string | null | undefined): Weapon => WEAPONS.find((w) => w.key === key) ?? WEAPONS[0];
/** How a bought weapon is named in the purchases. */
export const weaponItem = (key: string) => `wpn_${key}`;
