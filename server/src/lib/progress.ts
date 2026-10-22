import type { Tx } from '../db';
import { adherence, toISODate, weeklyAdherence, type ProgramSchedule } from '../../../shared/adherence';

/** Load schedules + completed session days for a set of patients (RLS applies). */
export async function loadAdherenceInputs(tx: Tx, patientIds: string[]) {
  const schedules = new Map<string, ProgramSchedule[]>();
  const done = new Map<string, Map<string, Set<string>>>();
  if (!patientIds.length) return { schedules, done };
  const progs = await tx.query(
    `SELECT p.id, p.patient_id, p.start_date, p.end_date, p.activated_at,
            coalesce((SELECT array_agg(DISTINCT d) FROM program_items i, unnest(i.days) d WHERE i.program_id = p.id), '{}') AS weekdays
       FROM programs p
      WHERE p.patient_id = ANY($1) AND NOT p.is_template AND p.status IN ('active','completed')`,
    [patientIds],
  );
  for (const r of progs.rows) {
    const list = schedules.get(r.patient_id) ?? [];
    list.push({
      id: r.id,
      startDate: r.start_date,
      endDate: r.end_date,
      activatedOn: r.activated_at ? toISODate(new Date(r.activated_at)) : null,
      weekdays: r.weekdays.map(Number),
    });
    schedules.set(r.patient_id, list);
  }
  const sess = await tx.query(
    `SELECT DISTINCT patient_id, program_id, (completed_at AT TIME ZONE current_setting('TIMEZONE'))::date AS day
       FROM workout_sessions WHERE patient_id = ANY($1) AND completed_at IS NOT NULL`,
    [patientIds],
  );
  for (const r of sess.rows) {
    const m = done.get(r.patient_id) ?? new Map<string, Set<string>>();
    const s = m.get(r.program_id) ?? new Set<string>();
    s.add(typeof r.day === 'string' ? r.day : toISODate(r.day));
    m.set(r.program_id, s);
    done.set(r.patient_id, m);
  }
  return { schedules, done };
}

export function adherenceForPatient(
  inputs: Awaited<ReturnType<typeof loadAdherenceInputs>>,
  patientId: string,
  days: number,
  today = new Date(),
) {
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return adherence(inputs.schedules.get(patientId) ?? [], inputs.done.get(patientId) ?? new Map(), from, today);
}

export function weeklyForPatient(inputs: Awaited<ReturnType<typeof loadAdherenceInputs>>, patientId: string, weeks: number) {
  return weeklyAdherence(inputs.schedules.get(patientId) ?? [], inputs.done.get(patientId) ?? new Map(), new Date(), weeks);
}
