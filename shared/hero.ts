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
  if (ctx.active.includes(key)) return openLock;
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

export const questXp = (quests: Quest[]) => quests.filter((q) => q.done).length * QUEST_XP + (quests.every((q) => q.done) ? CHEST_XP : 0);

// ----------------------------------------------------------------------------------------------
// Gear: items for the hero, unlocked by real progress; the patient chooses what to wear.
// ----------------------------------------------------------------------------------------------

/** Hero level counts as 1 when a caller does not pass one (level gear stays locked). */
export type GearInput = { skills: Partial<Record<SkillKey, number>>; sessions: number; phasesCompleted: number; chestWeeks: number; level?: number };

const lvl = (g: GearInput) => g.level ?? 1;
const skill = (g: GearInput, key: SkillKey) => g.skills[key] ?? 1;

/** Level 10 wearable for each trainable skill. Knowledge has none. The captain band is the discipline item. */
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

export const GEAR: { key: string; nl: string; en: string; unlockNl: string; unlockEn: string; unlocked: (g: GearInput) => boolean }[] = [
  // Hero level — unchanged closet pieces
  { key: 'pin', nl: 'Borstspeld', en: 'Chest pin', unlockNl: 'Level 2', unlockEn: 'Level 2', unlocked: (g) => lvl(g) >= 2 },
  { key: 'visor', nl: 'Klep', en: 'Visor', unlockNl: 'Level 4', unlockEn: 'Level 4', unlocked: (g) => lvl(g) >= 4 },
  { key: 'crown', nl: 'Kroon', en: 'Crown', unlockNl: 'Level 12', unlockEn: 'Level 12', unlocked: (g) => lvl(g) >= 12 },
  // One level-10 piece per skill. Worn via the existing gear list; it never unlocks an exercise.
  { key: 'gloves', nl: 'Handschoenen', en: 'Gloves', unlockNl: 'Kracht level 10', unlockEn: 'Strength level 10', unlocked: (g) => skill(g, 'strength') >= SKILL_GEAR_LEVEL },
  { key: 'yoga_mat', nl: 'Yogamat op de rug', en: 'Yoga mat on the back', unlockNl: 'Mobiliteit level 10', unlockEn: 'Mobility level 10', unlocked: (g) => skill(g, 'mobility') >= SKILL_GEAR_LEVEL },
  { key: 'balance_shoes', nl: 'Balansschoenen', en: 'Balance shoes', unlockNl: 'Balans level 10', unlockEn: 'Balance level 10', unlocked: (g) => skill(g, 'balance') >= SKILL_GEAR_LEVEL },
  { key: 'belt', nl: 'Trainingsriem', en: 'Training belt', unlockNl: 'Stabiliteit level 10', unlockEn: 'Stability level 10', unlocked: (g) => skill(g, 'stability') >= SKILL_GEAR_LEVEL },
  { key: 'spikes', nl: 'Spikes', en: 'Spikes', unlockNl: 'Explosief level 10', unlockEn: 'Power level 10', unlocked: (g) => skill(g, 'power') >= SKILL_GEAR_LEVEL },
  { key: 'hr_band', nl: 'Hartslagband', en: 'Heart-rate band', unlockNl: 'Conditie level 10', unlockEn: 'Endurance level 10', unlocked: (g) => skill(g, 'endurance') >= SKILL_GEAR_LEVEL },
  { key: 'sport_item', nl: 'Sportitem', en: 'Sport item', unlockNl: 'Techniek level 10', unlockEn: 'Technique level 10', unlocked: (g) => skill(g, 'sport') >= SKILL_GEAR_LEVEL },
  { key: 'captain', nl: 'Aanvoerdersband', en: 'Captain’s armband', unlockNl: 'Discipline level 10', unlockEn: 'Discipline level 10', unlocked: (g) => skill(g, 'discipline') >= SKILL_GEAR_LEVEL },
  { key: 'towel', nl: 'Handdoek om de nek', en: 'Towel around the neck', unlockNl: 'Herstel level 10', unlockEn: 'Recovery level 10', unlocked: (g) => skill(g, 'recovery') >= SKILL_GEAR_LEVEL },
  { key: 'medal', nl: 'Medaille', en: 'Medal', unlockNl: 'Een fase van je revalidatie voltooid', unlockEn: 'A phase of your rehabilitation completed', unlocked: (g) => g.phasesCompleted >= 1 },
  { key: 'gold_shoes', nl: 'Gouden schoenen', en: 'Golden shoes', unlockNl: '25 trainingen', unlockEn: '25 workouts', unlocked: (g) => g.sessions >= 25 },
];
export const GEAR_KEYS = new Set(GEAR.map((g) => g.key));

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
