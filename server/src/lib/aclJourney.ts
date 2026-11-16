import { bossProgress } from '../../../shared/measurementBoss';
import { ACL_SERIES_KEY } from '../../../shared/aclRoute';
import { aclMemorabilia, aclUnlocked, runeTier, wearableAclReward, type AclUnlockInput } from '../../../shared/aclRewards';
import { publicGuildRaid } from '../../../shared/worldMap';
import type { Tx } from '../db';
import { pointsFor, type GoalRow } from './boss';

/** What the ACL route has earned. Wearable keys join the bag; banners and pets stay in the hall. */
export async function aclJourneyFor(tx: Tx, patientId: string) {
  const input = await unlockInput(tx, patientId);
  const keys = aclUnlocked(input);
  const hero = (await tx.query('SELECT knee_scar, acl_sport FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0] as { knee_scar: boolean; acl_sport: string | null } | undefined;
  const sportKeys = keys.filter((k) => k.startsWith('sport_'));
  const chosen = hero?.acl_sport ? `sport_${hero.acl_sport}` : null;
  const wearable = keys.filter((k) => wearableAclReward(k) && (!k.startsWith('sport_') || k === chosen));
  return {
    wearable,
    public: {
      owned: keys,
      wearable,
      memorabilia: [...aclMemorabilia(keys, input.defeatedPhases), ...(keys.includes('crutch_staff') ? ['crutches'] : [])],
      pets: keys.filter((k) => k === 'pet_wolf' || k === 'pet_horse'),
      banner: keys.includes('vkb_banner'),
      guildBanner: keys.includes('guild_banner'),
      runeTier: runeTier(input.bestQuadLsi),
      scar: !!hero?.knee_scar,
      sport: hero?.acl_sport ?? null,
      sportChoice: input.defeatedPhases.includes(5) ? sportKeys : [],
    },
  };
}

async function unlockInput(tx: Tx, patientId: string): Promise<AclUnlockInput> {
  const phases = (await tx.query(
    `SELECT p.phase_no
       FROM programs p
      WHERE p.patient_id = $1 AND p.series_key = $2 AND NOT p.is_template
        AND EXISTS (SELECT 1 FROM phase_boss_goals g WHERE g.program_id = p.id AND g.active)
        AND NOT EXISTS (SELECT 1 FROM phase_boss_goals g WHERE g.program_id = p.id AND g.active AND g.defeated_at IS NULL)`,
    [patientId, ACL_SERIES_KEY],
  )).rows.map((r) => Number(r.phase_no));
  const goals = (await tx.query(
    `SELECT g.*, p.phase_no FROM phase_boss_goals g
       JOIN programs p ON p.id = g.program_id
      WHERE g.patient_id = $1 AND g.active AND g.measure_key IN ('knee_flexion', 'unassisted_gait', 'lsi_quad')`,
    [patientId],
  )).rows as (GoalRow & { phase_no: number })[];
  const met = (phase: number, key: string) => goals.some((g) => Number(g.phase_no) === phase && g.measure_key === key && g.defeated_at);
  let best = 0;
  for (const g of goals.filter((x) => x.measure_key === 'lsi_quad')) {
    const progress = bossProgress(await pointsFor(tx, patientId, g), Number(g.target), g.comparator);
    best = Math.max(best, progress.best ?? 0);
  }
  const weeks = Number((await tx.query(
    `SELECT count(DISTINCT to_char(date_trunc('week', completed_at AT TIME ZONE 'Europe/Amsterdam'), 'IYYY-IW'))::int AS n
       FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL`,
    [patientId],
  )).rows[0]?.n ?? 0);
  const practice = (await tx.query('SELECT practice_id FROM patients WHERE id = $1', [patientId])).rows[0]?.practice_id as string | undefined;
  let guild = false;
  if (practice) {
    const row = (await tx.query(
      `SELECT cohort, workouts FROM app.practice_guild_week($1, date_trunc('week', now() AT TIME ZONE 'Europe/Amsterdam')::date)`,
      [practice],
    )).rows[0];
    const pub = publicGuildRaid({ cohort: Number(row?.cohort ?? 0), workouts: Number(row?.workouts ?? 0), mine: 0 }, 'staff');
    guild = pub.available === true && pub.defeated;
  }
  return {
    defeatedPhases: phases,
    flexionMilestone: met(2, 'knee_flexion'),
    unassistedGait: met(2, 'unassisted_gait'),
    bestQuadLsi: best,
    consistentWeeks: weeks,
    guildRaidDefeated: guild,
  };
}
