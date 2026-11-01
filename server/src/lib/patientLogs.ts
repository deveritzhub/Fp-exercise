import type { Tx } from '../db';
import type { SkillKey } from '../../../shared/hero';
import { proteinHitDays, rewardProteinDays, rewardSelfTrainings, suggestedProteinGrams, type TrainingKind } from '../../../shared/patientLogs';

export type TrainingView = {
  id: string;
  day: string;
  kind: string;
  minutes: number;
  pain: number | null;
  stoppedForPain: boolean;
  note: string | null;
  createdAt: string;
};

export type PatientLogState = {
  protein: {
    goal: number | null;
    suggested: number;
    grams: number;
    hit: boolean;
    entries: { id: string; grams: number; label: string | null; createdAt: string }[];
  };
  trainings: TrainingView[];
};

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

const shiftDay = (day: string, days: number) => {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
};

/** Today's protein progress, recent own workouts, and the XP those logs earn. */
export async function loadPatientLogs(tx: Tx, patientId: string) {
  const today = (await tx.query("SELECT to_char(now(), 'YYYY-MM-DD') AS d")).rows[0].d as string;
  const weight = (await tx.query('SELECT weight_kg FROM patient_body_metrics WHERE patient_id = $1', [patientId])).rows[0]?.weight_kg;
  const goalRow = (await tx.query('SELECT grams FROM protein_goals WHERE patient_id = $1', [patientId])).rows[0];
  const goal = goalRow ? Number(goalRow.grams) : null;
  const proteinRows = (await tx.query('SELECT id, day::text AS day, grams, label, created_at FROM protein_logs WHERE patient_id = $1 ORDER BY created_at', [patientId])).rows;
  const trainingRows = (
    await tx.query(
      `SELECT id, day::text AS day, kind, minutes, pain, stopped_for_pain, note, created_at
         FROM self_trainings WHERE patient_id = $1 ORDER BY created_at`,
      [patientId],
    )
  ).rows;
  const trainings: TrainingView[] = trainingRows.map((r) => ({
    id: r.id as string,
    day: r.day as string,
    kind: r.kind as string,
    minutes: r.minutes as number,
    pain: r.pain as number | null,
    stoppedForPain: r.stopped_for_pain as boolean,
    note: (r.note as string | null) ?? null,
    createdAt: iso(r.created_at),
  }));
  const self = rewardSelfTrainings(
    trainings.map((t) => ({ day: t.day, kind: t.kind as TrainingKind, pain: t.pain, stoppedForPain: t.stoppedForPain, createdAt: t.createdAt })),
  );
  const hits = proteinHitDays(proteinRows.map((r) => ({ day: r.day as string, grams: Number(r.grams) })), goal);
  const protein = rewardProteinDays(hits.length);
  const skills: Partial<Record<SkillKey, number>> = {};
  for (const part of [self.skills, protein.skills]) {
    for (const [k, n] of Object.entries(part)) skills[k as SkillKey] = (skills[k as SkillKey] ?? 0) + (n ?? 0);
  }
  const entries = proteinRows
    .filter((r) => r.day === today)
    .map((r) => ({ id: r.id as string, grams: Number(r.grams), label: (r.label as string | null) ?? null, createdAt: iso(r.created_at) }));
  const grams = entries.reduce((a, e) => a + e.grams, 0);
  const from = shiftDay(today, -13);
  const view: PatientLogState = {
    protein: { goal, suggested: suggestedProteinGrams(weight === null || weight === undefined ? null : Number(weight)), grams, hit: goal !== null && grams >= goal, entries },
    trainings: trainings.filter((t) => t.day >= from),
  };
  return { view, heroXp: self.hero + protein.hero, skillXp: skills };
}
