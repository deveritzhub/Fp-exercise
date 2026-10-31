/**
 * Sports hero (gamified revalidatie). Pure rules shared by server and app:
 * - body areas for the pain map, with their place on the front/back figure;
 * - XP, levels and titles; badges.
 *
 * Safety by design: XP rewards doing the programme and reporting honestly (pain scores, warning
 * signs). It never rewards training through pain, has no penalty for rest days and no streak
 * pressure, and moving to the next phase stays the therapist's decision.
 */

export type Side = 'front' | 'back';
/** x/y in a 200 × 420 figure; left/right are the patient's own sides (mirrored on the front view). */
export type BodyArea = { key: string; nl: string; en: string; side: Side; x: number; y: number };

export const BODY_AREAS: BodyArea[] = [
  { key: 'head', nl: 'Hoofd', en: 'Head', side: 'front', x: 100, y: 34 },
  { key: 'neck', nl: 'Nek', en: 'Neck', side: 'back', x: 100, y: 74 },
  { key: 'shoulder_r', nl: 'Rechterschouder', en: 'Right shoulder', side: 'front', x: 62, y: 96 },
  { key: 'shoulder_l', nl: 'Linkerschouder', en: 'Left shoulder', side: 'front', x: 138, y: 96 },
  { key: 'chest', nl: 'Borst', en: 'Chest', side: 'front', x: 100, y: 118 },
  { key: 'upper_back', nl: 'Bovenrug', en: 'Upper back', side: 'back', x: 100, y: 116 },
  { key: 'elbow_r', nl: 'Rechterelleboog', en: 'Right elbow', side: 'front', x: 44, y: 156 },
  { key: 'elbow_l', nl: 'Linkerelleboog', en: 'Left elbow', side: 'front', x: 156, y: 156 },
  { key: 'abdomen', nl: 'Buik', en: 'Abdomen', side: 'front', x: 100, y: 168 },
  { key: 'lower_back', nl: 'Onderrug', en: 'Lower back', side: 'back', x: 100, y: 176 },
  { key: 'wrist_r', nl: 'Rechterpols en -hand', en: 'Right wrist and hand', side: 'front', x: 30, y: 210 },
  { key: 'wrist_l', nl: 'Linkerpols en -hand', en: 'Left wrist and hand', side: 'front', x: 170, y: 210 },
  { key: 'hip_r', nl: 'Rechterheup', en: 'Right hip', side: 'front', x: 74, y: 212 },
  { key: 'hip_l', nl: 'Linkerheup', en: 'Left hip', side: 'front', x: 126, y: 212 },
  { key: 'buttock_l', nl: 'Linkerbil', en: 'Left buttock', side: 'back', x: 78, y: 222 },
  { key: 'buttock_r', nl: 'Rechterbil', en: 'Right buttock', side: 'back', x: 122, y: 222 },
  { key: 'thigh_r', nl: 'Rechterbovenbeen', en: 'Right thigh', side: 'front', x: 78, y: 262 },
  { key: 'thigh_l', nl: 'Linkerbovenbeen', en: 'Left thigh', side: 'front', x: 122, y: 262 },
  { key: 'hamstring_l', nl: 'Linkerhamstring', en: 'Left hamstring', side: 'back', x: 78, y: 268 },
  { key: 'hamstring_r', nl: 'Rechterhamstring', en: 'Right hamstring', side: 'back', x: 122, y: 268 },
  { key: 'knee_r', nl: 'Rechterknie', en: 'Right knee', side: 'front', x: 80, y: 298 },
  { key: 'knee_l', nl: 'Linkerknie', en: 'Left knee', side: 'front', x: 120, y: 298 },
  { key: 'calf_l', nl: 'Linkerkuit', en: 'Left calf', side: 'back', x: 80, y: 344 },
  { key: 'calf_r', nl: 'Rechterkuit', en: 'Right calf', side: 'back', x: 120, y: 344 },
  { key: 'ankle_r', nl: 'Rechterenkel en -voet', en: 'Right ankle and foot', side: 'front', x: 80, y: 392 },
  { key: 'ankle_l', nl: 'Linkerenkel en -voet', en: 'Left ankle and foot', side: 'front', x: 120, y: 392 },
];
export const AREA_KEYS = new Set(BODY_AREAS.map((a) => a.key));

/** Looks of the hero: a few calm choices, all in the app's own colours. */
export const HERO_OPTIONS = {
  skin: ['s1', 's2', 's3', 's4', 's5', 's6'],
  hair: ['short', 'long', 'curly', 'bun', 'buzz', 'none'],
  outfit: ['forest', 'sand', 'ocean', 'berry', 'slate', 'sun'],
  sport: ['running', 'football', 'fitness', 'cycling', 'tennis', 'swimming', 'hockey', 'dance', 'walking', 'other'],
} as const;

export type HeroLook = { heroName: string; skin: string; hair: string; outfit: string; sport: string };

export const validLook = (l: HeroLook) =>
  HERO_OPTIONS.skin.includes(l.skin as never) &&
  HERO_OPTIONS.hair.includes(l.hair as never) &&
  HERO_OPTIONS.outfit.includes(l.outfit as never) &&
  HERO_OPTIONS.sport.includes(l.sport as never);

// ----------------------------------------------------------------------------------------------
// XP and levels
// ----------------------------------------------------------------------------------------------

export const XP = {
  session: 50, // a completed workout
  painReported: 10, // pain score given after the workout (honesty, also when it is high)
  redFlag: 25, // a warning sign reported: the right thing to do
  painCheckin: 30, // body map updated (at most once per week counts)
} as const;

export type XpInput = { sessions: number; sessionsWithPain: number; redFlags: number; checkinWeeks: number };

export const xpFor = (i: XpInput) =>
  i.sessions * XP.session + i.sessionsWithPain * XP.painReported + i.redFlags * XP.redFlag + i.checkinWeeks * XP.painCheckin;

/** XP needed to reach a level: 0, 100, 300, 600, 1000, … (grows gently). */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelFor(xp: number) {
  let level = 1;
  while (level < 99 && xp >= xpForLevel(level + 1)) level++;
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return { level, xp, from, to, progress: (xp - from) / (to - from) };
}

const TITLES: [number, string, string][] = [
  [1, 'Rookie', 'Rookie'],
  [2, 'Starter', 'Starter'],
  [3, 'Teamspeler', 'Team player'],
  [5, 'Doorzetter', 'Go-getter'],
  [8, 'Atleet', 'Athlete'],
  [12, 'Kampioen', 'Champion'],
  [18, 'Legende', 'Legend'],
];
export const titleFor = (level: number, nl = true) => {
  const t = [...TITLES].reverse().find(([min]) => level >= min)!;
  return nl ? t[1] : t[2];
};

// ----------------------------------------------------------------------------------------------
// Badges
// ----------------------------------------------------------------------------------------------

export type BadgeInput = {
  sessions: number;
  sessionsWithPain: number;
  redFlags: number;
  fullWeeks: number; // weeks with every planned training day done
  phasesCompleted: number;
  painBaseline: number | null; // average pain at the first body map
  painNow: number | null; // average pain at the latest body map
};

export const BADGES: { key: string; nl: string; en: string; descNl: string; descEn: string; earned: (b: BadgeInput) => boolean }[] = [
  { key: 'first_session', nl: 'Aftrap', en: 'Kick-off', descNl: 'Je eerste training gedaan.', descEn: 'Your first workout done.', earned: (b) => b.sessions >= 1 },
  { key: 'full_week', nl: 'Volle week', en: 'Full week', descNl: 'Een week alle geplande trainingen gedaan.', descEn: 'Every planned workout of a week done.', earned: (b) => b.fullWeeks >= 1 },
  { key: 'sessions_10', nl: 'Tien op rij', en: 'Ten down', descNl: '10 trainingen afgerond.', descEn: '10 workouts completed.', earned: (b) => b.sessions >= 10 },
  { key: 'honest', nl: 'Eerlijk spel', en: 'Fair play', descNl: '5 keer je pijn doorgegeven na een training.', descEn: 'Reported your pain after 5 workouts.', earned: (b) => b.sessionsWithPain >= 5 },
  { key: 'safety_first', nl: 'Veilig gemeld', en: 'Safety first', descNl: 'Een alarmsignaal gemeld: precies goed.', descEn: 'Reported a warning sign: exactly right.', earned: (b) => b.redFlags >= 1 },
  { key: 'pain_down', nl: 'Op de weg terug', en: 'On the way back', descNl: 'Je pijn is gehalveerd sinds je startmeting.', descEn: 'Your pain has halved since your first check-in.', earned: (b) => b.painBaseline !== null && b.painNow !== null && b.painBaseline > 0 && b.painNow <= b.painBaseline / 2 },
  { key: 'phase_done', nl: 'Fase voltooid', en: 'Phase complete', descNl: 'Een fase van je revalidatie afgerond.', descEn: 'Completed a phase of your rehabilitation.', earned: (b) => b.phasesCompleted >= 1 },
  { key: 'sessions_25', nl: 'Vaste waarde', en: 'Regular', descNl: '25 trainingen afgerond.', descEn: '25 workouts completed.', earned: (b) => b.sessions >= 25 },
];

/** Average of the scores in one body-map check-in (null without areas). */
export const averagePain = (scores: number[]) => (scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null);
