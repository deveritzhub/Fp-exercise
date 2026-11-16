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
  // A berry bush: picked by hand, for those who would rather not hunt.
  bush: { nl: 'Bessenstruik', en: 'Berry bush', hp: 2, xp: 3, weakTo: 'moving', level: 1 },
  // Outside the town wall, each in its own hunting ground: they show themselves from their level on.
  wolf: { nl: 'Wolf', en: 'Wolf', hp: 26, xp: 70, weakTo: 'trained', level: 6 },
  bear: { nl: 'Beer', en: 'Bear', hp: 50, xp: 140, weakTo: 'trained', level: 10 },
} as const;
export type CreatureKind = keyof typeof CREATURES;
export const CREATURE_KINDS = Object.keys(CREATURES) as CreatureKind[];

/**
 * Fighting back: what a creature does to the hero per hit, how often, and whether it starts the fight
 * itself (aggressive: the thirst imp, the wild boar, the couch king and the Alpha; the slimes and the
 * couch lurker only hit back once struck). Prey (chickens, cows) and trees and rocks are friendly.
 */
export const ATTACKS: Record<CreatureKind, { damage: number; everyMs: number; aggressive: boolean }> = {
  slime: { damage: 1, everyMs: 1600, aggressive: false },
  imp: { damage: 1, everyMs: 1300, aggressive: true },
  couch: { damage: 2, everyMs: 1800, aggressive: false },
  giant_slime: { damage: 3, everyMs: 1700, aggressive: false },
  couch_king: { damage: 5, everyMs: 1800, aggressive: true },
  chicken: { damage: 0, everyMs: 1500, aggressive: false },
  cow: { damage: 0, everyMs: 1500, aggressive: false },
  boar: { damage: 3, everyMs: 1500, aggressive: true },
  alpha_boar: { damage: 8, everyMs: 1600, aggressive: true },
  oak: { damage: 0, everyMs: 1500, aggressive: false },
  rock: { damage: 0, everyMs: 1500, aggressive: false },
  bush: { damage: 0, everyMs: 1500, aggressive: false },
  wolf: { damage: 5, everyMs: 1400, aggressive: true },
  bear: { damage: 9, everyMs: 1700, aggressive: true },
};
/** Trees and rocks: you chop them for wood and stone; they never fight back. */
export const isHarvest = (kind: CreatureKind) => kind === 'oak' || kind === 'rock' || kind === 'bush';
/** Friendly: never hits the hero (prey, trees and rocks). */
export const isFriendly = (kind: CreatureKind) => ATTACKS[kind].damage === 0;
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
  wolf_pelt: { nl: 'Wolvenvacht', en: 'Wolf pelt', icon: '🐺' },
  fang: { nl: 'Wolventand', en: 'Wolf fang', icon: '🦷' },
  bear_pelt: { nl: 'Berenvacht', en: 'Bear pelt', icon: '🐻' },
  claw: { nl: 'Berenklauw', en: 'Bear claw', icon: '🐾' },
  wood: { nl: 'Hout', en: 'Wood', icon: '🪵' },
  stone: { nl: 'Steen', en: 'Stone', icon: '🪨' },
  berries: { nl: 'Bessen', en: 'Berries', icon: '🫐' },
  // Cooked at the campfire: eaten in the village, they bring the hero's life back.
  cooked_meat: { nl: 'Gebraden vlees', en: 'Roast meat', icon: '🍖' },
  fried_egg: { nl: 'Gebakken ei', en: 'Fried egg', icon: '🍳' },
  berry_tart: { nl: 'Bessentaart', en: 'Berry tart', icon: '🥧' },
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
  bush: [{ item: 'berries', chance: 1, max: 3 }],
  wolf: [{ item: 'wolf_pelt', chance: 1, max: 1 }, { item: 'bone', chance: 1, max: 2 }, { item: 'fang', chance: 0.4, max: 1 }],
  bear: [{ item: 'bear_pelt', chance: 1, max: 1 }, { item: 'meat', chance: 1, max: 3 }, { item: 'claw', chance: 0.5, max: 2 }],
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

/**
 * Tools from the smith, bought with coins. The hatchet is what a tree asks for: without it an oak
 * cannot be chopped. The pickaxe is for rocks: by hand a rock breaks too, slowly. With the right tool
 * every blow counts three times and the yield is doubled.
 */
export const TOOLS = [
  { key: 'hatchet', for: 'oak', price: 25, nl: 'Hakbijl', en: 'Hatchet', icon: '🪓' },
  { key: 'pickaxe', for: 'rock', price: 60, nl: 'Pikhouweel', en: 'Pickaxe', icon: '⛏️' },
] as const;
export type Tool = (typeof TOOLS)[number];
export const toolItem = (key: string) => `tool_${key}`;
export const toolFor = (kind: CreatureKind): Tool | null => TOOLS.find((t) => t.for === kind) ?? null;
export const TOOL_BONUS = { blows: 3, yield: 2 } as const;
/** What a creature asks for before it can be beaten at all. */
export const NEEDS_TOOL: Partial<Record<CreatureKind, string>> = { oak: 'hatchet' };

/**
 * Plant-based: loot that comes from animals can always be paid with berries instead. How many berries
 * one piece is worth. Nobody has to hunt to build a home.
 */
export const BERRIES_FOR: Partial<Record<LootKey, number>> = { hide: 3, bone: 3, meat: 2, feather: 1, egg: 2, tusk: 5, alpha_tusk: 25, wolf_pelt: 4, fang: 3, bear_pelt: 6, claw: 4 };

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
export const LOOT_CAP = { backpack: 20, chest: 99 } as const;

/** Cooking at the campfire: raw loot becomes food that heals the hero in the village. */
export const COOKING = [
  { key: 'cooked_meat', needs: { meat: 1 }, heals: 0.5 },
  { key: 'fried_egg', needs: { egg: 1 }, heals: 0.3 },
  // Plant-based: berries make a tart that heals as much as meat.
  { key: 'berry_tart', needs: { berries: 4 }, heals: 0.5 },
] as const satisfies readonly { key: LootKey; needs: Partial<Record<LootKey, number>>; heals: number }[];
export type Dish = (typeof COOKING)[number];
export const dishByKey = (key: string): Dish | null => COOKING.find((d) => d.key === key) ?? null;

/**
 * The adventure's task of the day: one per day, the same all day, different from patient to patient.
 * Done, it gives a bonus of adventure XP once.
 */
export const DAILY_QUESTS = [
  { key: 'oak', kind: 'oak', n: 3, nl: 'Hak 3 eiken', en: 'Chop 3 oaks' },
  { key: 'rock', kind: 'rock', n: 2, nl: 'Breek 2 rotsen', en: 'Break 2 rocks' },
  { key: 'bush', kind: 'bush', n: 3, nl: 'Pluk 3 bessenstruiken', en: 'Pick 3 berry bushes' },
  { key: 'slime', kind: 'slime', n: 3, nl: 'Versla 3 stijfheidsslijmen', en: 'Beat 3 stiffness slimes' },
  { key: 'imp', kind: 'imp', n: 2, nl: 'Versla 2 dorstduiveltjes', en: 'Beat 2 thirst imps' },
  { key: 'couch', kind: 'couch', n: 2, nl: 'Versla 2 bankhangers', en: 'Beat 2 couch lurkers' },
  { key: 'cow', kind: 'cow', n: 2, nl: 'Versla 2 koeien', en: 'Beat 2 cows' },
  { key: 'chicken', kind: 'chicken', n: 3, nl: 'Versla 3 kippen', en: 'Beat 3 chickens' },
] as const satisfies readonly { key: string; kind: CreatureKind; n: number; nl: string; en: string }[];
export type DailyQuest = (typeof DAILY_QUESTS)[number];
export const ADVENTURE_QUEST_XP = 40;
/** Today's task for this patient: `day` as YYYY-MM-DD. */
export function dailyQuest(day: string, seed: string): DailyQuest {
  let h = 2166136261;
  for (const ch of `${day}|${seed}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return DAILY_QUESTS[h % DAILY_QUESTS.length];
}

/**
 * The hunting grounds: the areas where creatures live, each with the adventurer level from which its
 * creatures show themselves. In the town the meadow, the park and the boar wood; outside the wall the
 * wolf wood, the bear hill, the woodcutters' wood and the quarry.
 */
export const ZONES = [
  { key: 'meadow', nl: 'Weide', en: 'Meadow', level: 1, x: 18.4, z: 12.6, r: 4.2, icon: '🐄', outside: false },
  { key: 'park', nl: 'Stadspark', en: 'Town park', level: 1, x: 14.4, z: 22, r: 5, icon: '🫧', outside: false },
  { key: 'boarwood', nl: 'Zwijnenbos', en: 'Boar wood', level: 4, x: 25.4, z: 9, r: 5, icon: '🐗', outside: false },
  { key: 'wolfwood', nl: 'Wolvenwoud', en: 'Wolf wood', level: 6, x: 3, z: 39.5, r: 6.5, icon: '🐺', outside: true },
  { key: 'bearhill', nl: 'Berenheuvel', en: 'Bear hill', level: 10, x: 39.5, z: -4, r: 6.5, icon: '🐻', outside: true },
  { key: 'woodcut', nl: 'Houthakkersbos', en: 'Woodcutters’ wood', level: 1, x: -39, z: 3, r: 6.5, icon: '🪵', outside: true },
  { key: 'quarry', nl: 'Steengroeve', en: 'Quarry', level: 1, x: -4, z: -39.5, r: 6, icon: '⛏️', outside: true },
] as const;
export type Zone = (typeof ZONES)[number];
/** The hunting ground a point lies in, if any. */
export const zoneAt = (x: number, z: number): Zone | null => ZONES.find((zn) => Math.hypot(x - zn.x, z - zn.z) <= zn.r) ?? null;
