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
  // Animals in the meadow, as in the old online worlds: beaten for what they drop.
  chicken: { nl: 'Kip', en: 'Chicken', hp: 2, xp: 6, weakTo: 'moving', level: 1 },
  cow: { nl: 'Koe', en: 'Cow', hp: 8, xp: 20, weakTo: 'trained', level: 1 },
  boar: { nl: 'Wild zwijn', en: 'Wild boar', hp: 16, xp: 45, weakTo: 'trained', level: 4 },
  // A tree to chop for wood: it asks for a hatchet from the smith.
  tree: { nl: 'Boom', en: 'Tree', hp: 4, xp: 4, weakTo: 'trained', level: 1 },
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
  { key: 'fists', level: 1, power: 0, price: 0, strength: 0, nl: 'Vuisten', en: 'Fists' },
  { key: 'staff', level: 2, power: 1, price: 30, strength: 0, nl: 'Wandelstaf', en: 'Walking staff' },
  { key: 'gloves', level: 3, power: 1.5, price: 60, strength: 0, nl: 'Bokshandschoenen', en: 'Boxing gloves' },
  { key: 'club', level: 4, power: 2, price: 90, strength: 0, nl: 'Knots', en: 'Club' },
  { key: 'hammer', level: 6, power: 3, price: 140, strength: 2, nl: 'Smidshamer', en: 'Smith’s hammer' },
  { key: 'sword', level: 8, power: 4, price: 200, strength: 3, nl: 'IJzeren zwaard', en: 'Iron sword' },
  { key: 'axe', level: 10, power: 5, price: 280, strength: 4, nl: 'Strijdbijl', en: 'Battle axe' },
  { key: 'spear', level: 13, power: 6.5, price: 380, strength: 5, nl: 'Speer', en: 'Spear' },
  { key: 'hero_sword', level: 16, power: 9, price: 600, strength: 6, nl: 'Heldenzwaard', en: 'Hero’s sword' },
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

/** Loot: what a beaten creature leaves behind. Collected in the backpack; it buys nothing. */
export const LOOT = {
  wood: { nl: 'Hout', en: 'Wood', icon: '🪵' },
  feather: { nl: 'Veer', en: 'Feather', icon: '🪶' },
  egg: { nl: 'Ei', en: 'Egg', icon: '🥚' },
  meat: { nl: 'Rauw vlees', en: 'Raw meat', icon: '🥩' },
  hide: { nl: 'Koeienhuid', en: 'Cowhide', icon: '🟫' },
  bone: { nl: 'Bot', en: 'Bone', icon: '🦴' },
  tusk: { nl: 'Slagtand', en: 'Tusk', icon: '🦷' },
  gel: { nl: 'Slijm', en: 'Slime gel', icon: '🫧' },
  horn: { nl: 'Duivelshoorntje', en: 'Imp horn', icon: '🌶️' },
  button: { nl: 'Bankknoop', en: 'Couch button', icon: '🔘' },
  crown: { nl: 'Kroonscherf', en: 'Crown shard', icon: '👑' },
} as const;
export type LootKey = keyof typeof LOOT;
export const LOOT_KEYS = Object.keys(LOOT) as LootKey[];

/** Per creature: what it can drop, how often (0..1) and how many at most. */
export const DROPS: Record<CreatureKind, { item: LootKey; chance: number; max: number }[]> = {
  slime: [{ item: 'gel', chance: 0.6, max: 1 }],
  imp: [{ item: 'horn', chance: 0.35, max: 1 }],
  couch: [{ item: 'button', chance: 0.5, max: 2 }],
  giant_slime: [{ item: 'gel', chance: 1, max: 3 }],
  couch_king: [{ item: 'button', chance: 1, max: 3 }, { item: 'crown', chance: 0.25, max: 1 }],
  tree: [{ item: 'wood', chance: 1, max: 2 }],
  chicken: [{ item: 'feather', chance: 1, max: 3 }, { item: 'egg', chance: 0.3, max: 1 }, { item: 'bone', chance: 0.5, max: 1 }],
  cow: [{ item: 'hide', chance: 1, max: 1 }, { item: 'bone', chance: 1, max: 1 }, { item: 'meat', chance: 0.7, max: 2 }],
  boar: [{ item: 'bone', chance: 1, max: 2 }, { item: 'meat', chance: 0.8, max: 2 }, { item: 'tusk', chance: 0.4, max: 1 }],
};

/** The drops of one win. `rnd` gives numbers in [0, 1), as Math.random does. */
export function rollDrops(kind: CreatureKind, rnd: () => number): { item: LootKey; n: number }[] {
  const out: { item: LootKey; n: number }[] = [];
  for (const d of DROPS[kind]) {
    if (rnd() >= d.chance) continue;
    out.push({ item: d.item, n: 1 + Math.floor(rnd() * d.max) });
  }
  return out;
}

/** Tools from the smith, bought with coins. The hatchet is what a tree asks for. */
export const TOOLS = [{ key: 'hatchet', price: 25, nl: 'Hakbijl', en: 'Hatchet', icon: '🪓' }] as const;
export const toolItem = (key: string) => `tool_${key}`;
/** What a creature asks for before it can be beaten at all. */
export const NEEDS_TOOL: Partial<Record<CreatureKind, string>> = { tree: 'hatchet' };

/**
 * Things to make from loot: the weaker weapons (a second way next to buying), and a chest.
 * A weapon made still asks for its adventurer level.
 */
export const RECIPES = [
  { key: 'staff', kind: 'weapon', nl: 'Wandelstaf', en: 'Walking staff', icon: '🦯', needs: { wood: 3 } },
  { key: 'gloves', kind: 'weapon', nl: 'Bokshandschoenen', en: 'Boxing gloves', icon: '🥊', needs: { hide: 2, feather: 2 } },
  { key: 'club', kind: 'weapon', nl: 'Knots', en: 'Club', icon: '🏏', needs: { wood: 4, bone: 2 } },
  { key: 'chest', kind: 'build', nl: 'Kist', en: 'Chest', icon: '🧰', needs: { wood: 6, hide: 1 } },
] as const satisfies readonly { key: string; kind: 'weapon' | 'build'; nl: string; en: string; icon: string; needs: Partial<Record<LootKey, number>> }[];
export type Recipe = (typeof RECIPES)[number];
export const builtItem = (key: string) => `built_${key}`;
/** How many of one kind of loot the backpack holds; a chest holds far more. */
export const LOOT_CAP = { backpack: 10, chest: 99 } as const;
