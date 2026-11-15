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
  // The first Alpha: a huge boar at the edge of the meadow. It attacks by itself and can beat you.
  alpha_boar: { nl: 'Alfazwijn', en: 'Alpha boar', hp: 60, xp: 220, weakTo: 'trained', level: 1 },
  // Not creatures but things to harvest, the same way: an oak gives wood, a rock gives stone.
  oak: { nl: 'Eik', en: 'Oak', hp: 5, xp: 3, weakTo: 'moving', level: 1 },
  rock: { nl: 'Rots', en: 'Rock', hp: 7, xp: 4, weakTo: 'trained', level: 1 },
} as const;
export type CreatureKind = keyof typeof CREATURES;
export const CREATURE_KINDS = Object.keys(CREATURES) as CreatureKind[];

/**
 * Fighting back: what a creature does to the hero per hit, how often, and whether it starts the fight
 * itself (an Alpha does; the others only hit back once struck). Animals that are only prey do nothing.
 */
export const ATTACKS: Record<CreatureKind, { damage: number; everyMs: number; aggressive: boolean }> = {
  slime: { damage: 1, everyMs: 1600, aggressive: false },
  imp: { damage: 1, everyMs: 1300, aggressive: false },
  couch: { damage: 2, everyMs: 1800, aggressive: false },
  giant_slime: { damage: 3, everyMs: 1700, aggressive: false },
  couch_king: { damage: 5, everyMs: 1800, aggressive: false },
  chicken: { damage: 0, everyMs: 1500, aggressive: false },
  cow: { damage: 0, everyMs: 1500, aggressive: false },
  boar: { damage: 3, everyMs: 1500, aggressive: false },
  alpha_boar: { damage: 8, everyMs: 1600, aggressive: true },
  oak: { damage: 0, everyMs: 1500, aggressive: false },
  rock: { damage: 0, everyMs: 1500, aggressive: false },
};
/** Trees and rocks: you chop them for wood and stone; they never fight back. */
export const isHarvest = (kind: CreatureKind) => kind === 'oak' || kind === 'rock';
/** An Alpha: a big, dangerous one with its own warning; worth fighting with a good weapon. */
export const isAlpha = (kind: CreatureKind) => kind.startsWith('alpha_');
/** The adventurer level at which an Alpha is a fair fight (it shows itself earlier, as a warning). */
export const ALPHA_ADVISED_LEVEL = 5;

/**
 * The hero's life in the village: it grows with the adventure level, and a real workout today gives
 * a quarter more (what you did for real makes your hero tougher). Play only: losing costs nothing.
 */
export function heroMaxHp(level: number, trainedToday: boolean): number {
  const base = 40 + 10 * (Math.max(1, Math.floor(level)) - 1);
  return Math.round(base * (trainedToday ? 1.25 : 1));
}
/** Life that comes back by itself out of a fight, per second; after a while without being hit. */
export const HERO_REGEN = { perSecond: 2, afterMs: 5000 } as const;
/** Damage a creature does after the hero's armour: a real workout today takes the edge off by a fifth. */
export const hitOnHero = (kind: CreatureKind, trainedToday: boolean) => {
  const d = ATTACKS[kind].damage;
  return d <= 0 ? 0 : Math.max(1, Math.round(d * (trainedToday ? 0.8 : 1)));
};

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

/** Loot: what a beaten creature leaves behind. Collected in the backpack; it buys nothing. */
export const LOOT = {
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
  alpha_tusk: { nl: 'Alfaslagtand', en: 'Alpha tusk', icon: '🐗' },
  wood: { nl: 'Hout', en: 'Wood', icon: '🪵' },
  stone: { nl: 'Steen', en: 'Stone', icon: '🪨' },
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
  chicken: [{ item: 'feather', chance: 1, max: 3 }, { item: 'egg', chance: 0.3, max: 1 }, { item: 'bone', chance: 0.5, max: 1 }],
  cow: [{ item: 'hide', chance: 1, max: 1 }, { item: 'bone', chance: 1, max: 1 }, { item: 'meat', chance: 0.7, max: 2 }],
  boar: [{ item: 'bone', chance: 1, max: 2 }, { item: 'meat', chance: 0.8, max: 2 }, { item: 'tusk', chance: 0.4, max: 1 }],
  alpha_boar: [{ item: 'alpha_tusk', chance: 1, max: 1 }, { item: 'tusk', chance: 1, max: 2 }, { item: 'meat', chance: 1, max: 3 }],
  oak: [{ item: 'wood', chance: 1, max: 3 }],
  rock: [{ item: 'stone', chance: 1, max: 2 }],
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
