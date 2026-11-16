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
  // The boss of each hunting ground: shows itself with its pack, a fair fight only later (alphaAdvised).
  alpha_wolf: { nl: 'Alfawolf', en: 'Alpha wolf', hp: 120, xp: 400, weakTo: 'trained', level: 6 },
  alpha_bear: { nl: 'Alfabeer', en: 'Alpha bear', hp: 220, xp: 800, weakTo: 'trained', level: 10 },
  // The shadow side: heavy feelings as creatures, the heavier the stronger. The milder ones live in
  // the Shadow valley, the deeper ones in the dungeon of the underworld. What you really did today is
  // what hits them hardest: you are stronger than this.
  pride: { nl: 'Pronkpauw', en: 'Peacock of pride', hp: 14, xp: 40, weakTo: 'trained', level: 4 },
  rage: { nl: 'Vuurkop', en: 'Hothead', hp: 24, xp: 65, weakTo: 'hydrated', level: 6 },
  craving: { nl: 'Graaigeest', en: 'Grabbing ghost', hp: 30, xp: 90, weakTo: 'fed', level: 8 },
  fright: { nl: 'Schrikschim', en: 'Fright shade', hp: 40, xp: 120, weakTo: 'moving', level: 10 },
  sorrow: { nl: 'Tranenslijk', en: 'Tear sludge', hp: 60, xp: 160, weakTo: 'rested', level: 12 },
  apathy: { nl: 'Grijze Slaper', en: 'Grey sleeper', hp: 70, xp: 200, weakTo: 'trained', level: 14 },
  guilt: { nl: 'Schuldketter', en: 'Guilt chainer', hp: 90, xp: 260, weakTo: 'hydrated', level: 16 },
  shame_lord: { nl: 'Schaamtevorst', en: 'Shame lord', hp: 400, xp: 1500, weakTo: 'trained', level: 16 },
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
  alpha_wolf: { damage: 12, everyMs: 1500, aggressive: true },
  alpha_bear: { damage: 18, everyMs: 1800, aggressive: true },
  pride: { damage: 3, everyMs: 1500, aggressive: false },
  rage: { damage: 5, everyMs: 1200, aggressive: true },
  craving: { damage: 5, everyMs: 1400, aggressive: true },
  fright: { damage: 7, everyMs: 1500, aggressive: true },
  sorrow: { damage: 8, everyMs: 1800, aggressive: false },
  apathy: { damage: 9, everyMs: 2000, aggressive: true },
  guilt: { damage: 12, everyMs: 1600, aggressive: true },
  shame_lord: { damage: 22, everyMs: 1800, aggressive: true },
};
/** Trees and rocks: you chop them for wood and stone; they never fight back. */
export const isHarvest = (kind: CreatureKind) => kind === 'oak' || kind === 'rock' || kind === 'bush';
/** Friendly: never hits the hero (prey, trees and rocks). */
export const isFriendly = (kind: CreatureKind) => ATTACKS[kind].damage === 0;
/** An Alpha: a big, dangerous one with its own warning; worth fighting with a good weapon. */
export const isAlpha = (kind: CreatureKind) => kind.startsWith('alpha_') || kind === 'shame_lord';
/** The adventurer level at which an Alpha is a fair fight (it shows itself earlier, as a warning). */
export const ALPHA_ADVISED_LEVEL = 5;
/** The adventurer level at which each Alpha is a fair fight. */
export const alphaAdvised = (kind: CreatureKind): number => (kind === 'alpha_wolf' ? 9 : kind === 'alpha_bear' ? 13 : kind === 'shame_lord' ? 20 : ALPHA_ADVISED_LEVEL);

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
export const hitOnHero = (kind: CreatureKind, trainedToday: boolean, guard = 0) => {
  const d = ATTACKS[kind].damage;
  return d <= 0 ? 0 : Math.max(1, Math.round(d * (trainedToday ? 0.8 : 1) * (1 - guard)));
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
  alpha_fang: { nl: 'Alfawolventand', en: 'Alpha wolf fang', icon: '🌙' },
  alpha_claw: { nl: 'Alfaberenklauw', en: 'Alpha bear claw', icon: '💥' },
  mirror_feather: { nl: 'Spiegelveer', en: 'Mirror feather', icon: '🪞' },
  ember: { nl: 'Gloeiende kool', en: 'Ember', icon: '🔥' },
  empty_purse: { nl: 'Lege buidel', en: 'Empty purse', icon: '👝' },
  shiver_crystal: { nl: 'Bibberkristal', en: 'Shiver crystal', icon: '💠' },
  tear_stone: { nl: 'Traansteen', en: 'Tear stone', icon: '💧' },
  grey_dust: { nl: 'Grijs stof', en: 'Grey dust', icon: '🌫️' },
  broken_link: { nl: 'Gebroken schakel', en: 'Broken link', icon: '⛓️' },
  crown_of_light: { nl: 'Kroon van het Licht', en: 'Crown of light', icon: '✨' },
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
  alpha_wolf: [{ item: 'alpha_fang', chance: 1, max: 1 }, { item: 'wolf_pelt', chance: 1, max: 2 }, { item: 'fang', chance: 1, max: 2 }],
  alpha_bear: [{ item: 'alpha_claw', chance: 1, max: 1 }, { item: 'bear_pelt', chance: 1, max: 2 }, { item: 'claw', chance: 1, max: 3 }],
  pride: [{ item: 'mirror_feather', chance: 1, max: 2 }],
  rage: [{ item: 'ember', chance: 1, max: 2 }],
  craving: [{ item: 'empty_purse', chance: 1, max: 1 }],
  fright: [{ item: 'shiver_crystal', chance: 1, max: 2 }],
  sorrow: [{ item: 'tear_stone', chance: 1, max: 2 }],
  apathy: [{ item: 'grey_dust', chance: 1, max: 3 }],
  guilt: [{ item: 'broken_link', chance: 1, max: 2 }],
  shame_lord: [{ item: 'crown_of_light', chance: 1, max: 1 }, { item: 'broken_link', chance: 1, max: 3 }, { item: 'tear_stone', chance: 1, max: 3 }],
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
export const BERRIES_FOR: Partial<Record<LootKey, number>> = { hide: 3, bone: 3, meat: 2, feather: 1, egg: 2, tusk: 5, alpha_tusk: 25, wolf_pelt: 4, fang: 3, bear_pelt: 6, claw: 4, alpha_fang: 30, alpha_claw: 40 };

/**
 * Things to make from loot: the weaker weapons (a second way next to buying), and a chest.
 * A weapon made still asks for its adventurer level.
 */
export const RECIPES = [
  { key: 'staff', kind: 'weapon', nl: 'Wandelstaf', en: 'Walking staff', icon: '🦯', needs: { wood: 3 } },
  { key: 'gloves', kind: 'weapon', nl: 'Bokshandschoenen', en: 'Boxing gloves', icon: '🥊', needs: { hide: 2, feather: 2 } },
  { key: 'club', kind: 'weapon', nl: 'Knots', en: 'Club', icon: '🏏', needs: { wood: 4, bone: 2 } },
  { key: 'chest', kind: 'build', nl: 'Kist', en: 'Chest', icon: '🧰', needs: { wood: 6, hide: 1 } },
  // Armour, made from what the creatures leave: it softens their blows (ARMOURS).
  { key: 'leather', kind: 'armour', nl: 'Leren harnas', en: 'Leather armour', icon: '🦺', needs: { hide: 3 } },
  { key: 'wolf_cloak', kind: 'armour', nl: 'Wolvenmantel', en: 'Wolf cloak', icon: '🧥', needs: { wolf_pelt: 3, fang: 1 } },
  { key: 'bear_armour', kind: 'armour', nl: 'Berenharnas', en: 'Bear armour', icon: '🛡️', needs: { bear_pelt: 2, claw: 2 } },
  { key: 'alpha_armour', kind: 'armour', nl: 'Alfaharnas', en: 'Alpha armour', icon: '👑', needs: { alpha_fang: 1, alpha_claw: 1, bear_pelt: 2 } },
] as const satisfies readonly { key: string; kind: 'weapon' | 'build' | 'armour'; nl: string; en: string; icon: string; needs: Partial<Record<LootKey, number>> }[];
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
  { key: 'shadowvale', nl: 'Schaduwdal', en: 'Shadow valley', level: 4, x: -25.5, z: 29, r: 6.5, icon: '🌑', outside: true },
] as const;
export type Zone = (typeof ZONES)[number];
/** The hunting ground a point lies in, if any. */
export const zoneAt = (x: number, z: number): Zone | null => ZONES.find((zn) => Math.hypot(x - zn.x, z - zn.z) <= zn.r) ?? null;

/** Armour: how much of each blow it takes away, and the adventurer level it asks for. Made from loot. */
export const ARMOURS = [
  { key: 'leather', nl: 'Leren harnas', en: 'Leather armour', guard: 0.15, level: 2 },
  { key: 'wolf_cloak', nl: 'Wolvenmantel', en: 'Wolf cloak', guard: 0.25, level: 6 },
  { key: 'bear_armour', nl: 'Berenharnas', en: 'Bear armour', guard: 0.4, level: 10 },
  { key: 'alpha_armour', nl: 'Alfaharnas', en: 'Alpha armour', guard: 0.55, level: 13 },
] as const;
export type Armour = (typeof ARMOURS)[number];
export const armourByKey = (key: string | null | undefined): Armour | null => ARMOURS.find((a) => a.key === key) ?? null;

/**
 * The light side: helpers set free by beating a shadow creature for the first time (what overcomes
 * pride is courage, what overcomes fright is acceptance, and so on). Each stands as a shrine in the
 * town and gives the hero a lasting advantage. The last, the light itself, comes with the Crown of
 * light from the Shame lord.
 */
export const LIGHT = [
  { key: 'courage', from: 'pride', nl: 'Moed', en: 'Courage', icon: '🔥', color: '#ffb347', x: 8.6, z: 11,
    doesNl: 'Je eerste klap op elk monster telt dubbel.', doesEn: 'Your first blow on every creature counts double.' },
  { key: 'neutrality', from: 'rage', nl: 'Neutraliteit', en: 'Neutrality', icon: '⚖️', color: '#9fd8ff', x: -20.6, z: 24.6,
    doesNl: 'Je ziet bij elk monster waar het zwak tegen is.', doesEn: 'You see what every creature is weak against.' },
  { key: 'willingness', from: 'craving', nl: 'Bereidheid', en: 'Willingness', icon: '🤝', color: '#9fe39a', x: 3.6, z: -4.4,
    doesNl: 'Dubbele avonturen-XP voor je taak van vandaag.', doesEn: 'Double adventure XP for today’s task.' },
  { key: 'acceptance', from: 'fright', nl: 'Acceptatie', en: 'Acceptance', icon: '🕊️', color: '#e6f2ff', x: 10.8, z: 19.6,
    doesNl: 'Eén keer per dag weer helemaal fit.', doesEn: 'Fully fit again, once a day.' },
  { key: 'reason', from: 'sorrow', nl: 'Rede', en: 'Reason', icon: '🦉', color: '#d4b5ff', x: 11.6, z: -5.2,
    doesNl: 'Een monsterboek met alles wat je tegenkwam.', doesEn: 'A book of every creature you met.' },
  { key: 'love', from: 'apathy', nl: 'Liefde', en: 'Love', icon: '💗', color: '#ff9ac2', x: 19.4, z: 25.8,
    doesNl: 'Je held heeft een kwart meer leven.', doesEn: 'Your hero has a quarter more life.' },
  { key: 'joy', from: 'guilt', nl: 'Vreugde en Vrede', en: 'Joy and Peace', icon: '🌅', color: '#ffe08a', x: -26.6, z: 31.4,
    doesNl: 'Schaduwmonsters doen 20% minder schade.', doesEn: 'Shadow creatures do 20% less damage.' },
  { key: 'enlightenment', from: 'shame_lord', nl: 'Verlichting', en: 'Enlightenment', icon: '✨', color: '#fff6c8', x: 0, z: -2.6,
    doesNl: 'De Kroon van het Licht: een gouden gloed om je held, voor altijd.', doesEn: 'The Crown of light: a golden glow round your hero, for good.' },
] as const;
export type Light = (typeof LIGHT)[number];
export const lightItem = (key: string) => `light_${key}`;
/** The helper a first win over this creature sets free, if any. */
export const lightFrom = (kind: CreatureKind): Light | null => LIGHT.find((l) => l.from === kind) ?? null;
/** The shadow creatures (their blows are softened by Joy and Peace). */
export const isShadow = (kind: CreatureKind) => LIGHT.some((l) => l.from === kind);

/**
 * The boss board on the square: the big ones of the town and the lands round it, as in an adventure
 * guide. Small bosses first, the raid bosses last. One of them is the boss of the week: worth half as
 * much adventure XP again.
 */
export const BOSSES = [
  { kind: 'giant_slime', tier: 'small', zoneNl: 'Stadspark, bij de vijver', zoneEn: 'Town park, by the pond',
    tipNl: 'Wie vandaag bewogen heeft, slaat dubbel hard.', tipEn: 'Moved today? You hit twice as hard.' },
  { kind: 'couch_king', tier: 'small', zoneNl: 'Achter de woonwijk', zoneEn: 'Behind the homes',
    tipNl: 'Hij valt zelf aan. Train eerst: dan slaat hij minder hard en raak jij dubbel.', tipEn: 'It attacks by itself. Train first: it hits softer and you hit double.' },
  { kind: 'alpha_boar', tier: 'raid', zoneNl: 'Zwijnenbos, oostrand', zoneEn: 'Boar wood, east edge',
    tipNl: 'Neem een knots of beter mee, en gebraden vlees om te herstellen.', tipEn: 'Bring a club or better, and roast meat to heal.' },
  { kind: 'alpha_wolf', tier: 'raid', zoneNl: 'Wolvenwoud, buiten de zuidpoort', zoneEn: 'Wolf wood, outside the south gate',
    tipNl: 'Hij komt met zijn roedel. Een leren harnas of wolvenmantel scheelt veel.', tipEn: 'It comes with its pack. Leather armour or a wolf cloak helps a lot.' },
  { kind: 'alpha_bear', tier: 'raid', zoneNl: 'Berenheuvel, buiten de oostpoort', zoneEn: 'Bear hill, outside the east gate',
    tipNl: 'De zwaarste klappen boven de grond. Berenharnas aan en volle buik.', tipEn: 'The heaviest blows above ground. Bear armour on and a full belly.' },
  { kind: 'shame_lord', tier: 'raid', zoneNl: 'Onderwereld, achterin de kerker', zoneEn: 'Underworld, at the end of the dungeon',
    tipNl: 'Alles telt: trainen, water, goed eten, slapen. Liefde en Vreugde van de lichtkant helpen.', tipEn: 'Everything counts: training, water, eating and sleeping well. Love and Joy from the light side help.' },
] as const satisfies readonly { kind: CreatureKind; tier: 'small' | 'raid'; zoneNl: string; zoneEn: string; tipNl: string; tipEn: string }[];
export const slainItem = (kind: string) => `slain_${kind}`;
export const isBoss = (kind: CreatureKind) => BOSSES.some((b) => b.kind === kind);
/** The boss of the week (the same for everyone, from Monday): its wins give half as much XP again. */
export function bossOfWeek(day: string): CreatureKind {
  const d = new Date(`${day}T12:00:00Z`);
  const monday = Math.floor((d.getTime() / 86_400_000 + 3) / 7);
  return BOSSES[monday % BOSSES.length].kind;
}
export const BOSS_WEEK_BONUS = 1.5;
