/**
 * Patient world map and the practice guild raid.
 *
 * Zones follow the therapist-approved phase (or the active programme when there are no phases).
 * Completed workouts only draw path nodes. They never open a zone, never raise a reward past
 * "did the prescribed session once", and never punish a rest day or a pain report.
 *
 * The guild raid is a practice-wide total. The public shape hides that total below the same
 * cohort of five used by the team quest, and never includes names or per-person counts.
 */
import { chapterBossState, type BossDisplay } from './chapterBoss';
import type { AccountKind } from './accountKind';
import { isClinical } from './accountKind';

export const GUILD_MIN_COHORT = 5;
/** Fixed weekly pool. Extra sessions past this do not grant a bigger reward. */
export const GUILD_BOSS_HP = 40;

export type ZoneStatus = 'done' | 'current' | 'next';

export type WorldProgram = {
  id: string;
  title: string;
  status: 'active' | 'completed';
  module: string;
  seriesKey: string | null;
  phaseNo: number | null;
  phaseName: string | null;
  phaseWeeks: string | null;
  phaseGoal: string | null;
  nodes: number;
  region: string | null;
};

export type PhaseTemplate = {
  no: number;
  name: string | null;
  weeks: string | null;
  goal: string | null;
};

export type ZoneExercise = { itemId: string; programId: string; nameNl: string; nameEn: string };

export type WorldZone = {
  no: number;
  name: string | null;
  /** Indicative weeks. Never sent for a locked zone. */
  weeks: string | null;
  /** Patient-facing goal. Omitted for non-clinical accounts and for locked zones. */
  goal: string | null;
  status: ZoneStatus;
  /** Completed prescribed workouts in this zone. Display only; never opens the zone. */
  nodes: number;
  region: string | null;
  boss: BossDisplay;
  locked: boolean;
  /** Patient programme for this zone. Null while the phase is still locked. */
  programId: string | null;
  /** When the therapist released this phase, YYYY-MM-DD. */
  releasedOn: string | null;
  startedOn: string | null;
  endedOn: string | null;
  /** Dates of completed prescribed workouts. Empty while locked. */
  workoutDates: string[];
  /** Exercises of this phase's programme. Empty while locked. */
  exercises: ZoneExercise[];
  /** Skills trained by those exercises, for the trophy cabinet. Empty while locked. */
  skills: string[];
};

export type RestReason = 'rest' | 'pain';
export type RestBuff = { active: boolean; reason: RestReason | null };

export type GuildCounts = { cohort: number; workouts: number; mine: number };

export type GuildPublic =
  | { available: false; reward?: boolean }
  | {
      available: true;
      participantsBand: '5+';
      workouts: number;
      bossHp: number;
      bossMaxHp: number;
      defeated: boolean;
      reward?: boolean;
    };

const THEMES: Record<string, { nl: string; en: string }> = {
  knee: { nl: 'Knievallei', en: 'Knee valley' },
  shoulder: { nl: 'Schouderbergen', en: 'Shoulder mountains' },
  lumbar_spine: { nl: 'Rugwoud', en: 'Back forest' },
  thoracic_spine: { nl: 'Rugwoud', en: 'Back forest' },
  cervical_spine: { nl: 'Nekpas', en: 'Neck pass' },
  hip: { nl: 'Heupheuvels', en: 'Hip hills' },
  ankle_foot: { nl: 'Enkelkreek', en: 'Ankle creek' },
  elbow: { nl: 'Elleboogklif', en: 'Elbow cliff' },
  wrist_hand: { nl: 'Handvallei', en: 'Hand valley' },
  full_body: { nl: 'Het oefenveld', en: 'The training field' },
};

export const FALLBACK_ZONE = { nl: 'Het oefenland', en: 'The training land' };

export function zoneTheme(region: string | null | undefined) {
  const known = region ? THEMES[region] : undefined;
  return { region: known ? region! : null, nl: known?.nl ?? FALLBACK_ZONE.nl, en: known?.en ?? FALLBACK_ZONE.en };
}

/** A programmed rest day or a pain report. Neither removes nodes nor locks a zone back. */
export function restBuff(input: { programmedRest: boolean; reportedPain: boolean }): RestBuff {
  if (input.reportedPain) return { active: true, reason: 'pain' };
  if (input.programmedRest) return { active: true, reason: 'rest' };
  return { active: false, reason: null };
}

/**
 * Public guild raid. `mine` becomes a personal cosmetic flag only (the caller's own sessions).
 * Staff never receive that flag. Counts stay hidden under five active patients.
 */
export function publicGuildRaid(counts: GuildCounts, audience: 'patient' | 'staff'): GuildPublic {
  const workouts = Math.max(0, Math.floor(counts.workouts));
  const mine = Math.max(0, Math.floor(counts.mine));
  const reward = mine >= 1;
  if (!Number.isFinite(counts.cohort) || counts.cohort < GUILD_MIN_COHORT) {
    return audience === 'patient' ? { available: false, reward } : { available: false };
  }
  const bossHp = Math.max(0, GUILD_BOSS_HP - workouts);
  const open = {
    available: true as const,
    participantsBand: '5+' as const,
    workouts,
    bossHp,
    bossMaxHp: GUILD_BOSS_HP,
    defeated: bossHp === 0 && workouts > 0,
  };
  return audience === 'patient' ? { ...open, reward } : open;
}

function statusFor(no: number, currentNo: number): ZoneStatus {
  if (no < currentNo) return 'done';
  if (no === currentNo) return 'current';
  return 'next';
}

function zoneFrom(part: {
  no: number;
  name: string | null;
  weeks: string | null;
  goal: string | null;
  status: ZoneStatus;
  nodes: number;
  region: string | null;
  clinical: boolean;
  programId: string | null;
}): WorldZone {
  const locked = part.status === 'next';
  return {
    no: part.no,
    name: part.name,
    weeks: locked ? null : part.weeks,
    goal: locked || !part.clinical ? null : part.goal,
    status: part.status,
    nodes: Math.max(0, Math.floor(part.nodes)),
    region: zoneTheme(part.region).region ?? part.region,
    boss: chapterBossState(part.status),
    locked,
    programId: locked ? null : part.programId,
    releasedOn: null,
    startedOn: null,
    endedOn: null,
    workoutDates: [],
    exercises: [],
    skills: [],
  };
}

/** A locked zone keeps its name only. Goals, dates, exercises and skills stay off the payload. */
export function sealZone<T extends WorldZone>(zone: T): T {
  if (!zone.locked) return zone;
  return {
    ...zone,
    weeks: null,
    goal: null,
    programId: null,
    releasedOn: null,
    startedOn: null,
    endedOn: null,
    workoutDates: [],
    exercises: [],
    skills: [],
  };
}

/** The programme the map follows: an active rehab phase when there is one. */
export function primaryProgram(programs: readonly WorldProgram[]): WorldProgram | null {
  const active = programs.filter((p) => p.status === 'active');
  const pool = active.length ? active : programs;
  return [...pool].sort((a, b) => {
    const rehab = (p: WorldProgram) => (p.module === 'revalidatie' ? 0 : 1);
    const phased = (p: WorldProgram) => (p.phaseNo != null ? 0 : 1);
    return rehab(a) - rehab(b) || phased(a) - phased(b);
  })[0] ?? null;
}

export function buildWorld(input: {
  clinical: boolean;
  programs: readonly WorldProgram[];
  phaseTemplates: readonly PhaseTemplate[];
  seriesRegion: string | null;
  scheduledToday: number;
  reportedPain: boolean;
  guild: GuildCounts;
}) {
  const primary = primaryProgram(input.programs);
  const templates = [...input.phaseTemplates].sort((a, b) => a.no - b.no);
  let zones: WorldZone[] = [];

  if (primary?.seriesKey && primary.phaseNo != null && templates.length) {
    const inSeries = input.programs.filter((p) => p.seriesKey === primary.seriesKey);
    zones = templates.map((ph) => {
      const matches = inSeries.filter((p) => p.phaseNo === ph.no);
      const nodes = matches.reduce((sum, p) => sum + p.nodes, 0);
      const status = statusFor(ph.no, primary.phaseNo!);
      const program = matches.find((p) => p.status === 'active') ?? matches[0] ?? null;
      return zoneFrom({
        no: ph.no,
        name: ph.name,
        weeks: ph.weeks,
        goal: ph.goal,
        status,
        nodes,
        region: input.seriesRegion ?? primary.region,
        clinical: input.clinical,
        programId: program?.id ?? null,
      });
    });
  } else {
    const list = input.programs.filter((p) => p.status === 'active' || p.status === 'completed');
    zones = list.map((p, index) => zoneFrom({
      no: p.phaseNo ?? index + 1,
      name: p.phaseName || p.title,
      weeks: p.phaseWeeks,
      goal: p.phaseGoal,
      status: p.status === 'completed' ? 'done' : 'current',
      nodes: p.nodes,
      region: p.region,
      clinical: input.clinical,
      programId: p.id,
    }));
  }

  const runnable = input.programs.filter((p) => p.status === 'active').length;
  return {
    clinical: input.clinical,
    zones: zones.map(sealZone),
    heroZoneNo: zones.find((z) => z.status === 'current')?.no ?? zones[0]?.no ?? null,
    rest: restBuff({ programmedRest: runnable > 0 && input.scheduledToday === 0, reportedPain: input.reportedPain }),
    guild: publicGuildRaid(input.guild, 'patient'),
    empty: zones.length === 0,
  };
}

type Line = { nl: string; en: string };

const COUNT_BADGES = [
  { key: 'first_session', at: 1 },
  { key: 'sessions_10', at: 10 },
  { key: 'sessions_25', at: 25 },
] as const;

/** Badges whose wording is clinical. Hidden on coach and personal accounts. */
const CLINICAL_BADGES = new Set(['honest', 'pain_down', 'safety_first', 'phase_done']);
/** Not tied to a workout count. Shown on the current zone only, from the cabinet. */
const CURRENT_BADGES = ['full_week', 'season_champ', 'boss_hunter', 'chest_week'] as const;

export type ZonePrizeInput = { no: number; status: ZoneStatus; workouts: number; skills: readonly string[] };
export type EarnedTrophy = { key: string; skill: string; level: number; tier: string };

/**
 * Place cabinet trophies and badges onto unlocked zones.
 * Count badges land on the zone where the running total of prescribed workouts crosses the mark.
 * A skill trophy lands on the earliest open zone that trains that skill, otherwise the current zone.
 * Locked zones stay empty. Nothing here grants a new reward.
 */
export function prizesForZones(input: {
  clinical: boolean;
  zones: readonly ZonePrizeInput[];
  trophies: readonly EarnedTrophy[];
  badges: readonly string[];
}) {
  const open = input.zones.filter((z) => z.status !== 'next').sort((a, b) => a.no - b.no);
  const current = open.find((z) => z.status === 'current') ?? open[open.length - 1] ?? null;
  const out = new Map<number, { trophies: EarnedTrophy[]; badges: string[] }>();
  for (const z of input.zones) out.set(z.no, { trophies: [], badges: [] });
  for (const trophy of input.trophies) {
    const home = open.find((z) => z.skills.includes(trophy.skill)) ?? current;
    if (home) out.get(home.no)!.trophies.push(trophy);
  }
  const earned = new Set(input.badges);
  let cum = 0;
  for (const z of open) {
    const before = cum;
    cum += Math.max(0, z.workouts);
    for (const b of COUNT_BADGES) {
      if (earned.has(b.key) && before < b.at && cum >= b.at) out.get(z.no)!.badges.push(b.key);
    }
  }
  if (current) {
    for (const key of CURRENT_BADGES) if (earned.has(key)) out.get(current.no)!.badges.push(key);
    if (input.clinical && earned.has('phase_done')) {
      const firstDone = open.find((z) => z.status === 'done');
      if (firstDone) out.get(firstDone.no)!.badges.push('phase_done');
    }
    if (input.clinical) {
      for (const key of CLINICAL_BADGES) {
        if (key === 'phase_done') continue;
        if (earned.has(key)) out.get(current.no)!.badges.push(key);
      }
    }
  }
  for (const z of input.zones) if (z.status === 'next') out.set(z.no, { trophies: [], badges: [] });
  return out;
}

export type VillageNeed = 'hero' | 'atlas' | 'mission' | 'guild';
export const VILLAGE = [
  { key: 'smithy', to: '/p/held/inventaris#gear-title', needs: 'hero' },
  { key: 'library', to: '/p/spieren', needs: 'atlas' },
  { key: 'hall', to: '/p/held/inventaris#trophies-title', needs: 'hero' },
  { key: 'board', to: '/p', needs: 'mission' },
  { key: 'guild', to: '/p/wereld#gilde', needs: 'guild' },
] as const;

/** Buildings whose feature exists for this account. Order is the path around the square. */
export function villageBuildings(flags: Record<VillageNeed, boolean>) {
  return VILLAGE.filter((b) => flags[b.needs]);
}

/** Screen copy. Coach and personal accounts never use complaint, diagnosis or rehab wording. */
export function worldCopy(kind: AccountKind | null | undefined): {
  intro: Line;
  unlock: Line;
  boss: Line;
  bossPast: Line;
  bossReview: Line;
  bossLocked: Line;
  rest: Line;
  pain: Line;
  lockedNotice: Line;
} {
  const clinical = isClinical(kind);
  if (clinical) {
    return {
      intro: {
        nl: 'Je revalidatieroute als wereldkaart. Je mag elke zone bekijken. Alleen je fysiotherapeut geeft de volgende zone vrij.',
        en: 'Your rehabilitation route as a world map. You can look at every zone. Only your physiotherapist opens the next zone.',
      },
      unlock: {
        nl: 'Meer herhalingen of meer gewicht openen geen zone.',
        en: 'More repetitions or more weight never open a zone.',
      },
      boss: { nl: 'Hoofdstukbaas', en: 'Chapter boss' },
      bossPast: { nl: 'Dit hoofdstuk ligt achter je.', en: 'This chapter is behind you.' },
      bossReview: { nl: 'Je fysiotherapeut beoordeelt of je verder mag. Deze kaart geeft geen vrijgave.', en: 'Your physiotherapist decides whether you move on. This card never grants clearance.' },
      bossLocked: { nl: 'Nog in de mist. De zone gaat niet vanzelf open.', en: 'Still in the fog. The zone does not open by itself.' },
      rest: { nl: 'Rustbuff: vandaag staat er geen training op het schema. Er gaat niets verloren en je hoeft niets in te halen.', en: 'Rest buff: nothing is scheduled today. Nothing is lost and there is nothing to catch up.' },
      pain: { nl: 'Rustbuff: je gaf pijn aan. Er gaat niets verloren en je hoeft niets in te halen.', en: 'Rest buff: you reported pain. Nothing is lost and there is nothing to catch up.' },
      lockedNotice: { nl: 'Je therapeut geeft deze zone vrij.', en: 'Your therapist releases this zone.' },
    };
  }
  if (kind === 'coach') {
    return {
      intro: {
        nl: 'Je trainingsschema als wereldkaart. Een volgend stuk gaat alleen open als je coach het schema vrijgeeft.',
        en: 'Your training plan as a world map. The next stretch opens only when your coach releases the plan.',
      },
      unlock: {
        nl: 'Meer herhalingen of meer gewicht openen geen stuk.',
        en: 'More repetitions or more weight never open a stretch.',
      },
      boss: { nl: 'Eindpunt', en: 'Finish' },
      bossPast: { nl: 'Dit stuk ligt achter je.', en: 'This stretch is behind you.' },
      bossReview: { nl: 'Je coach bepaalt het volgende schema. Deze kaart geeft dat niet vrij.', en: 'Your coach sets the next plan. This card does not release it.' },
      bossLocked: { nl: 'Nog in de mist. Het stuk gaat niet vanzelf open.', en: 'Still in the fog. The stretch does not open by itself.' },
      rest: { nl: 'Rustbuff: vandaag staat er geen training op het schema. Er gaat niets verloren en je hoeft niets in te halen.', en: 'Rest buff: nothing is scheduled today. Nothing is lost and there is nothing to catch up.' },
      pain: { nl: 'Rustbuff: je gaf aan dat het niet lekker voelde. Er gaat niets verloren en je hoeft niets in te halen.', en: 'Rest buff: you let us know it did not feel good. Nothing is lost and there is nothing to catch up.' },
      lockedNotice: { nl: 'Je coach geeft dit stuk vrij.', en: 'Your coach releases this stretch.' },
    };
  }
  return {
    intro: {
      nl: 'Je trainingsschema als wereldkaart. Een volgend stuk gaat open als jij een volgend schema kiest.',
      en: 'Your training plan as a world map. The next stretch opens when you choose a next plan.',
    },
    unlock: {
      nl: 'Meer herhalingen of meer gewicht openen geen stuk.',
      en: 'More repetitions or more weight never open a stretch.',
    },
    boss: { nl: 'Eindpunt', en: 'Finish' },
    bossPast: { nl: 'Dit stuk ligt achter je.', en: 'This stretch is behind you.' },
    bossReview: { nl: 'Jij kiest wanneer je een volgend schema pakt. Deze kaart doet dat niet vanzelf.', en: 'You choose when to pick a next plan. This card does not do that for you.' },
    bossLocked: { nl: 'Nog in de mist. Het stuk gaat niet vanzelf open.', en: 'Still in the fog. The stretch does not open by itself.' },
    rest: { nl: 'Rustbuff: vandaag staat er geen training op het schema. Er gaat niets verloren en je hoeft niets in te halen.', en: 'Rest buff: nothing is scheduled today. Nothing is lost and there is nothing to catch up.' },
    pain: { nl: 'Rustbuff: je gaf aan dat het niet lekker voelde. Er gaat niets verloren en je hoeft niets in te halen.', en: 'Rest buff: you let us know it did not feel good. Nothing is lost and there is nothing to catch up.' },
    lockedNotice: { nl: 'Dit stuk gaat open als jij een volgend schema kiest.', en: 'This stretch opens when you choose a next plan.' },
  };
}
