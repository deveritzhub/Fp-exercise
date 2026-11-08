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

export type WorldZone = {
  no: number;
  name: string | null;
  weeks: string | null;
  /** Patient-facing goal. Omitted for non-clinical accounts. */
  goal: string | null;
  status: ZoneStatus;
  /** Completed prescribed workouts in this zone. Display only. */
  nodes: number;
  region: string | null;
  boss: BossDisplay;
  locked: boolean;
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
}): WorldZone {
  return {
    no: part.no,
    name: part.name,
    weeks: part.weeks,
    goal: part.clinical ? part.goal : null,
    status: part.status,
    nodes: Math.max(0, Math.floor(part.nodes)),
    region: zoneTheme(part.region).region ?? part.region,
    boss: chapterBossState(part.status),
    locked: part.status === 'next',
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
      const nodes = inSeries.filter((p) => p.phaseNo === ph.no).reduce((sum, p) => sum + p.nodes, 0);
      const status = statusFor(ph.no, primary.phaseNo!);
      return zoneFrom({
        no: ph.no,
        name: ph.name,
        weeks: ph.weeks,
        goal: ph.goal,
        status,
        nodes,
        region: input.seriesRegion ?? primary.region,
        clinical: input.clinical,
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
    }));
  }

  const runnable = input.programs.filter((p) => p.status === 'active').length;
  return {
    clinical: input.clinical,
    zones,
    heroZoneNo: zones.find((z) => z.status === 'current')?.no ?? zones[0]?.no ?? null,
    rest: restBuff({ programmedRest: runnable > 0 && input.scheduledToday === 0, reportedPain: input.reportedPain }),
    guild: publicGuildRaid(input.guild, 'patient'),
    empty: zones.length === 0,
  };
}

type Line = { nl: string; en: string };

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
  };
}
