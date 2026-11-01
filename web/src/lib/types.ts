export type Role = 'owner' | 'admin' | 'therapist';
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  locale: 'nl' | 'en';
  isPlatformAdmin: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaRequired: boolean;
  memberships: { practiceId: string; practiceName: string; practiceSlug: string; role: Role; accent?: string | null }[];
  /** Staff only: minutes without activity before the login ends. */
  idleMinutes?: number | null;
  patient: { id: string; practiceId: string; practiceName: string; accent?: string | null } | null;
};

export type Defaults = { sets: number | null; reps: number | null; holdS: number | null; restS: number | null; tempo: string | null; frequency: string | null };

export type Exercise = {
  id: string;
  practiceId: string | null;
  scope: 'global' | 'practice';
  nameNl: string;
  nameEn: string;
  altNames: string[];
  bodyRegion: string;
  targetMuscles: string[];
  movementCategory: string | null;
  trainingCategories: string[];
  equipment: string[];
  difficulty: number;
  startingPositionNl: string;
  startingPositionEn: string;
  movementNl: string;
  movementEn: string;
  instructionsNl: string;
  instructionsEn: string;
  defaults: Defaults;
  tags: string[];
  videoMediaId: string | null;
  thumbnailMediaId: string | null;
  reviewStatus: 'needs_clinical_review' | 'reviewed';
  practiceMedia?: boolean;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  favorite: boolean;
  /** Other exercises with the same name (central/practice variants); list endpoint only. */
  variantCount?: number;
  createdBy: string | null;
  clinicalNotes?: string;
  physitrackId?: string | null;
  externalVideoUrl?: string | null;
  relations?: { kind: 'regression' | 'progression' | 'alternative'; id: string; nameNl: string; nameEn: string; difficulty: number; thumbnailMediaId: string | null; videoMediaId?: string | null; bodyRegion: string }[];
};

export type ProgramItem = {
  id?: string;
  exerciseId: string;
  alternativeExerciseId?: string | null;
  alternative?: { nameNl: string; nameEn: string } | null;
  sets: number | null;
  reps: number | null;
  holdS: number | null;
  restS: number | null;
  tempo: string | null;
  load: string | null;
  frequency: string | null;
  days: number[];
  notes: string;
  exercise: {
    id: string;
    nameNl: string;
    nameEn: string;
    bodyRegion: string;
    thumbnailMediaId: string | null;
    videoMediaId: string | null;
    difficulty: number;
    instructionsNl: string;
    instructionsEn: string;
    startingPositionNl: string;
    startingPositionEn: string;
    movementNl: string;
    movementEn: string;
    equipment: string[];
  };
};

export type ProgramStatus = 'draft' | 'active' | 'completed' | 'archived';
export type Program = {
  id: string;
  practiceId: string | null;
  patientId: string | null;
  isTemplate: boolean;
  scope: 'global' | 'practice' | 'patient';
  title: string;
  description: string;
  patientInstructions: string;
  status: ProgramStatus;
  startDate: string | null;
  endDate: string | null;
  version: number;
  sourceTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
  favorite?: boolean;
  patient?: { id: string; firstName: string; lastName: string } | null;
  items: ProgramItem[];
  itemCount?: number;
  regions?: string[];
  module?: ProgramModule;
  series?: ProgramSeries | null;
  indication?: string;
  criteria?: CriteriaGroup[];
  redFlags?: string[];
  warnings?: string[];
  evidence?: string;
  criteriaChecks?: CriteriaCheck[];
};

export type ProgramModule = 'revalidatie' | 'kracht' | 'mobiliteit';
export type ProgramSeries = { key: string; title: string; phaseNo: number; phaseCount: number; phaseName: string; weeks: string | null; goal: string | null };
/** Criteria to move on: per item the test (measurement method), threshold and source. */
export type CriteriaGroup = { to: string; title: string; items: { label: string; threshold: string; test: string; source: string }[] };
export type CriteriaCheck = { key: string; label: string; note: string; checkedAt: string; checkedBy: string | null };

export type Adherence = { planned: number; completed: number; rate: number | null };

export type PatientListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  locale: 'nl' | 'en';
  externalRef: string | null;
  hasAccount: boolean;
  invitedAt: string | null;
  archived: boolean;
  activePrograms: number;
  lastActivity: string | null;
  therapists: { id: string; fullName: string }[];
  adherence7d: Adherence;
};

export type PatientDetail = Omit<PatientListItem, 'activePrograms' | 'lastActivity' | 'adherence7d' | 'therapists'> & {
  practiceId: string;
  therapists: { id: string; fullName: string; isPrimary: boolean }[];
  programs: { id: string; title: string; status: ProgramStatus; startDate: string | null; endDate: string | null; version: number; updatedAt: string; itemCount: number }[];
};

export type SessionLog = { exerciseId: string; nameNl: string; nameEn: string; completed: boolean; setsDone: number | null; repsDone: number | null; difficulty: number | null; pain: number | null; feedback: string | null; plannedHoldS?: number | null; plannedSets?: number | null };
export type Progress = {
  weekly: (Adherence & { weekStart: string })[];
  adherence7d: Adherence;
  adherence28d: Adherence;
  completedSessions: number;
  sessions: { id: string; programId: string; programTitle: string; startedAt: string; completedAt: string | null; difficulty: number | null; pain: number | null; feedback: string | null; reviewedAt: string | null; logs: SessionLog[] }[];
  perExercise: { exerciseId: string; nameNl: string; nameEn: string; completed: number; logged: number; avgDifficulty: number | null; avgPain: number | null; maxPain: number | null }[];
};

export type Member = { userId: string; fullName: string; email: string; role: Role; title: string | null; active: boolean; patients: number; activated: boolean; mfaEnabled: boolean; createdAt: string };
export type Notification = { id: string; kind: string; title: string; body: string; link: string | null; readAt?: string | null; createdAt: string };
export type Labelled = { key: string; nl: string; en: string };

/** Sports hero (gamified revalidatie), see shared/hero.ts. */
export type PainCheckin = { recordedAt: string; entries: { area: string; score: number }[] };
export type HeroState = {
  hero: (import('@shared/hero').HeroLook & { createdAt: string; gear?: string[] }) | null;
  painMap: { baseline: PainCheckin | null; current: PainCheckin | null; checkins: number };
  level: { level: number; xp: number; from: number; to: number; progress: number };
  badges: { key: string; earned: boolean }[];
  skills: { key: import('@shared/hero').SkillKey; level: number; xp: number; from: number; to: number; progress: number }[];
  totalLevel: number;
  totals: { sessions: number; fullWeeks: number; phasesCompleted: number; since: string | null; painStart: number | null; painNow: number | null };
  quest: {
    title: string;
    goal: string | null;
    phaseNo: number | null;
    phaseCount: number | null;
    phaseGoal: string | null;
    phases: { no: number; name: string | null; weeks: string | null; goal: string | null; status: 'done' | 'current' | 'next' }[];
    timeline: { week: number; totalWeeks: number; progress: number; expectedEnd: string; weeksLeft: number } | null;
  } | null;
  weekly: { weekStart: string; quests: import('@shared/hero').Quest[]; chestWeeks: number; xpPerQuest: number; chestXp: number };
  gear: { unlocked: string[]; equipped: string[] };
  checkin: { today: { day: string; area: string; score: number } | null; area: string; total: number };
  trends: PainTrend[];
};
export type PainTrend = { area: string; points: { day: string; score: number; source: 'map' | 'daily' }[] };

/** Hero friends (opt-in): only the hero card is shared. */
export type HeroFriend = {
  id: string;
  kind: 'friend' | 'incoming' | 'outgoing';
  heroName: string;
  look: Omit<import('@shared/hero').HeroLook, 'heroName'> & { gear: string[] };
  stats: { level: number; totalLevel: number; skills: Record<import('@shared/hero').SkillKey, number> } | null;
  statsUpdatedAt: string | null;
  since: string;
};
export type FriendsState = { hasHero: boolean; sharing: { enabled: boolean; code: string | null }; friends: HeroFriend[] };
