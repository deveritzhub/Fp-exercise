/**
 * Original FP Flow cosmetic collections.
 * No clinical milestones, strength bonuses or activity pressure: these are coin-shop visuals only.
 * Every key has a distinct anatomically anchored 2D design (CollectionGear.tsx).
 */
export type CollectionSlot = 'head' | 'neck' | 'chest' | 'back' | 'arm' | 'wrist' | 'hands' | 'waist' | 'legs' | 'feet' | 'held' | 'outfit';
type Piece = { key: string; nl: string; en: string; slot: CollectionSlot; score: number };
type Collection = {
  key: string; nl: string; en: string; descriptionNl: string; descriptionEn: string;
  tier: 1 | 2 | 3 | 4 | 5; accent: string; items: readonly Piece[];
};

/** Five distinct playable sets across the established five rarity tiers. */
export const GEAR_COLLECTIONS = [
  {
    key: 'gym_starter', nl: 'Gym Starter', en: 'Gym Starter', tier: 1, accent: '#667367',
    descriptionNl: 'De eerste trainingsheld', descriptionEn: 'Your first training hero',
    items: [
      { key: 'warmup_hoodie', nl: 'Warm-up hoodie', en: 'Warm-up hoodie', slot: 'outfit', score: 10 },
      { key: 'gym_bandana', nl: 'Sportbandana', en: 'Gym bandana', slot: 'head', score: 8 },
      { key: 'foam_roller', nl: 'Foamroller', en: 'Foam roller', slot: 'held', score: 9 },
      { key: 'basic_sneakers', nl: 'Gymsneakers', en: 'Gym sneakers', slot: 'feet', score: 10 },
    ],
  },
  {
    key: 'trail_explorer', nl: 'Trail Explorer', en: 'Trail Explorer', tier: 2, accent: '#3a7a57',
    descriptionNl: 'Van oefenzaal naar buiten', descriptionEn: 'From the studio to the outdoors',
    items: [
      { key: 'trail_runner', nl: 'Trailjack met tights', en: 'Trail jacket & tights', slot: 'outfit', score: 24 },
      { key: 'trail_cap', nl: 'Trailpet', en: 'Trail cap', slot: 'head', score: 21 },
      { key: 'hydration_pack', nl: 'Hydratierugzak', en: 'Hydration pack', slot: 'back', score: 25 },
      { key: 'trail_shoes', nl: 'Trailschoenen', en: 'Trail shoes', slot: 'feet', score: 25 },
    ],
  },
  {
    key: 'arena_athlete', nl: 'Arena Athlete', en: 'Arena Athlete', tier: 3, accent: '#39669d',
    descriptionNl: 'Explosieve sportschooluitrusting', descriptionEn: 'The athlete’s training kit',
    items: [
      { key: 'arena_uniform', nl: 'Arena-sporttenue', en: 'Arena sports kit', slot: 'outfit', score: 46 },
      { key: 'compression_knee', nl: 'Compressiekniekous', en: 'Knee compression sleeve', slot: 'legs', score: 43 },
      { key: 'kettlebell', nl: 'Kettlebell', en: 'Kettlebell', slot: 'held', score: 45 },
      { key: 'pulse_medallion', nl: 'Pulse-amulet', en: 'Pulse amulet', slot: 'neck', score: 42 },
    ],
  },
  {
    key: 'kyokushin_fighter', nl: 'Kyokushin Fighter', en: 'Kyokushin Fighter', tier: 4, accent: '#81539b',
    descriptionNl: 'Witte karate-gi en zwarte obi — zonder officieel bondsembleem',
    descriptionEn: 'White karate gi and black obi — no official federation crest',
    items: [
      { key: 'kyokushin_gi', nl: 'Kyokushin-karatepak', en: 'Kyokushin karate gi', slot: 'outfit', score: 78 },
      { key: 'karate_obi', nl: 'Zwarte karateband', en: 'Black karate belt', slot: 'waist', score: 76 },
      { key: 'karate_wraps', nl: 'Karate-handwikkels', en: 'Karate hand wraps', slot: 'hands', score: 69 },
      { key: 'dojo_headband', nl: 'Dojo-hoofdband', en: 'Dojo headband', slot: 'head', score: 67 },
      { key: 'dojo_medal', nl: 'Dojo-medaille', en: 'Dojo medal', slot: 'neck', score: 72 },
    ],
  },
  {
    key: 'astral_champion', nl: 'Astral Champion', en: 'Astral Champion', tier: 5, accent: '#b89234',
    descriptionNl: 'Een fantasieheld met sterrenuitrusting', descriptionEn: 'A fantasy champion forged from starlight',
    items: [
      { key: 'astral_armor', nl: 'Sterrenharnas', en: 'Astral armor', slot: 'outfit', score: 99 },
      { key: 'phoenix_wings', nl: 'Feniksvleugels', en: 'Phoenix wings', slot: 'back', score: 97 },
      { key: 'comet_boots', nl: 'Komeetlaarzen', en: 'Comet boots', slot: 'feet', score: 95 },
      { key: 'star_staff', nl: 'Sterrenstaf', en: 'Star staff', slot: 'held', score: 98 },
      { key: 'aurora_halo', nl: 'Aurora-halo', en: 'Aurora halo', slot: 'head', score: 96 },
    ],
  },
] as const satisfies readonly Collection[];

export const COLLECTION_GEAR = GEAR_COLLECTIONS.flatMap(group =>
  group.items.map(item => ({ ...item, tier: group.tier, collection: group.key })),
);
export const COLLECTION_ITEM_KEYS: ReadonlySet<string> = new Set(COLLECTION_GEAR.map(item => item.key));
export const COLLECTION_OUTFIT_KEYS: ReadonlySet<string> = new Set(COLLECTION_GEAR.filter(item => item.slot === 'outfit').map(item => item.key));
export const COLLECTION_BACK_KEYS: ReadonlySet<string> = new Set(COLLECTION_GEAR.filter(item => item.slot === 'back').map(item => item.key));
