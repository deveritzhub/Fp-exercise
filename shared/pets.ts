/**
 * Pets: a dog or a cat that walks with the hero through the village, chosen from adventure level 2.
 * Each breed has a body shape (for the 3D model) and a few coats to pick from. Free to choose and to
 * change; it is company, not an advantage in a fight.
 */

/** From this adventure level a pet can be chosen. */
export const PET_LEVEL = 2;
export const PET_NAME_MAX = 20;

export type EarKind = 'rose' | 'drop' | 'prick' | 'semi' | 'bat' | 'cat';
export type TailKind = 'thin' | 'otter' | 'plume' | 'curl' | 'stub' | 'pom' | 'cat' | 'fluffy';
/** How the second colour lies on the coat. */
export type Pattern = 'none' | 'tabby' | 'brindle' | 'spots' | 'patches' | 'saddle' | 'points';

export type Coat = { nl: string; en: string; base: number; second: number; mark?: number; pattern: Pattern; chest?: boolean; socks?: boolean };

export type Breed = {
  key: string;
  kind: 'dog' | 'cat';
  nl: string;
  en: string;
  /** Height at the shoulder in metres (a little bigger than life, so it reads next to the hero). */
  h: number;
  /** Body length, as a share of the height. */
  len: number;
  /** Share of the height that is leg. */
  leg: number;
  /** Leg thickness, as a share of the height. */
  legT: number;
  /** Deep chest and tucked-up waist (the sighthounds): 1 is an ordinary dog. */
  deep?: number;
  /** Body width against its depth. */
  wide?: number;
  neck: number;
  skull: number;
  snout: number;
  snoutW?: number;
  ear: EarKind;
  earS?: number;
  tail: TailKind;
  /** Long fur: makes the body, the neck ruff and the tail fuller. */
  fluff?: number;
  coats: Coat[];
};

const W = 0xf4efe6;
const BLACK = 0x24211e;
const TAN = 0xb7783e;

export const PETS: Breed[] = [
  // The sighthounds first: slim, long legs, deep chest, tiny waist, folded rose ears and a long thin tail.
  {
    key: 'whippet', kind: 'dog', nl: 'Whippet', en: 'Whippet', h: 0.56, len: 1.02, leg: 0.6, legT: 0.075, deep: 1.35, wide: 0.72, neck: 0.42, skull: 0.15, snout: 0.27, snoutW: 0.5, ear: 'rose', tail: 'thin',
    coats: [
      { nl: 'Fawn', en: 'Fawn', base: 0xc99a62, second: W, pattern: 'none', chest: true },
      { nl: 'Blauw', en: 'Blue', base: 0x7c8590, second: W, pattern: 'none', chest: true },
      { nl: 'Gestroomd', en: 'Brindle', base: 0xa5794a, second: W, mark: 0x3a2a1c, pattern: 'brindle', chest: true },
      { nl: 'Wit met vlekken', en: 'White and fawn', base: W, second: W, mark: 0xc58f55, pattern: 'patches' },
      { nl: 'Zwart', en: 'Black', base: BLACK, second: W, pattern: 'none', chest: true, socks: true },
    ],
  },
  {
    key: 'greyhound', kind: 'dog', nl: 'Greyhound', en: 'Greyhound', h: 0.76, len: 1.04, leg: 0.6, legT: 0.07, deep: 1.4, wide: 0.7, neck: 0.44, skull: 0.14, snout: 0.29, snoutW: 0.48, ear: 'rose', tail: 'thin',
    coats: [
      { nl: 'Zwart', en: 'Black', base: BLACK, second: W, pattern: 'none', chest: true },
      { nl: 'Gestroomd', en: 'Brindle', base: 0x9a6d42, second: W, mark: 0x30231a, pattern: 'brindle' },
      { nl: 'Fawn', en: 'Fawn', base: 0xcaa06d, second: W, pattern: 'none' },
      { nl: 'Blauw', en: 'Blue', base: 0x737c88, second: W, pattern: 'none', chest: true },
      { nl: 'Wit en zwart', en: 'White and black', base: W, second: W, mark: BLACK, pattern: 'patches' },
    ],
  },
  {
    key: 'iggy', kind: 'dog', nl: 'Italiaans windhondje', en: 'Italian greyhound', h: 0.4, len: 1.0, leg: 0.62, legT: 0.075, deep: 1.3, wide: 0.72, neck: 0.42, skull: 0.16, snout: 0.26, snoutW: 0.5, ear: 'rose', tail: 'thin',
    coats: [
      { nl: 'Blauw', en: 'Blue', base: 0x818a96, second: W, pattern: 'none', chest: true },
      { nl: 'Fawn', en: 'Fawn', base: 0xd2a874, second: W, pattern: 'none' },
      { nl: 'Zwart', en: 'Black', base: BLACK, second: W, pattern: 'none', chest: true },
    ],
  },
  {
    key: 'labrador', kind: 'dog', nl: 'Labrador', en: 'Labrador', h: 0.6, len: 1.18, leg: 0.5, legT: 0.11, wide: 1.0, neck: 0.25, skull: 0.2, snout: 0.2, snoutW: 0.7, ear: 'drop', tail: 'otter',
    coats: [
      { nl: 'Blond', en: 'Yellow', base: 0xe0bf8c, second: 0xf0dcb8, pattern: 'none' },
      { nl: 'Zwart', en: 'Black', base: BLACK, second: BLACK, pattern: 'none' },
      { nl: 'Chocolade', en: 'Chocolate', base: 0x5c3a24, second: 0x5c3a24, pattern: 'none' },
    ],
  },
  {
    key: 'golden', kind: 'dog', nl: 'Golden retriever', en: 'Golden retriever', h: 0.6, len: 1.18, leg: 0.5, legT: 0.11, wide: 1.0, neck: 0.27, skull: 0.2, snout: 0.21, snoutW: 0.65, ear: 'drop', tail: 'plume', fluff: 1.18,
    coats: [
      { nl: 'Goud', en: 'Gold', base: 0xd19d4f, second: 0xe8c28a, pattern: 'none' },
      { nl: 'Crème', en: 'Cream', base: 0xead4a8, second: 0xf4e6c8, pattern: 'none' },
    ],
  },
  {
    key: 'shepherd', kind: 'dog', nl: 'Duitse herder', en: 'German shepherd', h: 0.64, len: 1.25, leg: 0.52, legT: 0.1, wide: 0.9, neck: 0.32, skull: 0.18, snout: 0.25, snoutW: 0.55, ear: 'prick', earS: 1.25, tail: 'plume', fluff: 1.08,
    coats: [
      { nl: 'Zwart-bruin', en: 'Black and tan', base: 0xb27a40, second: 0xc99560, mark: BLACK, pattern: 'saddle' },
      { nl: 'Zwart', en: 'Black', base: BLACK, second: BLACK, pattern: 'none' },
    ],
  },
  {
    key: 'collie', kind: 'dog', nl: 'Border collie', en: 'Border collie', h: 0.54, len: 1.18, leg: 0.52, legT: 0.09, wide: 0.9, neck: 0.3, skull: 0.17, snout: 0.22, snoutW: 0.55, ear: 'semi', tail: 'plume', fluff: 1.15,
    coats: [
      { nl: 'Zwart-wit', en: 'Black and white', base: BLACK, second: W, pattern: 'none', chest: true, socks: true },
      { nl: 'Bruin-wit', en: 'Red and white', base: 0x6b4228, second: W, pattern: 'none', chest: true, socks: true },
      { nl: 'Blue merle', en: 'Blue merle', base: 0x9aa0a8, second: W, mark: 0x3a3c40, pattern: 'patches', chest: true },
    ],
  },
  {
    key: 'husky', kind: 'dog', nl: 'Husky', en: 'Husky', h: 0.58, len: 1.15, leg: 0.52, legT: 0.1, wide: 0.95, neck: 0.3, skull: 0.18, snout: 0.21, snoutW: 0.6, ear: 'prick', tail: 'curl', fluff: 1.2,
    coats: [
      { nl: 'Grijs-wit', en: 'Grey and white', base: W, second: W, mark: 0x5e6268, pattern: 'saddle' },
      { nl: 'Rood-wit', en: 'Red and white', base: W, second: W, mark: 0xa45a30, pattern: 'saddle' },
      { nl: 'Zwart-wit', en: 'Black and white', base: W, second: W, mark: BLACK, pattern: 'saddle' },
    ],
  },
  {
    key: 'beagle', kind: 'dog', nl: 'Beagle', en: 'Beagle', h: 0.42, len: 1.2, leg: 0.48, legT: 0.11, wide: 0.95, neck: 0.25, skull: 0.21, snout: 0.2, snoutW: 0.65, ear: 'drop', earS: 1.25, tail: 'otter',
    coats: [{ nl: 'Driekleur', en: 'Tricolour', base: TAN, second: W, mark: BLACK, pattern: 'saddle', chest: true, socks: true }],
  },
  {
    key: 'dachshund', kind: 'dog', nl: 'Teckel', en: 'Dachshund', h: 0.3, len: 2.1, leg: 0.36, legT: 0.15, wide: 0.85, neck: 0.3, skull: 0.25, snout: 0.3, snoutW: 0.5, ear: 'drop', earS: 1.3, tail: 'thin',
    coats: [
      { nl: 'Rood', en: 'Red', base: 0xa65a2c, second: 0xa65a2c, pattern: 'none' },
      { nl: 'Zwart-bruin', en: 'Black and tan', base: BLACK, second: TAN, pattern: 'none', chest: true, socks: true },
    ],
  },
  {
    key: 'corgi', kind: 'dog', nl: 'Corgi', en: 'Corgi', h: 0.32, len: 1.7, leg: 0.36, legT: 0.15, wide: 1.0, neck: 0.28, skull: 0.24, snout: 0.22, snoutW: 0.6, ear: 'prick', earS: 1.35, tail: 'stub', fluff: 1.1,
    coats: [{ nl: 'Rood-wit', en: 'Red and white', base: 0xc8783a, second: W, pattern: 'none', chest: true, socks: true }],
  },
  {
    key: 'jackrussell', kind: 'dog', nl: 'Jack russell', en: 'Jack Russell', h: 0.34, len: 1.15, leg: 0.5, legT: 0.12, wide: 0.9, neck: 0.25, skull: 0.22, snout: 0.2, snoutW: 0.6, ear: 'semi', tail: 'stub',
    coats: [{ nl: 'Wit met bruin', en: 'White and tan', base: W, second: W, mark: TAN, pattern: 'patches' }],
  },
  {
    key: 'poodle', kind: 'dog', nl: 'Poedel', en: 'Poodle', h: 0.56, len: 1.0, leg: 0.58, legT: 0.09, wide: 0.85, neck: 0.4, skull: 0.18, snout: 0.22, snoutW: 0.5, ear: 'drop', earS: 1.2, tail: 'pom', fluff: 1.25,
    coats: [
      { nl: 'Wit', en: 'White', base: W, second: W, pattern: 'none' },
      { nl: 'Zwart', en: 'Black', base: BLACK, second: BLACK, pattern: 'none' },
      { nl: 'Abrikoos', en: 'Apricot', base: 0xdfa672, second: 0xdfa672, pattern: 'none' },
    ],
  },
  {
    key: 'frenchie', kind: 'dog', nl: 'Franse bulldog', en: 'French bulldog', h: 0.34, len: 1.1, leg: 0.42, legT: 0.15, wide: 1.25, neck: 0.12, skull: 0.28, snout: 0.07, snoutW: 0.8, ear: 'bat', earS: 1.2, tail: 'stub',
    coats: [
      { nl: 'Fawn', en: 'Fawn', base: 0xcba070, second: 0xcba070, pattern: 'none' },
      { nl: 'Gestroomd', en: 'Brindle', base: 0x5a4030, second: W, mark: 0x241a14, pattern: 'brindle', chest: true },
      { nl: 'Crème', en: 'Cream', base: 0xeedcbc, second: 0xeedcbc, pattern: 'none' },
    ],
  },
  {
    key: 'dalmatian', kind: 'dog', nl: 'Dalmatiër', en: 'Dalmatian', h: 0.62, len: 1.12, leg: 0.55, legT: 0.09, wide: 0.85, neck: 0.32, skull: 0.17, snout: 0.23, snoutW: 0.55, ear: 'drop', tail: 'thin',
    coats: [{ nl: 'Zwarte stippen', en: 'Black spots', base: W, second: W, mark: BLACK, pattern: 'spots' }],
  },
  {
    key: 'chihuahua', kind: 'dog', nl: 'Chihuahua', en: 'Chihuahua', h: 0.24, len: 1.05, leg: 0.52, legT: 0.12, wide: 0.9, neck: 0.25, skull: 0.33, snout: 0.12, snoutW: 0.55, ear: 'prick', earS: 1.6, tail: 'curl',
    coats: [
      { nl: 'Fawn', en: 'Fawn', base: 0xd6ad7a, second: 0xd6ad7a, pattern: 'none' },
      { nl: 'Zwart-bruin', en: 'Black and tan', base: BLACK, second: TAN, pattern: 'none', chest: true, socks: true },
    ],
  },
  // The cats: shorter muzzle, small pointed ears, the tail held up when walking.
  {
    key: 'siberian', kind: 'cat', nl: 'Siberische kat', en: 'Siberian cat', h: 0.32, len: 1.35, leg: 0.48, legT: 0.13, wide: 1.0, neck: 0.18, skull: 0.3, snout: 0.08, snoutW: 0.65, ear: 'cat', earS: 1.05, tail: 'fluffy', fluff: 1.35,
    coats: [
      { nl: 'Bruin getijgerd', en: 'Brown tabby', base: 0x8f6c48, second: 0xe9dcc6, mark: 0x3b2a1c, pattern: 'tabby', chest: true },
      { nl: 'Zilver', en: 'Silver', base: 0xbcc0c4, second: W, mark: 0x4a4c50, pattern: 'tabby', chest: true },
      { nl: 'Rood', en: 'Red', base: 0xd98d4c, second: 0xf2dcc0, mark: 0xa65a2a, pattern: 'tabby', chest: true },
      { nl: 'Wit', en: 'White', base: W, second: W, pattern: 'none' },
      { nl: 'Neva masquerade', en: 'Neva masquerade', base: 0xeee4d4, second: 0xeee4d4, mark: 0x6a5242, pattern: 'points' },
    ],
  },
  {
    key: 'housecat', kind: 'cat', nl: 'Huiskat', en: 'House cat', h: 0.28, len: 1.3, leg: 0.5, legT: 0.11, wide: 0.95, neck: 0.18, skull: 0.3, snout: 0.08, snoutW: 0.6, ear: 'cat', tail: 'cat',
    coats: [
      { nl: 'Grijs getijgerd', en: 'Grey tabby', base: 0x8e8e8a, second: W, mark: 0x3e3e3c, pattern: 'tabby', chest: true },
      { nl: 'Rood getijgerd', en: 'Ginger tabby', base: 0xdb8f4e, second: 0xf3dcc0, mark: 0xa75c2c, pattern: 'tabby' },
      { nl: 'Zwart-wit', en: 'Tuxedo', base: BLACK, second: W, pattern: 'none', chest: true, socks: true },
      { nl: 'Lapjeskat', en: 'Calico', base: W, second: W, mark: 0xd08440, pattern: 'patches' },
    ],
  },
  {
    key: 'mainecoon', kind: 'cat', nl: 'Maine coon', en: 'Maine Coon', h: 0.36, len: 1.4, leg: 0.5, legT: 0.13, wide: 1.0, neck: 0.2, skull: 0.28, snout: 0.1, snoutW: 0.7, ear: 'cat', earS: 1.3, tail: 'fluffy', fluff: 1.3,
    coats: [
      { nl: 'Bruin getijgerd', en: 'Brown tabby', base: 0x7c5c3e, second: 0xe2d2b8, mark: 0x2e2218, pattern: 'tabby', chest: true },
      { nl: 'Zwart', en: 'Black', base: BLACK, second: BLACK, pattern: 'none' },
    ],
  },
  {
    key: 'ragdoll', kind: 'cat', nl: 'Ragdoll', en: 'Ragdoll', h: 0.32, len: 1.35, leg: 0.48, legT: 0.13, wide: 1.0, neck: 0.18, skull: 0.3, snout: 0.08, snoutW: 0.65, ear: 'cat', tail: 'fluffy', fluff: 1.25,
    coats: [{ nl: 'Seal point', en: 'Seal point', base: 0xf0e6d6, second: 0xf0e6d6, mark: 0x5a4234, pattern: 'points' }],
  },
  {
    key: 'british', kind: 'cat', nl: 'Brits korthaar', en: 'British shorthair', h: 0.3, len: 1.25, leg: 0.46, legT: 0.14, wide: 1.15, neck: 0.15, skull: 0.34, snout: 0.07, snoutW: 0.75, ear: 'cat', earS: 0.85, tail: 'cat',
    coats: [{ nl: 'Blauw', en: 'Blue', base: 0x8a929c, second: 0x8a929c, pattern: 'none' }],
  },
  {
    key: 'bengal', kind: 'cat', nl: 'Bengaal', en: 'Bengal', h: 0.3, len: 1.35, leg: 0.52, legT: 0.11, wide: 0.9, neck: 0.18, skull: 0.28, snout: 0.09, snoutW: 0.6, ear: 'cat', tail: 'cat',
    coats: [{ nl: 'Gevlekt', en: 'Spotted', base: 0xd2a462, second: 0xf0dcb8, mark: 0x3a2814, pattern: 'spots', chest: true }],
  },
  {
    key: 'blackcat', kind: 'cat', nl: 'Zwarte kat', en: 'Black cat', h: 0.28, len: 1.3, leg: 0.5, legT: 0.11, wide: 0.95, neck: 0.18, skull: 0.3, snout: 0.08, snoutW: 0.6, ear: 'cat', tail: 'cat',
    coats: [{ nl: 'Zwart', en: 'Black', base: 0x1c1a19, second: 0x1c1a19, pattern: 'none' }],
  },
];

export const PET_KEYS = PETS.map((p) => p.key);
export const petByKey = (key: string | null | undefined): Breed | undefined => PETS.find((p) => p.key === key);
/** The coat, kept inside the breed's list. */
export const petCoat = (b: Breed, coat: number | null | undefined): Coat => b.coats[Math.max(0, Math.min(b.coats.length - 1, Math.trunc(coat ?? 0)))];
/** A pet's name: trimmed, plain letters, digits, spaces and a few marks; empty means none. */
export const cleanPetName = (s: string | null | undefined): string | null => {
  const v = (s ?? '').replace(/[^\p{L}\p{N} '\-.]/gu, '').replace(/\s+/g, ' ').trim().slice(0, PET_NAME_MAX);
  return v || null;
};

export type PetChoice = { key: string; coat: number; name: string | null };

/**
 * The grooming salon: a colour for the collar (and whatever the pet wears), free to change, and
 * things to wear, each bought once with coins and then put on or taken off freely.
 */
export const PET_COLORS = [
  { key: 'red', nl: 'Rood', en: 'Red', hex: 0xc8352e },
  { key: 'blue', nl: 'Blauw', en: 'Blue', hex: 0x2f6fc4 },
  { key: 'green', nl: 'Groen', en: 'Green', hex: 0x2f8a52 },
  { key: 'gold', nl: 'Goud', en: 'Gold', hex: 0xd9a52c },
  { key: 'pink', nl: 'Roze', en: 'Pink', hex: 0xe07aa6 },
  { key: 'purple', nl: 'Paars', en: 'Purple', hex: 0x7a4ab8 },
  { key: 'orange', nl: 'Oranje', en: 'Orange', hex: 0xe8782a },
  { key: 'black', nl: 'Zwart', en: 'Black', hex: 0x24211e },
] as const;
export type PetColor = (typeof PET_COLORS)[number]['key'];
export const petColor = (key: string | null | undefined) => PET_COLORS.find((c) => c.key === key) ?? PET_COLORS[0];

export const PET_WEAR = [
  { key: 'bandana', nl: 'Bandana', en: 'Bandana', price: 10, icon: '🧣', aboutNl: 'Een driehoekige sjaal om de hals.', aboutEn: 'A triangular scarf round the neck.' },
  { key: 'bow', nl: 'Strik', en: 'Bow', price: 10, icon: '🎀', aboutNl: 'Een strik op de halsband.', aboutEn: 'A bow on the collar.' },
  { key: 'harness', nl: 'Tuigje', en: 'Harness', price: 20, icon: '🦮', aboutNl: 'Een tuigje om de borst, voor lange wandelingen.', aboutEn: 'A harness round the chest, for long walks.' },
  { key: 'coat', nl: 'Jasje', en: 'Coat', price: 30, icon: '🧥', aboutNl: 'Een warm dekje over de rug. Windhonden hebben het snel koud.', aboutEn: 'A warm coat over the back. Sighthounds feel the cold quickly.' },
  { key: 'sweater', nl: 'Trui', en: 'Sweater', price: 35, icon: '🧶', aboutNl: 'Een gebreide trui met rolkraag.', aboutEn: 'A knitted sweater with a roll neck.' },
] as const;
export type PetWear = (typeof PET_WEAR)[number]['key'];
export const petWearByKey = (key: string | null | undefined) => PET_WEAR.find((w) => w.key === key);
export const petWearItem = (key: string) => `petwear_${key}`;

/** How the pet looks: breed and coat, plus the salon's colour and what it wears. */
export type PetLook = { key: string; coat: number; color?: string | null; wear?: string | null };
