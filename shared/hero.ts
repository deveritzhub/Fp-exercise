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
  frame: ['f', 'm'], // body type: feminine or masculine build
  build: ['slim', 'average', 'athletic', 'full'],
  skin: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'],
  hair: ['short', 'long', 'ponytail', 'bun', 'curly', 'afro', 'buzz', 'none'],
  hairColor: ['black', 'darkbrown', 'brown', 'blond', 'red', 'grey'],
  eyeColor: ['brown', 'darkbrown', 'blue', 'green', 'hazel', 'grey'],
  beard: ['none', 'stubble', 'moustache', 'beard'],
  glasses: ['none', 'round', 'square'],
  outfit: ['forest', 'sand', 'ocean', 'berry', 'slate', 'sun'],
  sport: ['running', 'football', 'fitness', 'cycling', 'tennis', 'swimming', 'hockey', 'dance', 'walking', 'other'],
} as const;

export type HeroLook = {
  heroName: string;
  frame: string;
  build: string;
  skin: string;
  hair: string;
  hairColor: string;
  eyeColor: string;
  beard: string;
  glasses: string;
  outfit: string;
  sport: string;
};

export const DEFAULT_LOOK: Omit<HeroLook, 'heroName'> = {
  frame: 'f', build: 'average', skin: 's4', hair: 'long', hairColor: 'darkbrown', eyeColor: 'brown', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running',
};

export const validLook = (l: HeroLook) =>
  (Object.keys(DEFAULT_LOOK) as (keyof typeof DEFAULT_LOOK)[]).every((k) => (HERO_OPTIONS[k] as readonly string[]).includes(l[k]));

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

// ----------------------------------------------------------------------------------------------
// Skills (RuneScape-style): each skill levels from 1 to 99 on its own
// ----------------------------------------------------------------------------------------------

export type SkillKey = 'strength' | 'mobility' | 'balance' | 'stability' | 'power' | 'endurance' | 'sport' | 'discipline' | 'recovery';

export const SKILLS: { key: SkillKey; nl: string; en: string; howNl: string; howEn: string }[] = [
  { key: 'strength', nl: 'Kracht', en: 'Strength', howNl: 'Krachtoefeningen en gelogde sets.', howEn: 'Strength exercises and logged sets.' },
  { key: 'mobility', nl: 'Mobiliteit', en: 'Mobility', howNl: 'Mobiliteits- en rekoefeningen.', howEn: 'Mobility and stretching exercises.' },
  { key: 'balance', nl: 'Balans', en: 'Balance', howNl: 'Balansoefeningen.', howEn: 'Balance exercises.' },
  { key: 'stability', nl: 'Stabiliteit', en: 'Stability', howNl: 'Rompstabiliteit en motorische controle.', howEn: 'Core stability and motor control.' },
  { key: 'power', nl: 'Explosief', en: 'Power', howNl: 'Spring- en landingsoefeningen (plyometrie).', howEn: 'Jumping and landing (plyometrics).' },
  { key: 'endurance', nl: 'Conditie', en: 'Endurance', howNl: 'Conditie- en loopoefeningen.', howEn: 'Conditioning and walking exercises.' },
  { key: 'sport', nl: 'Techniek', en: 'Technique', howNl: 'Sportspecifieke oefeningen.', howEn: 'Sport-specific exercises.' },
  { key: 'discipline', nl: 'Discipline', en: 'Discipline', howNl: 'Trainingen afronden en volle weken halen.', howEn: 'Completing workouts and full weeks.' },
  { key: 'recovery', nl: 'Herstel', en: 'Recovery', howNl: 'Je pijn doorgeven, je pijnkaart bijhouden en minder pijn krijgen.', howEn: 'Reporting pain, keeping your body map and having less pain.' },
];

/** Which skills an exercise trains, from its training categories and movement category. */
export function skillsForExercise(trainingCategories: string[], movementCategory: string | null): SkillKey[] {
  const out = new Set<SkillKey>();
  for (const c of trainingCategories) {
    if (['strength', 'isometric', 'eccentric', 'concentric'].includes(c)) out.add('strength');
    if (['mobility', 'neurodynamics'].includes(c)) out.add('mobility');
    if (c === 'balance') out.add('balance');
    if (['motor_control', 'neuromuscular'].includes(c)) out.add('stability');
    if (c === 'plyometrics') out.add('power');
    if (c === 'conditioning') out.add('endurance');
    if (c === 'sport_specific') out.add('sport');
  }
  if (movementCategory === 'core_stability') out.add('stability');
  if (movementCategory === 'stretch') out.add('mobility');
  if (movementCategory === 'jump') out.add('power');
  if (movementCategory === 'gait') out.add('endurance');
  if (['squat', 'hinge', 'lunge', 'push', 'pull', 'carry', 'raise'].includes(movementCategory ?? '') && !out.size) out.add('strength');
  return [...out];
}

export const SKILL_XP = {
  exercise: 10, // per completed exercise, for every skill it trains
  strengthSet: 2, // per logged strength set (Kracht)
  session: 20, // Discipline, per completed workout
  fullWeek: 50, // Discipline, per week with every planned day done
  painReported: 15, // Herstel, per workout with a pain score
  painCheckin: 30, // Herstel, per week with a body-map check-in
  painPointDown: 40, // Herstel, per point the average pain went down since the start
} as const;

/** XP needed for a skill level (1–99): a long climb, like RuneScape, but early levels come fast. */
export const skillXpForLevel = (level: number) => Math.round(25 * Math.pow(level - 1, 1.8));

export function skillLevel(xp: number) {
  let level = 1;
  while (level < 99 && xp >= skillXpForLevel(level + 1)) level++;
  const from = skillXpForLevel(level);
  const to = level === 99 ? from : skillXpForLevel(level + 1);
  return { level, xp, from, to, progress: level === 99 ? 1 : (xp - from) / (to - from) };
}

// ----------------------------------------------------------------------------------------------
// Quest: the road to the goal of a phased programme
// ----------------------------------------------------------------------------------------------

/** "5-8" → { from: 5, to: 8 }; anything else → null. */
export function parseWeeks(w: string | null | undefined) {
  const m = /(\d+)\s*[-–]\s*(\d+)/.exec(w ?? '');
  return m ? { from: Number(m[1]), to: Number(m[2]) } : null;
}

/**
 * Where the patient is on the route and when the goal is expected according to the schedule.
 * `phaseStart` is the start date of the current phase's programme. The expectation is the plan,
 * not a promise: the therapist decides when the next phase starts.
 */
export function questTimeline(input: { phases: { no: number; weeks: string | null }[]; currentNo: number; phaseStart: string | null; today?: Date }) {
  const today = input.today ?? new Date();
  const cur = parseWeeks(input.phases.find((p) => p.no === input.currentNo)?.weeks);
  const last = parseWeeks([...input.phases].sort((a, b) => b.no - a.no)[0]?.weeks);
  if (!cur || !last || !input.phaseStart) return null;
  const start = new Date(input.phaseStart + 'T12:00:00');
  const seriesStart = new Date(start.getTime() - (cur.from - 1) * 7 * 86400_000);
  const totalWeeks = last.to;
  const elapsedWeeks = Math.max(0, (today.getTime() - seriesStart.getTime()) / (7 * 86400_000));
  const week = Math.min(totalWeeks, Math.floor(elapsedWeeks) + 1);
  const expectedEnd = new Date(seriesStart.getTime() + totalWeeks * 7 * 86400_000);
  const weeksLeft = Math.max(0, Math.ceil((expectedEnd.getTime() - today.getTime()) / (7 * 86400_000)));
  return { week, totalWeeks, progress: Math.min(1, elapsedWeeks / totalWeeks), expectedEnd: expectedEnd.toISOString().slice(0, 10), weeksLeft };
}

// ----------------------------------------------------------------------------------------------
// Weekly quests: three small goals per week (Monday–Sunday). Optional: no penalty for missing one,
// and the training goal never asks for more than the days the therapist planned.
// ----------------------------------------------------------------------------------------------

export const QUEST_XP = 40; // per quest completed
export const CHEST_XP = 100; // all three quests of a week: the week chest

export type WeekData = { planned: number; trainedDays: number; checkins: number; skillLogs: Partial<Record<SkillKey, number>> };
export type Quest = { key: 'train' | 'checkin' | 'skill'; skill?: SkillKey; target: number; progress: number; done: boolean };

/** The skill of the week rotates through the skills the patient's own exercises train. */
export function skillOfWeek(weekStart: string, skills: SkillKey[]): SkillKey {
  const list = skills.length ? [...new Set(skills)].sort() : (['mobility'] as SkillKey[]);
  const weekNo = Math.floor(new Date(weekStart + 'T12:00:00Z').getTime() / (7 * 86400_000));
  return list[weekNo % list.length];
}

export function weeklyQuests(w: WeekData, skill: SkillKey): Quest[] {
  const trainTarget = w.planned > 0 ? Math.min(w.planned, 3) : 1;
  const q = (key: Quest['key'], target: number, progress: number, extra: Partial<Quest> = {}): Quest => ({ key, target, progress: Math.min(progress, target), done: progress >= target, ...extra });
  return [
    q('train', trainTarget, w.trainedDays),
    q('checkin', 1, w.checkins),
    q('skill', 2, w.skillLogs[skill] ?? 0, { skill }),
  ];
}

export const questXp = (quests: Quest[]) => quests.filter((q) => q.done).length * QUEST_XP + (quests.every((q) => q.done) ? CHEST_XP : 0);

// ----------------------------------------------------------------------------------------------
// Gear: items for the hero, unlocked by real progress; the patient chooses what to wear.
// ----------------------------------------------------------------------------------------------

/** Hero level counts as 1 when a caller does not pass one (level gear stays locked). */
export type GearInput = { skills: Partial<Record<SkillKey, number>>; sessions: number; phasesCompleted: number; chestWeeks: number; level?: number };

const lvl = (g: GearInput) => g.level ?? 1;
const skill = (g: GearInput, key: SkillKey) => g.skills[key] ?? 1;

export const GEAR: { key: string; nl: string; en: string; unlockNl: string; unlockEn: string; unlocked: (g: GearInput) => boolean }[] = [
  // Hero level
  { key: 'pin', nl: 'Borstspeld', en: 'Chest pin', unlockNl: 'Level 2', unlockEn: 'Level 2', unlocked: (g) => lvl(g) >= 2 },
  { key: 'visor', nl: 'Klep', en: 'Visor', unlockNl: 'Level 4', unlockEn: 'Level 4', unlocked: (g) => lvl(g) >= 4 },
  { key: 'crown', nl: 'Kroon', en: 'Crown', unlockNl: 'Level 12', unlockEn: 'Level 12', unlocked: (g) => lvl(g) >= 12 },
  // One wearable per skill, plus a harder step for strength and discipline
  { key: 'headband', nl: 'Zweetband', en: 'Headband', unlockNl: 'Discipline level 5', unlockEn: 'Discipline level 5', unlocked: (g) => skill(g, 'discipline') >= 5 },
  { key: 'headphones', nl: 'Koptelefoon', en: 'Headphones', unlockNl: 'Discipline level 8', unlockEn: 'Discipline level 8', unlocked: (g) => skill(g, 'discipline') >= 8 },
  { key: 'wristbands', nl: 'Polsbandjes', en: 'Wristbands', unlockNl: 'Kracht level 5', unlockEn: 'Strength level 5', unlocked: (g) => skill(g, 'strength') >= 5 },
  { key: 'gloves', nl: 'Handschoenen', en: 'Gloves', unlockNl: 'Kracht level 8', unlockEn: 'Strength level 8', unlocked: (g) => skill(g, 'strength') >= 8 },
  { key: 'cap', nl: 'Pet', en: 'Cap', unlockNl: 'Mobiliteit level 5', unlockEn: 'Mobility level 5', unlocked: (g) => skill(g, 'mobility') >= 5 },
  { key: 'watch', nl: 'Sportwatch', en: 'Sports watch', unlockNl: 'Balans level 5', unlockEn: 'Balance level 5', unlocked: (g) => skill(g, 'balance') >= 5 },
  { key: 'knee_support', nl: 'Kniebanden', en: 'Knee sleeves', unlockNl: 'Stabiliteit level 5', unlockEn: 'Stability level 5', unlocked: (g) => skill(g, 'stability') >= 5 },
  { key: 'sleeve', nl: 'Compressiemouw', en: 'Compression sleeve', unlockNl: 'Explosief level 5', unlockEn: 'Power level 5', unlocked: (g) => skill(g, 'power') >= 5 },
  { key: 'crew_socks', nl: 'Sportsokken', en: 'Sports socks', unlockNl: 'Conditie level 5', unlockEn: 'Endurance level 5', unlocked: (g) => skill(g, 'endurance') >= 5 },
  { key: 'shin_guards', nl: 'Scheenbeschermers', en: 'Shin guards', unlockNl: 'Techniek level 5', unlockEn: 'Technique level 5', unlocked: (g) => skill(g, 'sport') >= 5 },
  { key: 'scarf', nl: 'Sjaal', en: 'Scarf', unlockNl: 'Herstel level 5', unlockEn: 'Recovery level 5', unlocked: (g) => skill(g, 'recovery') >= 5 },
  // Kept from the first closet: weeks, a finished phase, workouts
  { key: 'captain', nl: 'Aanvoerdersband', en: 'Captain’s armband', unlockNl: '3 weken alle weekquests', unlockEn: '3 weeks with all weekly quests', unlocked: (g) => g.chestWeeks >= 3 },
  { key: 'medal', nl: 'Medaille', en: 'Medal', unlockNl: 'Een fase van je revalidatie voltooid', unlockEn: 'A phase of your rehabilitation completed', unlocked: (g) => g.phasesCompleted >= 1 },
  { key: 'gold_shoes', nl: 'Gouden schoenen', en: 'Golden shoes', unlockNl: '25 trainingen', unlockEn: '25 workouts', unlocked: (g) => g.sessions >= 25 },
];
export const GEAR_KEYS = new Set(GEAR.map((g) => g.key));

/**
 * Self-reported body measurements the patient types in next to the avatar.
 * Optional, not a clinic measurement and not a health score.
 */
export const METRICS = {
  weightKg: { min: 20, max: 300 },
  bodyFatPct: { min: 2, max: 60 },
  heightCm: { min: 100, max: 230 },
} as const;

/** Blank → null. Comma or dot. One decimal. Not a number → null (the form shows its own error). */
export function parseMetric(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(Number(t) * 10) / 10;
  return Number.isFinite(n) ? n : null;
}

export function metricInRange(kind: keyof typeof METRICS, value: number | null) {
  if (value === null) return true;
  const { min, max } = METRICS[kind];
  return value >= min && value <= max;
}

/** Daily check-in: a quick score for the main sore area (or how you feel overall). */
export const CHECKIN_XP = 5; // hero XP and Herstel XP per day
export const GENERAL_AREA = 'general';
