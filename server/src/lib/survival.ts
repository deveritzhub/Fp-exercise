import type { Tx } from '../db';
import { SURVIVAL_XP, WATER, energyLevel, sessionLoad, sleepScore, stiffnessLevel, stiffnessWithSteps, survivalStatus, waterTarget, type SurvivalStatus } from '../../../shared/survival';

export type SurvivalView = {
  water: { ml: number; target: number; ratio: number; entries: { id: string; ml: number; createdAt: string }[] };
  sleep: { hours: number; quality: number; score: number } | null;
  energy: number;
  stiffness: number;
  status: SurvivalStatus[];
};

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

/** Today's meters (Europe/Amsterdam) and the XP that water and sleep logs earn over all days. */
export async function loadSurvival(tx: Tx, patientId: string, weightKg: number | null, walked: { steps: number; goal: number } = { steps: 0, goal: 0 }) {
  const target = waterTarget(weightKg);
  const today = (await tx.query("SELECT to_char(now(), 'YYYY-MM-DD') AS d, extract(hour FROM now())::int AS h")).rows[0];
  const waterRows = (await tx.query('SELECT id, day::text AS day, ml, created_at FROM water_logs WHERE patient_id = $1 ORDER BY created_at', [patientId])).rows;
  const perDay = new Map<string, number>();
  for (const r of waterRows) perDay.set(r.day, (perDay.get(r.day) ?? 0) + Number(r.ml));
  const waterHitDays = [...perDay.values()].filter((ml) => ml >= target).length;
  const ml = perDay.get(today.d) ?? 0;
  const sleepRows = (await tx.query('SELECT day::text AS day, hours, quality FROM sleep_logs WHERE patient_id = $1', [patientId])).rows;
  const sleepToday = sleepRows.find((r) => r.day === today.d);
  const sleep = sleepToday ? { hours: Number(sleepToday.hours), quality: Number(sleepToday.quality), score: sleepScore(Number(sleepToday.hours), Number(sleepToday.quality)) } : null;

  // Training load today and yesterday: programme sessions (RPE × duration) and own workouts.
  const load = (
    await tx.query(
      `SELECT (completed_at AT TIME ZONE current_setting('TIMEZONE'))::date = now()::date AS today,
              difficulty AS rpe, least(120, greatest(5, extract(epoch FROM completed_at - started_at) / 60))::int AS minutes
         FROM workout_sessions
        WHERE patient_id = $1 AND completed_at IS NOT NULL AND completed_at > now()::date - 1
       UNION ALL
       SELECT day = now()::date, NULL::smallint, minutes FROM self_trainings WHERE patient_id = $1 AND day >= now()::date - 1`,
      [patientId],
    )
  ).rows;
  let loadToday = 0;
  let loadYesterday = 0;
  for (const r of load) {
    // Own workouts carry a pain score, not an RPE: count them at a moderate RPE of 5.
    const l = sessionLoad(r.rpe === null || r.rpe === undefined ? 5 : Math.min(10, Number(r.rpe)), Number(r.minutes));
    if (r.today) loadToday += l;
    else loadYesterday += l;
  }
  // Last movement today: logged exercises, finished sessions, own workouts.
  const last = (
    await tx.query(
      `SELECT max(t) AS t FROM (
         SELECT max(created_at) AS t FROM exercise_logs WHERE patient_id = $1 AND created_at::date = now()::date
         UNION ALL SELECT max(completed_at) FROM workout_sessions WHERE patient_id = $1 AND completed_at::date = now()::date
         UNION ALL SELECT max(created_at) FROM self_trainings WHERE patient_id = $1 AND day = now()::date) x`,
      [patientId],
    )
  ).rows[0]?.t;
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(7, 0, 0, 0);
  const since = last ? new Date(last).getTime() : startOfDay.getTime();
  const hoursSinceMove = Math.max(0, (now - since) / 3_600_000);
  const stiffness = today.h < 7 ? 0 : stiffnessWithSteps(stiffnessLevel(hoursSinceMove), walked.steps, walked.goal);
  const ratio = ml / target;
  const energy = energyLevel({ sleepScore: sleep?.score ?? null, loadToday, loadYesterday, restDay: loadToday === 0, waterRatio: ratio });
  const view: SurvivalView = {
    water: { ml, target, ratio, entries: waterRows.filter((r) => r.day === today.d).map((r) => ({ id: r.id, ml: Number(r.ml), createdAt: iso(r.created_at) })) },
    sleep,
    energy,
    stiffness,
    status: survivalStatus({ waterRatio: ratio, sleepScore: sleep?.score ?? null, sleepHours: sleep?.hours ?? null, energy, stiffness, movedToday: !!last || (walked.goal > 0 && walked.steps >= walked.goal * 0.3), hour: today.h }),
  };
  const heroXp = waterHitDays * SURVIVAL_XP.waterGoal + sleepRows.length * SURVIVAL_XP.sleepLogged;
  const recoveryXp = waterHitDays * SURVIVAL_XP.waterRecovery + sleepRows.length * SURVIVAL_XP.sleepRecovery;
  return { view, heroXp, recoveryXp, maxWaterToday: WATER.maxPerDay - ml };
}
