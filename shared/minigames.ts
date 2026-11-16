/**
 * The little games next to the village: each one is play that also helps recovery (balance, reaction,
 * moving, breathing, eating well, knowing about pain, walking). A round ends in a score; the score
 * gives 0 to 3 stars, and stars give adventure XP for the hero, for the first few rounds of each game
 * a day. The best score per game is kept.
 *
 * `stars` are the scores for one, two and three stars (higher is better for every game).
 */
export type MinigameKind = 'move' | 'food' | 'mind' | 'daily';
export type Minigame = {
  key: MinigameKey;
  kind: MinigameKind;
  nl: string;
  en: string;
  /** One line under the name: what you do and what it is good for. */
  aboutNl: string;
  aboutEn: string;
  icon: string;
  /** The score for one, two and three stars. */
  stars: [number, number, number];
  /** The most a round can score (anything above is not believed). */
  max: number;
  /** What the score counts, for the result screen. */
  unitNl: string;
  unitEn: string;
};

export const MINIGAME_KEYS = ['balance', 'reaction', 'mirror', 'rhythm', 'plate', 'market', 'breath', 'pain_facts', 'journey'] as const;
export type MinigameKey = (typeof MINIGAME_KEYS)[number];

export const MINIGAMES: Minigame[] = [
  { key: 'balance', kind: 'move', icon: '⚖️', nl: 'Balansbal', en: 'Balance ball', aboutNl: 'Sta op één been en houd het balletje in het midden. Traint je balans.', aboutEn: 'Stand on one leg and keep the ball in the middle. Trains your balance.', stars: [40, 65, 85], max: 100, unitNl: 'punten', unitEn: 'points' },
  { key: 'reaction', kind: 'move', icon: '💡', nl: 'Reactielichtjes', en: 'Reaction lights', aboutNl: 'Tik de lampjes zo snel mogelijk weg. Goed voor je reactie en tegen vallen.', aboutEn: 'Tap the lights out as fast as you can. Good for reaction and against falls.', stars: [12, 20, 28], max: 80, unitNl: 'lampjes', unitEn: 'lights' },
  { key: 'mirror', kind: 'move', icon: '🪞', nl: 'Spiegelspel', en: 'Mirror game', aboutNl: 'De camera kijkt mee: raak de doelen aan met je handen. Goed voor je bewegingsuitslag.', aboutEn: 'The camera watches: touch the targets with your hands. Good for your range of motion.', stars: [6, 11, 16], max: 60, unitNl: 'doelen', unitEn: 'targets' },
  { key: 'rhythm', kind: 'move', icon: '🥁', nl: 'Ritme-herhalingen', en: 'Rhythm reps', aboutNl: 'Doe je oefening op de maat en tik op de tel. Herhalingen worden muziek.', aboutEn: 'Do your exercise to the beat and tap on the count. Reps become music.', stars: [50, 70, 88], max: 100, unitNl: '% op de maat', unitEn: '% on the beat' },
  { key: 'plate', kind: 'food', icon: '🍽️', nl: 'Bord vullen', en: 'Fill the plate', aboutNl: 'Stel een maaltijd samen die je doel haalt: eiwit, groente en niet te veel.', aboutEn: 'Make a meal that hits your goal: protein, vegetables and not too much.', stars: [50, 75, 92], max: 100, unitNl: 'punten', unitEn: 'points' },
  { key: 'market', kind: 'food', icon: '🛒', nl: 'Supermarktsprint', en: 'Supermarket sprint', aboutNl: 'Pak de gezonde, eiwitrijke producten van de band. Laat de rest liggen.', aboutEn: 'Grab the healthy, protein-rich products from the belt. Leave the rest.', stars: [10, 18, 26], max: 80, unitNl: 'punten', unitEn: 'points' },
  { key: 'breath', kind: 'mind', icon: '🫧', nl: 'Ademhalingsbol', en: 'Breathing orb', aboutNl: 'Adem rustig mee met de bol. Goed voor ontspanning, slaap en pijn.', aboutEn: 'Breathe calmly with the orb. Good for relaxing, sleep and pain.', stars: [3, 6, 10], max: 30, unitNl: 'rustige ademhalingen', unitEn: 'calm breaths' },
  { key: 'pain_facts', kind: 'mind', icon: '🧠', nl: 'Pijn: mythe of feit?', en: 'Pain: myth or fact?', aboutNl: 'Klopt het of niet? Leer hoe pijn echt werkt.', aboutEn: 'True or not? Learn how pain really works.', stars: [5, 7, 9], max: 10, unitNl: 'goed', unitEn: 'right' },
  { key: 'journey', kind: 'daily', icon: '🗺️', nl: 'Stappenreis', en: 'Step journey', aboutNl: 'Je echte stappen brengen je verder over de kaart, van mijlpaal naar mijlpaal.', aboutEn: 'Your real steps take you along the map, from milestone to milestone.', stars: [1, 3, 6], max: 12, unitNl: 'mijlpalen', unitEn: 'milestones' },
];

export const minigameByKey = (key: string | null | undefined): Minigame | null => MINIGAMES.find((g) => g.key === key) ?? null;

/** Stars (0..3) for a score. */
export function starsFor(game: Minigame, score: number): number {
  return game.stars.filter((s) => score >= s).length;
}

/** Adventure XP for a rewarded round: a little for playing, more per star. */
export const minigameXp = (stars: number) => 4 + stars * 6;
/** The game of the day (by date, the same for everyone): its rewarded rounds give double XP. */
export function minigameOfDay(date: string): MinigameKey {
  const days = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
  return MINIGAME_KEYS[((days % MINIGAME_KEYS.length) + MINIGAME_KEYS.length) % MINIGAME_KEYS.length];
}
export const GAME_OF_DAY_BONUS = 2;
/** Rounds of each game a day that give XP (more rounds can be played for fun and a best score). */
export const MINIGAME_REWARDED_PER_DAY = 3;

/** The milestones of the step journey (total steps since the patient started), with a name. */
export const JOURNEY = [
  { steps: 5_000, nl: 'De rand van het dorp', en: 'The edge of the village' },
  { steps: 15_000, nl: 'De molen', en: 'The windmill' },
  { steps: 30_000, nl: 'Het bos', en: 'The forest' },
  { steps: 50_000, nl: 'De rivier', en: 'The river' },
  { steps: 80_000, nl: 'De heuvels', en: 'The hills' },
  { steps: 120_000, nl: 'Het meer', en: 'The lake' },
  { steps: 170_000, nl: 'De kust', en: 'The coast' },
  { steps: 230_000, nl: 'De vuurtoren', en: 'The lighthouse' },
  { steps: 300_000, nl: 'De bergpas', en: 'The mountain pass' },
  { steps: 400_000, nl: 'Het hoogland', en: 'The highlands' },
  { steps: 520_000, nl: 'De top', en: 'The summit' },
  { steps: 700_000, nl: 'Het land van het licht', en: 'The land of light' },
] as const;

/** How many milestones these steps reach. */
export const journeyReached = (steps: number) => JOURNEY.filter((m) => steps >= m.steps).length;
