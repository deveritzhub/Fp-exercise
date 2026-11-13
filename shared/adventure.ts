/**
 * The adventure in the village: little ailments as creatures to beat, for play. It has its own XP
 * and level, apart from the hero's: that one stands for real exercise, food, water and movement,
 * and nothing done here changes it.
 */
export const CREATURES = {
  slime: { nl: 'Stijfheidsslijm', en: 'Stiffness slime', hp: 3, xp: 12, weakTo: 'moving' },
  imp: { nl: 'Dorstduiveltje', en: 'Thirst imp', hp: 3, xp: 12, weakTo: 'hydrated' },
  couch: { nl: 'Bankhanger', en: 'Couch lurker', hp: 4, xp: 18, weakTo: 'trained' },
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

/** One blow: two when what the creature stands for was put right in real life today. */
export const blow = (kind: CreatureKind, strong: ReadonlySet<string>) => (strong.has(CREATURES[kind].weakTo) ? 2 : 1);
