import { isoWeekday, parseDate } from './adherence';

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
  /** Main sport (the first of `sports`). */
  sport: string;
  /** All sports the patient does. */
  sports?: string[];
  /** Playing as a guest hero (photo key), or null. */
  photoKey?: string | null;
};

export const DEFAULT_LOOK: Omit<HeroLook, 'heroName' | 'sports' | 'photoKey'> = {
  frame: 'f', build: 'average', skin: 's4', hair: 'long', hairColor: 'darkbrown', eyeColor: 'brown', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running',
};

export const validLook = (l: HeroLook) =>
  (Object.keys(DEFAULT_LOOK) as (keyof typeof DEFAULT_LOOK)[]).every((k) => (HERO_OPTIONS[k] as readonly string[]).includes(l[k])) &&
  (l.sports ?? []).every((s) => (HERO_OPTIONS.sport as readonly string[]).includes(s));

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
  /** Weekly bosses beaten, and the longest run of day chests (both optional for older callers). */
  bossesDefeated?: number;
  chestRunBest?: number;
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
  { key: 'boss_hunter', nl: 'Bazenjager', en: 'Boss hunter', descNl: 'Drie bazen van de week verslagen.', descEn: 'Three bosses of the week defeated.', earned: (b) => (b.bossesDefeated ?? 0) >= 3 },
  { key: 'chest_week', nl: 'Trouwe kistenopener', en: 'Loyal chest opener', descNl: 'Zeven dagen op rij je dagkist geopend.', descEn: 'Opened your day chest seven days in a row.', earned: (b) => (b.chestRunBest ?? 0) >= 7 },
];

/** Longest run of consecutive days (YYYY-MM-DD) in a list. */
export function longestDayRun(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = Date.parse(d + 'T12:00:00Z') / 86400_000;
    run = prev !== null && Math.round(t - prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** Average of the scores in one body-map check-in (null without areas). */
export const averagePain = (scores: number[]) => (scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null);

// ----------------------------------------------------------------------------------------------
// Skills (RuneScape-style): each skill levels from 1 to 99 on its own
// ----------------------------------------------------------------------------------------------

export type SkillKey = 'strength' | 'mobility' | 'balance' | 'stability' | 'power' | 'endurance' | 'sport' | 'discipline' | 'recovery' | 'knowledge';

export const SKILLS: { key: SkillKey; nl: string; en: string; howNl: string; howEn: string }[] = [
  { key: 'strength', nl: 'Kracht', en: 'Strength', howNl: 'Geplande krachtoefeningen, volledig gelogde sets en je eigen vooruitgang in procenten.', howEn: 'Planned strength exercises, fully logged sets and your own progress in percent.' },
  { key: 'mobility', nl: 'Mobiliteit', en: 'Mobility', howNl: 'Mobiliteitsoefeningen en rekken tot de voorgeschreven tijd.', howEn: 'Mobility exercises and stretching up to the prescribed time.' },
  { key: 'balance', nl: 'Balans', en: 'Balance', howNl: 'Balansoefeningen, volgehouden tijd en een zwaardere variant.', howEn: 'Balance exercises, time held and a harder variant.' },
  { key: 'stability', nl: 'Stabiliteit', en: 'Stability', howNl: 'Romp en motorische controle. Trainingspijn die oploopt levert geen extra op.', howEn: 'Core and motor control. Pain that goes up during training earns nothing extra.' },
  { key: 'power', nl: 'Explosief', en: 'Power', howNl: 'Spring- en sprintoefeningen, zodra die in je programma zitten.', howEn: 'Jump and sprint exercises, once they are in your programme.' },
  { key: 'endurance', nl: 'Conditie', en: 'Endurance', howNl: 'Geplande conditie-oefeningen.', howEn: 'Planned conditioning exercises.' },
  { key: 'sport', nl: 'Techniek', en: 'Technique', howNl: 'Sportspecifieke oefeningen in de sportfase.', howEn: 'Sport-specific exercises in the sport phase.' },
  { key: 'discipline', nl: 'Discipline', en: 'Discipline', howNl: 'Geplande trainingen en volle weken. Eén vrije week per 8 weken telt niet als breuk.', howEn: 'Planned workouts and full weeks. One free week per 8 weeks does not break the run.' },
  { key: 'recovery', nl: 'Herstel', en: 'Recovery', howNl: 'Een dagcheck, pijn doorgeven, een geplande rustdag en een daling op je pijnkaart.', howEn: 'A daily check-in, reporting pain, a planned rest day and a drop on your body map.' },
  { key: 'knowledge', nl: 'Kennis', en: 'Knowledge', howNl: 'Binnenkort.', howEn: 'Coming soon.' },
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

/** Skill XP. Only planned work counts; anything above the prescription is 0, never a penalty. */
export const SKILL_XP = {
  strengthExercise: 10,
  strengthSet: 5, // a set with both weight and reps, up to the prescribed number
  strengthRecord: 50, // confirmed estimate, at most one per exercise per week
  strengthMilestone: 100, // once, when the estimate is 25% above the personal start
  mobilityExercise: 10,
  mobilityPer10s: 1, // stretch seconds, capped at the prescription
  mobilityRoutine: 20, // a completed 10-minute mobility block that day
  balanceExercise: 10,
  balancePer5s: 1,
  balanceUpgrade: 40, // first time a harder variant of the same family is done
  stabilityExercise: 10,
  stabilitySteady: 15, // extra when reported pain did not go up
  powerExercise: 15,
  powerCriterion: 60,
  enduranceExercise: 20,
  techniqueExercise: 20,
  techniqueCriterion: 100,
  session: 20,
  fullWeek: 50,
  checkin: 5,
  painReported: 10, // pain reported after a session; the score itself never adds more
  restDay: 15,
  redFlag: 25, // physiotherapy accounts only
  painDrop: 50, // a site 2 points under its own first score, once
} as const;

/** Per calendar day in Europe/Amsterdam. Knowledge has no lessons and no XP. */
export const SKILL_DAILY_CAP: Record<SkillKey, number> = {
  strength: 150,
  mobility: 120,
  balance: 100,
  stability: 100,
  power: 120,
  endurance: 120,
  sport: 150,
  discipline: 100,
  recovery: 80,
  knowledge: 0,
};

export const MOBILITY_ROUTINE_S = 600;
/** Reporting this much pain (or more) still counts the session, but pauses Strength progression bonuses that day. */
export const PAIN_PAUSE_STRENGTH = 7;

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
// Locks: a skill that is not in the active programme is locked, not shown as level 1.
// Rewards stay cosmetic: nothing here gates an exercise, a video or advice.
// ----------------------------------------------------------------------------------------------

export const REWARDS_ARE_COSMETIC = true;

/** `later` → "komt vrij in fase N". `unavailable` → "nog niet in je programma". `soon` → "binnenkort". */
export type SkillLockCode = 'later' | 'unavailable' | 'soon';

export type SkillLockContext = {
  /** Skills with XP from the patient's own logbook (own workouts, steps). */
  selfTrained?: SkillKey[];
  /** Skills trained by exercises in the active programme. */
  active: SkillKey[];
  /** Earliest later phase of the same series that trains the skill. */
  laterPhase: Partial<Record<SkillKey, number>>;
  phaseNo: number | null;
  strengthCleared: boolean;
  /** The active programme includes plyometrics or jumps. */
  powerInProgram: boolean;
  /** The active programme is a sport phase (sport-specific exercises). */
  sportPhase: boolean;
};

const openLock = { locked: false as const, reason: null, phase: null };

/** Why a skill shows a lock instead of a level. Discipline and recovery are always open. */
export function skillLock(key: SkillKey, ctx: SkillLockContext): { locked: boolean; reason: SkillLockCode | null; phase: number | null } {
  if (key === 'knowledge') return { locked: true, reason: 'soon', phase: null };
  if (key === 'discipline' || key === 'recovery') return openLock;
  if (key === 'power') {
    const cleared = ctx.strengthCleared || (ctx.phaseNo !== null && ctx.phaseNo >= 3);
    if (ctx.powerInProgram && cleared) return openLock;
    if (!ctx.powerInProgram) {
      return ctx.laterPhase.power ? { locked: true, reason: 'later', phase: ctx.laterPhase.power } : { locked: true, reason: 'unavailable', phase: null };
    }
    return { locked: true, reason: 'later', phase: 3 };
  }
  if (key === 'sport') {
    if (ctx.sportPhase) return openLock;
    return ctx.laterPhase.sport ? { locked: true, reason: 'later', phase: ctx.laterPhase.sport } : { locked: true, reason: 'unavailable', phase: null };
  }
  // A skill the patient trains on their own (logbook: own workouts, steps) opens too. Power and sport
  // keep their safety locks above: those need clearance or the right phase.
  if (ctx.active.includes(key) || ctx.selfTrained?.includes(key)) return openLock;
  return ctx.laterPhase[key] ? { locked: true, reason: 'later', phase: ctx.laterPhase[key]! } : { locked: true, reason: 'unavailable', phase: null };
}

export function skillLockLabel(reason: SkillLockCode | null, phase: number | null, nl = true) {
  if (reason === 'soon') return nl ? 'binnenkort' : 'coming soon';
  if (reason === 'later' && phase) return nl ? `komt vrij in fase ${phase}` : `unlocks in phase ${phase}`;
  return nl ? 'nog niet in je programma' : 'not in your programme yet';
}

/** What a friend may see for one skill: a level, or a lock. Never kilograms, pain or programme text. */
export type FriendSkillCard = { level: number | null; locked: boolean; reason: SkillLockCode | null; phase: number | null };

export function friendSkillCard(s: { level: number; locked: boolean; reason: SkillLockCode | null; phase: number | null }): FriendSkillCard {
  return s.locked ? { level: null, locked: true, reason: s.reason, phase: s.phase } : { level: s.level, locked: false, reason: null, phase: null };
}

// ----------------------------------------------------------------------------------------------
// Estimated 1RM (Epley) and the Strength progression bonuses
// ----------------------------------------------------------------------------------------------

/** Epley: weight × (1 + reps/30). Only sets with 1–10 reps and a weight above 0. */
export function epley1Rm(weightKg: number | null | undefined, reps: number | null | undefined): number | null {
  if (weightKg === null || weightKg === undefined || !(weightKg > 0)) return null;
  if (reps === null || reps === undefined || reps < 1 || reps > 10) return null;
  return weightKg * (1 + reps / 30);
}

export type RmMeasurement = {
  exerciseId: string;
  sessionId: string;
  date: string; // YYYY-MM-DD, Europe/Amsterdam
  estimateKg: number;
  /** Training pain tied to this session. 7 or more pauses the progression bonus. */
  pain: number | null;
};

export type StrengthSummary = {
  exerciseId: string;
  startKg: number | null;
  latestKg: number | null;
  /** Whole percent versus the personal start. Null until there is a measurement. */
  progressPct: number | null;
  history: { date: string; kg: number }[];
};

const RECORD_GAIN = 1.025;
const RECORD_CONFIRM = 0.97;
const MILESTONE_GAIN = 1.25;
const RECORD_WINDOW_DAYS = 14;

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400_000);
}

export function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO week of a calendar date, used for the one-record-per-exercise-per-week rule. */
export function isoWeekKey(date: string) {
  const d = new Date(date + 'T12:00:00Z');
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export type StrengthAwards = {
  summaries: StrengthSummary[];
  /** +50 on the confirmation day, already limited to one per exercise per week and blocked on pain ≥ 7. */
  records: { exerciseId: string; date: string }[];
  /** +100 once per exercise, on the first eligible day the estimate is 25% above the start. */
  milestones: { exerciseId: string; date: string }[];
};

/**
 * Start is the best estimate in the first two sessions with that exercise.
 * A record counts only when a later estimate is at least 2.5% above the previous record
 * and, within 14 days, another session reaches at least 97% of it.
 */
export function strengthAwards(measurements: RmMeasurement[]): StrengthAwards {
  const by = new Map<string, RmMeasurement[]>();
  for (const m of measurements) {
    if (!(m.estimateKg > 0)) continue;
    const list = by.get(m.exerciseId) ?? [];
    list.push(m);
    by.set(m.exerciseId, list);
  }
  const summaries: StrengthSummary[] = [];
  const records: StrengthAwards['records'] = [];
  const milestones: StrengthAwards['milestones'] = [];
  for (const [exerciseId, raw] of by) {
    const sessions = [...raw].sort((a, b) => a.date.localeCompare(b.date) || a.sessionId.localeCompare(b.sessionId));
    const start = Math.max(sessions[0].estimateKg, sessions[1]?.estimateKg ?? 0);
    const latest = sessions[sessions.length - 1].estimateKg;
    summaries.push({
      exerciseId,
      startKg: start,
      latestKg: latest,
      progressPct: start > 0 ? Math.round(((latest - start) / start) * 100) : null,
      history: sessions.map((s) => ({ date: s.date, kg: s.estimateKg })),
    });
    let bar = start;
    let pending: RmMeasurement | null = null;
    const awardedWeeks = new Set<string>();
    let milestone = false;
    const eligible = (s: RmMeasurement) => (s.pain ?? 0) < PAIN_PAUSE_STRENGTH;
    for (const s of sessions.slice(Math.min(2, sessions.length))) {
      if (!milestone && s.estimateKg >= start * MILESTONE_GAIN && eligible(s)) {
        milestone = true;
        milestones.push({ exerciseId, date: s.date });
      }
      if (pending) {
        const gap = daysBetween(pending.date, s.date);
        if (gap > RECORD_WINDOW_DAYS) pending = null;
        else if (s.sessionId !== pending.sessionId && s.estimateKg >= pending.estimateKg * RECORD_CONFIRM - 1e-6) {
          const week = isoWeekKey(s.date);
          if (eligible(s) && eligible(pending)) {
            if (!awardedWeeks.has(week)) {
              awardedWeeks.add(week);
              records.push({ exerciseId, date: s.date });
            }
            bar = Math.max(bar, pending.estimateKg);
            pending = null;
          }
        }
      }
      if (eligible(s) && s.estimateKg >= bar * RECORD_GAIN - 1e-6 && (!pending || s.estimateKg > pending.estimateKg)) {
        pending = s;
      }
    }
    // A milestone crossed only on a high-pain day waits for the next session that still clears it.
    if (!milestone) {
      for (const s of sessions.slice(Math.min(2, sessions.length))) {
        if (s.estimateKg >= start * MILESTONE_GAIN && eligible(s)) {
          milestones.push({ exerciseId, date: s.date });
          break;
        }
      }
    }
  }
  return { summaries, records, milestones };
}

// ----------------------------------------------------------------------------------------------
// Daily skill XP
// ----------------------------------------------------------------------------------------------

export type LoggedExercise = {
  date: string;
  exerciseId: string;
  familyId: string;
  difficulty: number;
  skills: SkillKey[];
  /** False when this was not on the plan for that day: 0 XP, no penalty. */
  planned: boolean;
  prescribedSets: number | null;
  /** Sets that have both a weight and reps. Only the prescribed number scores. */
  loggedSets: number;
  prescribedHoldS: number;
  doneHoldS: number;
  prescribedBalanceS: number;
  doneBalanceS: number;
  pain: number | null;
  /** Previous reported training pain, for the stability bonus. */
  previousPain: number | null;
};

export type RecoveryEvent = { date: string; kind: 'checkin' | 'pain_after_session' | 'rest_day' | 'red_flag' | 'pain_drop' };

export type SkillXpInput = {
  exercises: LoggedExercise[];
  measurements: RmMeasurement[];
  sessions: { date: string; planned: boolean }[];
  /** Date the full-week bonus lands (a day of that week). */
  fullWeeks: { date: string }[];
  /** Oldest week first. The last entry is the current week and does not break a streak while it is still open. */
  weeks?: { full: boolean }[];
  recovery: RecoveryEvent[];
  criteria: { date: string; kind: 'jump' | 'return_to_sport' }[];
  accountKind: 'physio' | 'coach' | 'personal';
};

export type SkillAward = { date: string; skill: SkillKey; amount: number };

/** One free missed week in any rolling 8 weeks does not break the run. The missed week itself adds no XP. */
export function disciplineStreak(weeks: { full: boolean }[]): number {
  if (!weeks.length) return 0;
  const seq = weeks[weeks.length - 1].full ? weeks : weeks.slice(0, -1);
  let streak = 0;
  const freeAt: number[] = [];
  for (let i = seq.length - 1; i >= 0; i--) {
    if (seq[i].full) {
      streak++;
      continue;
    }
    // A free week already used in the next 7 weeks (we walk from the newest week backward).
    if (freeAt.some((u) => u <= i + 7)) break;
    freeAt.push(i);
  }
  return streak;
}

function pushAward(out: SkillAward[], date: string, skill: SkillKey, amount: number) {
  if (amount > 0 && skill !== 'knowledge') out.push({ date, skill, amount });
}

/** Sum per skill per day, then apply that skill's daily cap. */
export function applyDailyCaps(awards: SkillAward[]): Record<SkillKey, number> {
  const xp = Object.fromEntries(SKILLS.map((k) => [k.key, 0])) as Record<SkillKey, number>;
  const by = new Map<string, number>();
  for (const a of awards) by.set(`${a.date}|${a.skill}`, (by.get(`${a.date}|${a.skill}`) ?? 0) + a.amount);
  for (const [key, raw] of by) {
    const skill = key.slice(11) as SkillKey;
    xp[skill] += Math.min(raw, SKILL_DAILY_CAP[skill]);
  }
  return xp;
}

/**
 * Planned rest days inside a programme window: the programme schedules other weekdays,
 * this weekday has nothing planned, and the patient did not train.
 */
export function plannedRestDates(
  programs: { start: string | null; end: string | null; weekdays: number[] }[],
  trained: Iterable<string>,
  today: string,
): string[] {
  const did = new Set(trained);
  const windows = programs.filter((p) => p.start && p.weekdays.length);
  if (!windows.length) return [];
  const start = windows.map((p) => p.start!).sort()[0];
  const out: string[] = [];
  for (let date = start; date <= today; date = addDays(date, 1)) {
    const open = windows.filter((p) => p.start! <= date && (!p.end || p.end >= date));
    if (!open.length || did.has(date)) continue;
    const wd = isoWeekday(parseDate(date));
    if (open.every((p) => !p.weekdays.includes(wd))) out.push(date);
  }
  return out;
}

/** All skill XP from what the patient actually did. Nothing is stored; the caller passes the logs. */
export function computeSkillXp(input: SkillXpInput): { xp: Record<SkillKey, number>; awards: SkillAward[]; strength: StrengthSummary[]; streak: number } {
  const awards: SkillAward[] = [];
  const highPain = new Set<string>();
  for (const e of input.exercises) if ((e.pain ?? 0) >= PAIN_PAUSE_STRENGTH) highPain.add(e.date);
  for (const m of input.measurements) if ((m.pain ?? 0) >= PAIN_PAUSE_STRENGTH) highPain.add(m.date);

  const stretchByDay = new Map<string, number>();
  const seenFamily = new Map<string, number>();
  const ordered = [...input.exercises].sort((a, b) => a.date.localeCompare(b.date) || a.exerciseId.localeCompare(b.exerciseId));
  for (const e of ordered) {
    if (!e.planned) continue;
    const skills = new Set(e.skills);
    if (skills.has('strength')) {
      pushAward(awards, e.date, 'strength', SKILL_XP.strengthExercise);
      const prescribed = e.prescribedSets ?? 0;
      const sets = Math.min(Math.max(0, e.loggedSets), prescribed);
      pushAward(awards, e.date, 'strength', sets * SKILL_XP.strengthSet);
    }
    if (skills.has('mobility')) {
      pushAward(awards, e.date, 'mobility', SKILL_XP.mobilityExercise);
      const seconds = Math.min(Math.max(0, e.doneHoldS), Math.max(0, e.prescribedHoldS));
      pushAward(awards, e.date, 'mobility', Math.floor(seconds / 10) * SKILL_XP.mobilityPer10s);
      stretchByDay.set(e.date, (stretchByDay.get(e.date) ?? 0) + seconds);
    }
    if (skills.has('balance')) {
      pushAward(awards, e.date, 'balance', SKILL_XP.balanceExercise);
      const seconds = Math.min(Math.max(0, e.doneBalanceS), Math.max(0, e.prescribedBalanceS));
      pushAward(awards, e.date, 'balance', Math.floor(seconds / 5) * SKILL_XP.balancePer5s);
      const prev = seenFamily.get(e.familyId) ?? 0;
      if (e.difficulty > prev && prev > 0) pushAward(awards, e.date, 'balance', SKILL_XP.balanceUpgrade);
      if (e.difficulty > prev) seenFamily.set(e.familyId, e.difficulty);
    }
    if (skills.has('stability')) {
      pushAward(awards, e.date, 'stability', SKILL_XP.stabilityExercise);
      const steady = e.pain !== null && (e.previousPain === null || e.pain <= e.previousPain);
      if (steady) pushAward(awards, e.date, 'stability', SKILL_XP.stabilitySteady);
    }
    if (skills.has('power')) pushAward(awards, e.date, 'power', SKILL_XP.powerExercise);
    if (skills.has('endurance')) pushAward(awards, e.date, 'endurance', SKILL_XP.enduranceExercise);
    if (skills.has('sport')) pushAward(awards, e.date, 'sport', SKILL_XP.techniqueExercise);
  }
  for (const [date, seconds] of stretchByDay) if (seconds >= MOBILITY_ROUTINE_S) pushAward(awards, date, 'mobility', SKILL_XP.mobilityRoutine);

  const lifted = strengthAwards(input.measurements.map((m) => (highPain.has(m.date) ? { ...m, pain: Math.max(m.pain ?? 0, PAIN_PAUSE_STRENGTH) } : m)));
  for (const r of lifted.records) pushAward(awards, r.date, 'strength', SKILL_XP.strengthRecord);
  for (const m of lifted.milestones) pushAward(awards, m.date, 'strength', SKILL_XP.strengthMilestone);

  for (const s of input.sessions) if (s.planned) pushAward(awards, s.date, 'discipline', SKILL_XP.session);
  for (const w of input.fullWeeks) pushAward(awards, w.date, 'discipline', SKILL_XP.fullWeek);
  for (const c of input.criteria) {
    if (c.kind === 'jump') pushAward(awards, c.date, 'power', SKILL_XP.powerCriterion);
    if (c.kind === 'return_to_sport') pushAward(awards, c.date, 'sport', SKILL_XP.techniqueCriterion);
  }
  for (const r of input.recovery) {
    if (r.kind === 'checkin') pushAward(awards, r.date, 'recovery', SKILL_XP.checkin);
    if (r.kind === 'pain_after_session') pushAward(awards, r.date, 'recovery', SKILL_XP.painReported);
    if (r.kind === 'rest_day') pushAward(awards, r.date, 'recovery', SKILL_XP.restDay);
    if (r.kind === 'pain_drop') pushAward(awards, r.date, 'recovery', SKILL_XP.painDrop);
    if (r.kind === 'red_flag' && input.accountKind === 'physio') pushAward(awards, r.date, 'recovery', SKILL_XP.redFlag);
  }
  return { xp: applyDailyCaps(awards), awards, strength: lifted.summaries, streak: disciplineStreak(input.weeks ?? []) };
}

/** First score per area, then the first later score that is at least 2 points lower. One award per area. */
export function painDropEvents(points: { area: string; at: string; score: number }[]): RecoveryEvent[] {
  const by = new Map<string, { at: string; score: number }[]>();
  for (const p of points) {
    const list = by.get(p.area) ?? [];
    list.push({ at: p.at, score: p.score });
    by.set(p.area, list);
  }
  const out: RecoveryEvent[] = [];
  for (const list of by.values()) {
    list.sort((a, b) => a.at.localeCompare(b.at));
    const start = list[0];
    const drop = list.slice(1).find((p) => p.score <= start.score - 2);
    if (drop) out.push({ date: drop.at.slice(0, 10), kind: 'pain_drop' });
  }
  return out;
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

/**
 * Weekly boss: a silly monster that stands for what keeps people from training (the couch, stiffness,
 * putting things off). This week's training and check-ins wear down its health. Doing what is
 * planned is enough to beat it: extra workouts do no extra damage, because rest is training too.
 */
export const BOSSES = [
  { key: 'bankhanger', nl: 'De Bankhanger', en: 'The Couch Hugger', taunt: ['Blijf lekker zitten, morgen kan ook…', 'Stay seated, tomorrow works too…'] },
  { key: 'stijve_steven', nl: 'Stijve Steven', en: 'Stiff Steven', taunt: ['Krak krak. Bewegen? Nee hoor.', 'Creak creak. Move? No thanks.'] },
  { key: 'gaapdraak', nl: 'De Gaapdraak', en: 'The Yawn Dragon', taunt: ['Eerst nog even een dutje…', 'Just one more nap first…'] },
  { key: 'uitsteller', nl: 'De Uitsteller', en: 'The Procrastinator', taunt: ['Straks. Echt. Straks.', 'Later. Really. Later.'] },
  { key: 'krampkolos', nl: 'De Krampkolos', en: 'The Cramp Colossus', taunt: ['Ik knoop alles in de war!', 'I tie everything in knots!'] },
  { key: 'schermschim', nl: 'De Schermschim', en: 'The Screen Shade', taunt: ['Nog één filmpje kijken…', 'Just one more video…'] },
] as const;
export type BossKey = (typeof BOSSES)[number]['key'];
export const BOSS_XP = 60;
export const BOSS_HP = 100;

/** Same boss for everyone in a given week; it rotates weekly. */
export function bossOf(weekStart: string) {
  const weeks = Math.floor(Date.parse(weekStart + 'T12:00:00Z') / (7 * 86400_000));
  return BOSSES[((weeks % BOSSES.length) + BOSSES.length) % BOSSES.length];
}

export type BossHit = { source: 'train' | 'checkin'; count: number; max: number; damage: number };
export type WeeklyBoss = { key: BossKey; hp: number; damage: number; defeated: boolean; hits: BossHit[] };

/** Training days do 80 damage in total (spread over the week's training goal), check-in days 10 each (max 2). */
export function weeklyBoss(weekStart: string, w: WeekData): WeeklyBoss {
  const target = w.planned > 0 ? Math.min(w.planned, 3) : 1;
  const trained = Math.min(w.trainedDays, target);
  const checks = Math.min(w.checkins, 2);
  const hits: BossHit[] = [
    { source: 'train', count: trained, max: target, damage: Math.round((80 * trained) / target) },
    { source: 'checkin', count: checks, max: 2, damage: checks * 10 },
  ];
  const damage = Math.min(BOSS_HP, hits.reduce((s, h) => s + h.damage, 0));
  return { key: bossOf(weekStart).key, hp: BOSS_HP, damage, defeated: damage >= BOSS_HP, hits };
}

export const questXp = (quests: Quest[]) => quests.filter((q) => q.done).length * QUEST_XP + (quests.every((q) => q.done) ? CHEST_XP : 0);

// ----------------------------------------------------------------------------------------------
// Gear: items for the hero, bought in the shop with coins earned by training; the patient chooses what to wear.
// ----------------------------------------------------------------------------------------------

/** Starter piece per skill (tier 1, cheap), so every skill has something affordable right away. */
export const SKILL_STARTER: Partial<Record<SkillKey, { key: string; nl: string; en: string }>> = {
  strength: { key: 'wristbands', nl: 'Polsbandjes', en: 'Wristbands' },
  mobility: { key: 'headband', nl: 'Hoofdband', en: 'Headband' },
  balance: { key: 'crew_socks', nl: 'Grip-sokken', en: 'Grip socks' },
  stability: { key: 'sleeve', nl: 'Compressiesleeve', en: 'Compression sleeve' },
  power: { key: 'cap', nl: 'Pet', en: 'Cap' },
  endurance: { key: 'watch', nl: 'Sporthorloge', en: 'Sports watch' },
  sport: { key: 'shin_guards', nl: 'Scheenbeschermers', en: 'Shin guards' },
  discipline: { key: 'headphones', nl: 'Koptelefoon', en: 'Headphones' },
  recovery: { key: 'scarf', nl: 'Warme sjaal', en: 'Warm scarf' },
};

/** The rare piece that belongs to each trainable skill. Knowledge has none. */
export const SKILL_GEAR: Partial<Record<SkillKey, string>> = {
  strength: 'gloves',
  mobility: 'yoga_mat',
  balance: 'balance_shoes',
  stability: 'belt',
  power: 'spikes',
  endurance: 'hr_band',
  sport: 'sport_item',
  discipline: 'captain',
  recovery: 'towel',
};

export const SKILL_EMBLEM_LEVEL = 5;
export const SKILL_GEAR_LEVEL = 10;
export const SKILL_TITLE_LEVEL = 20;

/** Shop tiers: price in coins. Every item also has its own tier score (like an item level). Colours pass 4.5:1 as text on light backgrounds. */
export const GEAR_TIERS = [
  { tier: 1, key: 'common', nl: 'Alledaags', en: 'Everyday', price: 15, color: '#5c6159', glow: '#A3AAA5' },
  { tier: 2, key: 'uncommon', nl: 'Premium', en: 'Premium', price: 40, color: '#2b6b41', glow: '#53A878' },
  { tier: 3, key: 'rare', nl: 'Designer', en: 'Designer', price: 90, color: '#2759a0', glow: '#5595DF' },
  { tier: 4, key: 'epic', nl: 'Legendarisch', en: 'Legendary', price: 180, color: '#6f35ab', glow: '#AD79DE' },
  { tier: 5, key: 'legendary', nl: 'Goddelijk', en: 'Divine', price: 350, color: '#855806', glow: '#E4BC63' },
] as const;
export type GearTier = (typeof GEAR_TIERS)[number];

/** Coins: 1 per 10 hero XP, plus a welcome purse so a first item can be bought right away. */
export const COIN_XP = 10;
export const WELCOME_COINS = 20;
/**
 * Day chest: 5 to 15 coins, the same roll for a patient on a given day (so reloading changes
 * nothing), plus 2 per day in a row that a chest was opened before (at most +10).
 */
export function dayChestCoins(seed: string, day: string, streak: number): number {
  let h = 2166136261;
  for (const c of `${seed}|${day}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return 5 + (h % 11) + Math.min(10, Math.max(0, streak) * 2);
}
/** Days in a row before `day` (YYYY-MM-DD) with an opened chest. */
export function chestStreak(openedDays: string[], day: string): number {
  const set = new Set(openedDays);
  let n = 0;
  const d = new Date(day + 'T12:00:00Z');
  for (;;) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (!set.has(d.toISOString().slice(0, 10))) return n;
    n++;
  }
}
export const coinsEarned = (heroXp: number) => WELCOME_COINS + Math.floor(Math.max(0, heroXp) / COIN_XP);

type GearDef = { key: string; nl: string; en: string; tier: 1 | 2 | 3 | 4 | 5; score: number };
const starter = (key: string, score: number): GearDef => {
  const it = Object.values(SKILL_STARTER).find((x) => x!.key === key)!;
  return { key, nl: it.nl, en: it.en, tier: 1, score };
};

/** Cosmetic item level reuses the established score; it is not a patient-level requirement. */
export const GEAR: (GearDef & { price: number; itemLevel: number })[] = ([
  // Tier 1: one per skill, plus the chest pin.
  starter('wristbands', 10), starter('headband', 10), starter('crew_socks', 10), starter('sleeve', 12), starter('cap', 10),
  starter('watch', 12), starter('shin_guards', 12), starter('headphones', 10), starter('scarf', 10),
  { key: 'pin', nl: 'Borstspeld', en: 'Chest pin', tier: 1, score: 8 },
  // Tier 2
  { key: 'visor', nl: 'Klep', en: 'Visor', tier: 2, score: 22 },
  { key: 'towel', nl: 'Handdoek om de nek', en: 'Towel around the neck', tier: 2, score: 24 },
  { key: 'captain', nl: 'Aanvoerdersband', en: 'Captain’s armband', tier: 2, score: 26 },
  { key: 'belt', nl: 'Trainingsriem', en: 'Training belt', tier: 2, score: 28 },
  // Tier 3
  { key: 'yoga_mat', nl: 'Yogamat op de rug', en: 'Yoga mat on the back', tier: 3, score: 42 },
  { key: 'sport_item', nl: 'Sportitem', en: 'Sport item', tier: 3, score: 44 },
  { key: 'gloves', nl: 'Handschoenen', en: 'Gloves', tier: 3, score: 45 },
  { key: 'hr_band', nl: 'Hartslagband', en: 'Heart-rate band', tier: 3, score: 46 },
  { key: 'balance_shoes', nl: 'Balansschoenen', en: 'Balance shoes', tier: 3, score: 48 },
  { key: 'spikes', nl: 'Spikes', en: 'Spikes', tier: 3, score: 50 },
  // Tier 4
  { key: 'medal', nl: 'Medaille', en: 'Medal', tier: 4, score: 70 },
  { key: 'gold_shoes', nl: 'Gouden schoenen', en: 'Golden shoes', tier: 4, score: 80 },
  // Tier 5
  { key: 'crown', nl: 'Kroon', en: 'Crown', tier: 5, score: 100 },
  // Outfits: the hero photo itself changes (one generated photo per figure, skin group and build).
  { key: 'tracksuit', nl: 'Trainingspak', en: 'Tracksuit', tier: 2, score: 25 },
  { key: 'team_kit', nl: 'Teamtenue', en: 'Team kit', tier: 3, score: 47 },
  { key: 'champion', nl: 'Kampioenspak', en: 'Champion suit', tier: 5, score: 100 },
] as GearDef[]).map((g) => ({ ...g, itemLevel: g.score, price: GEAR_TIERS[g.tier - 1].price }));
export const OUTFITS = ['tracksuit', 'team_kit', 'champion'] as const;
/** The outfit the hero wears, if any (one per slot, so at most one). */
export const wornOutfit = (gear: readonly string[]) => (OUTFITS as readonly string[]).find((o) => gear.includes(o)) ?? null;
export const gearTier = (key: string) => GEAR_TIERS[(GEAR.find((g) => g.key === key)?.tier ?? 1) - 1];
export const GEAR_KEYS = new Set(GEAR.map((g) => g.key));

/**
 * Trophy cabinet: per skill a trophy at level 10, 25, 50, 75 and 99. Up to three earned trophies can
 * stand on the shelf behind the hero. Keys look like 'strength:25'.
 */
export const TROPHY_TIERS = [
  { level: 10, key: 'bronze', nl: 'Brons', en: 'Bronze', color: '#b07a4a' },
  { level: 25, key: 'silver', nl: 'Zilver', en: 'Silver', color: '#9aa4ad' },
  { level: 50, key: 'gold', nl: 'Goud', en: 'Gold', color: '#d4a72c' },
  { level: 75, key: 'platinum', nl: 'Platina', en: 'Platinum', color: '#7fb7c9' },
  { level: 99, key: 'master', nl: 'Meester', en: 'Master', color: '#7c4dff' },
] as const;
export const SHOWCASE_MAX = 3;
export type Trophy = { key: string; skill: SkillKey; level: number; tier: (typeof TROPHY_TIERS)[number]['key']; earned: boolean };
export function skillTrophies(skills: { key: SkillKey; level: number; locked: boolean }[]): Trophy[] {
  return skills.flatMap((s) => TROPHY_TIERS.map((t) => ({ key: `${s.key}:${t.level}`, skill: s.key, level: t.level, tier: t.key, earned: !s.locked && s.level >= t.level })));
}

/** Character screen slots (RPG paper doll): one piece per slot. */
export type GearSlot = 'head' | 'neck' | 'chest' | 'back' | 'arm' | 'wrist' | 'hands' | 'waist' | 'legs' | 'feet' | 'held' | 'outfit';
export const GEAR_SLOTS: { key: GearSlot; nl: string; en: string; side: 'left' | 'right' | 'bottom' }[] = [
  { key: 'head', nl: 'Hoofd', en: 'Head', side: 'left' },
  { key: 'neck', nl: 'Nek', en: 'Neck', side: 'left' },
  { key: 'chest', nl: 'Borst', en: 'Chest', side: 'left' },
  { key: 'back', nl: 'Rug', en: 'Back', side: 'left' },
  { key: 'arm', nl: 'Arm', en: 'Arm', side: 'left' },
  { key: 'wrist', nl: 'Pols', en: 'Wrist', side: 'right' },
  { key: 'hands', nl: 'Handen', en: 'Hands', side: 'right' },
  { key: 'waist', nl: 'Middel', en: 'Waist', side: 'right' },
  { key: 'legs', nl: 'Benen', en: 'Legs', side: 'right' },
  { key: 'feet', nl: 'Voeten', en: 'Feet', side: 'right' },
  { key: 'outfit', nl: 'Outfit', en: 'Outfit', side: 'bottom' },
  { key: 'held', nl: 'In de hand', en: 'Held', side: 'bottom' },
];
export const GEAR_SLOT: Record<string, GearSlot> = {
  cap: 'head', visor: 'head', headband: 'head', crown: 'head',
  scarf: 'neck', towel: 'neck', headphones: 'neck', medal: 'neck',
  pin: 'chest', hr_band: 'chest',
  yoga_mat: 'back',
  captain: 'arm',
  watch: 'wrist', wristbands: 'wrist',
  gloves: 'hands',
  belt: 'waist',
  sleeve: 'legs', shin_guards: 'legs',
  gold_shoes: 'feet', balance_shoes: 'feet', spikes: 'feet', crew_socks: 'feet',
  sport_item: 'held',
  tracksuit: 'outfit', team_kit: 'outfit', champion: 'outfit',
};
/** Keep one piece per slot: the last one in the list wins (newest choice). */
export function onePerSlot(equipped: string[]): string[] {
  const by = new Map<string, string>();
  for (const g of equipped) by.set(GEAR_SLOT[g] ?? g, g);
  return equipped.filter((g) => by.get(GEAR_SLOT[g] ?? g) === g).filter((g, i, a) => a.indexOf(g) === i);
}

/** Gear score: the tier scores of what the hero wears, one piece per slot. */
export function gearScore(equipped: string[]): number {
  return onePerSlot(equipped).reduce((sum, k) => sum + (GEAR.find((g) => g.key === k)?.score ?? 0), 0);
}

/** Level-20 name for a skill. Knowledge has none. */
export const SKILL_TITLES: Partial<Record<SkillKey, { nl: string; en: string }>> = {
  strength: { nl: 'Krachtpatser', en: 'Powerhouse' },
  mobility: { nl: 'Lenigheidsmeester', en: 'Mobility master' },
  balance: { nl: 'Evenwichtskunstenaar', en: 'Balance artist' },
  stability: { nl: 'Rots in de branding', en: 'Rock in the surf' },
  power: { nl: 'Springveer', en: 'Spring' },
  endurance: { nl: 'Duurloper', en: 'Endurance runner' },
  sport: { nl: 'Techneut', en: 'Technician' },
  discipline: { nl: 'IJzeren wil', en: 'Iron will' },
  recovery: { nl: 'Herstelheld', en: 'Recovery hero' },
};

export function skillTitle(key: SkillKey, level: number, nl = true) {
  if (level < SKILL_TITLE_LEVEL) return null;
  const t = SKILL_TITLES[key];
  return t ? (nl ? t.nl : t.en) : null;
}

export const COMBO_TITLES: { key: string; nl: string; en: string; needs: readonly (readonly [SkillKey, number])[] }[] = [
  { key: 'de_rots', nl: 'De Rots', en: 'The Rock', needs: [['strength', 20], ['stability', 20]] },
  { key: 'danser', nl: 'Danser', en: 'Dancer', needs: [['balance', 20], ['mobility', 20]] },
  { key: 'slimme_atleet', nl: 'Slimme Atleet', en: 'Smart athlete', needs: [['discipline', 30], ['recovery', 30]] },
];

export function comboTitles(levels: Partial<Record<SkillKey, number>>, nl = true) {
  return COMBO_TITLES.filter((c) => c.needs.every(([k, n]) => (levels[k] ?? 0) >= n)).map((c) => ({ key: c.key, name: nl ? c.nl : c.en }));
}

/**
 * Later cosmetic steps. Defined so the ladder is fixed; nothing from level 30 upward is drawn in this round.
 * Level 75 is a gold recolour of the level-10 piece. Level 99 is a master cape.
 */
export const FUTURE_REWARDS = [
  { level: 30, key: 'pose', nl: 'Pose', en: 'Pose', drawn: false },
  { level: 50, key: 'border', nl: 'Kader', en: 'Border', drawn: false },
  { level: 75, key: 'gold_gear', nl: 'Gouden versie van het level-10-item', en: 'Gold version of the level-10 item', drawn: false },
  { level: 99, key: 'master_cape', nl: 'Meestercape', en: 'Master cape', drawn: false },
] as const;

/** Backdrop of the hero card from the sum of unlocked skill levels. 150, 250 and 400 stay data-only. */
export const TOTAL_LEVEL_SCENES = [
  { level: 50, key: 'gym', nl: 'Sportschool', en: 'Gym', drawn: true },
  { level: 100, key: 'stadium', nl: 'Stadion', en: 'Stadium', drawn: true },
  { level: 150, key: 'arena', nl: 'Arena', en: 'Arena', drawn: false },
  { level: 250, key: 'lights', nl: 'Lichtshow', en: 'Light show', drawn: false },
  { level: 400, key: 'legend', nl: 'Legende-podium', en: 'Legend stage', drawn: false },
] as const;

export function sceneForTotal(total: number) {
  return [...TOTAL_LEVEL_SCENES].reverse().find((s) => s.drawn && total >= s.level) ?? null;
}

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

// ----------------------------------------------------------------------------------------------
// Body composition → how the hero looks
// ----------------------------------------------------------------------------------------------

export type BodyShape = { fat: number; muscle: number; bodyFatPct: number; estimated: boolean; ffmi: number; kind: 'lean' | 'athletic' | 'muscular' | 'average' | 'soft' | 'full' };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * The hero's shape from the patient's own measurements. Body fat sets how full the body is; the
 * fat-free mass index (FFMI = lean mass / height²) sets how muscular. So a high BMI with low body fat
 * gives a muscular hero, a high BMI with high body fat a fuller one.
 * Without a body-fat value it is estimated from BMI (Deurenberg et al. 1991, age 35 assumed).
 * Reference ranges: body fat men ~8–35 %, women ~16–45 %; FFMI men ~17 (low) to 25 (very muscular),
 * women ~14 to 21 (Kouri et al. 1995; Schutz et al. 2002).
 */
export function bodyShape(m: { weightKg: number | null; heightCm: number | null; bodyFatPct: number | null }, frame: 'f' | 'm' | string | undefined): BodyShape | null {
  if (!m.weightKg || !m.heightCm) return null;
  const female = frame === 'f';
  const h = m.heightCm / 100;
  const bmi = m.weightKg / (h * h);
  const estimated = m.bodyFatPct === null || m.bodyFatPct === undefined;
  const bf = estimated ? Math.min(55, Math.max(4, 1.2 * bmi + 0.23 * 35 - 10.8 * (female ? 0 : 1) - 5.4)) : (m.bodyFatPct as number);
  const ffmi = (m.weightKg * (1 - bf / 100)) / (h * h);
  const fat = clamp01((bf - (female ? 16 : 8)) / (female ? 29 : 27));
  const muscle = clamp01((ffmi - (female ? 13.5 : 16.5)) / (female ? 7.5 : 8.5));
  const kind: BodyShape['kind'] =
    fat >= 0.7 ? 'full' : fat >= 0.5 ? 'soft' : muscle >= 0.65 && fat < 0.45 ? 'muscular' : muscle >= 0.45 && fat < 0.4 ? 'athletic' : fat < 0.2 && muscle < 0.4 ? 'lean' : 'average';
  return { fat, muscle, bodyFatPct: Math.round(bf * 10) / 10, estimated, ffmi: Math.round(ffmi * 10) / 10, kind };
}

export const BODY_KIND_LABEL: Record<BodyShape['kind'], [string, string]> = {
  lean: ['Slank', 'Lean'],
  athletic: ['Atletisch', 'Athletic'],
  muscular: ['Gespierd', 'Muscular'],
  average: ['Gemiddeld', 'Average'],
  soft: ['Iets voller', 'Slightly fuller'],
  full: ['Voller', 'Fuller'],
};

/** Which generated photo (see server/db/seed-data/hero-assets.ts) fits this hero: figure, skin group, build. */
/**
 * Hairstyles that exist as photos: four per figure. Each preset sets the stored look fields, so the
 * drawn hero (and older clients) keep working. The photo set: {figure}_{skin group}_{body type}[_{h2..h4}].
 */
export const HAIR_PRESETS = {
  f: {
    h1: { hair: 'ponytail', hairColor: 'darkbrown', beard: 'none', nl: 'Paardenstaart', en: 'Ponytail' },
    h2: { hair: 'long', hairColor: 'darkbrown', beard: 'none', nl: 'Lang los haar', en: 'Long, loose' },
    h3: { hair: 'short', hairColor: 'blond', beard: 'none', nl: 'Blonde bob', en: 'Blond bob' },
    h4: { hair: 'curly', hairColor: 'black', beard: 'none', nl: 'Krullen', en: 'Curls' },
  },
  m: {
    h1: { hair: 'short', hairColor: 'darkbrown', beard: 'none', nl: 'Kort', en: 'Short' },
    h2: { hair: 'short', hairColor: 'darkbrown', beard: 'beard', nl: 'Kort met baard', en: 'Short with beard' },
    h3: { hair: 'buzz', hairColor: 'black', beard: 'none', nl: 'Kaal', en: 'Shaved' },
    h4: { hair: 'curly', hairColor: 'brown', beard: 'none', nl: 'Krullen', en: 'Curls' },
  },
} as const;
export type HairPreset = 'h1' | 'h2' | 'h3' | 'h4';
export const HAIR_PRESET_KEYS: HairPreset[] = ['h1', 'h2', 'h3', 'h4'];

/** The photo hairstyle closest to the stored look (older heroes chose from more options). */
export function hairPreset(look: { frame?: string; hair: string; beard?: string }): HairPreset {
  const h = look.hair;
  if (look.frame === 'm') {
    if (h === 'buzz' || h === 'none') return 'h3';
    if (h === 'curly' || h === 'afro' || h === 'long' || h === 'ponytail' || h === 'bun') return 'h4';
    return look.beard && look.beard !== 'none' ? 'h2' : 'h1';
  }
  if (h === 'ponytail' || h === 'bun') return 'h1';
  if (h === 'long') return 'h2';
  if (h === 'curly' || h === 'afro') return 'h4';
  return 'h3';
}

/** The five skin groups the photos exist for. */
export const SKIN_GROUPS = ['s1', 's3', 's5', 's7', 's9'] as const;
export const skinGroup = (skin: string) => {
  const n = Number(skin.replace(/\D/g, '')) || 4;
  return n <= 2 ? 's1' : n <= 4 ? 's3' : n <= 6 ? 's5' : n <= 8 ? 's7' : 's9';
};

export function heroPhotoKey(look: { frame?: string; skin: string; build?: string; hair?: string; beard?: string }, body: { kind?: BodyShape['kind'] } | null | undefined, withHair = true): string {
  const fromBuild: Record<string, BodyShape['kind']> = { slim: 'lean', average: 'average', athletic: 'athletic', full: 'full' };
  const kind = body?.kind ?? fromBuild[look.build ?? 'average'] ?? 'average';
  const base = `${look.frame === 'm' ? 'm' : 'f'}_${skinGroup(look.skin)}_${kind}`;
  const preset = withHair && look.hair ? hairPreset({ frame: look.frame, hair: look.hair, beard: look.beard }) : 'h1';
  return preset === 'h1' ? base : `${base}_${preset}`;
}

/**
 * Playful alliterative nicknames for the hero ("Stalen Sanne", "Turbo Tim"). Only cheerful words
 * about character and energy, never about the body or weight. With a first name the adjective
 * starts with the same letter; without one a name is picked too.
 */
const NICK_ADJ: Record<string, string[]> = {
  a: ['Atletische', 'Avontuurlijke'], b: ['Bliksem', 'Bikkelharde'], c: ['Coole', 'Charmante'], d: ['Dappere', 'Dynamische'],
  e: ['Energieke', 'Eervolle'], f: ['Flitsende', 'Fitte'], g: ['Gouden', 'Gedreven'], h: ['Heldhaftige', 'Hardlopende'],
  i: ['IJzeren', 'Ijverige'], j: ['Jolige', 'Jagende'], k: ['Krachtige', 'Kanjer'], l: ['Lenige', 'Lachende'],
  m: ['Machtige', 'Moedige'], n: ['Nooit-moe', 'Noeste'], o: ['Onstuitbare', 'Onverslaanbare'], p: ['Pittige', 'Powerende'],
  q: ['Quick'], r: ['Razendsnelle', 'Rappe'], s: ['Stalen', 'Supersnelle', 'Sterke'], t: ['Turbo', 'Taaie'],
  u: ['Unieke', 'Ultra'], v: ['Vurige', 'Vliegende'], w: ['Wervelende', 'Winnende'], y: ['Yes-'], z: ['Zonnige', 'Zoevende'],
};
const NICK_NAMES = { f: ['Sanne', 'Fleur', 'Lotte', 'Mila', 'Noor', 'Eva', 'Zoë', 'Tess'], m: ['Tim', 'Daan', 'Luuk', 'Sem', 'Bram', 'Finn', 'Max', 'Ruben'] } as const;

export function heroNickname(firstName: string | null | undefined, frame: string | undefined, n: number): string {
  const name = (firstName ?? '').trim().split(/\s+/)[0]?.slice(0, 24) ?? '';
  const i = Math.abs(Math.floor(n));
  if (name) {
    const key = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] ?? '';
    const list = NICK_ADJ[key];
    if (list) {
      const adj = list[i % list.length];
      return adj.endsWith('-') ? `${adj}${name}` : `${adj} ${name}`;
    }
  }
  const names = NICK_NAMES[frame === 'm' ? 'm' : 'f'];
  const pick = names[i % names.length];
  const list = NICK_ADJ[pick[0].toLowerCase()];
  return `${list[Math.floor(i / names.length) % list.length]} ${pick}`;
}
