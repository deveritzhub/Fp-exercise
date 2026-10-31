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
