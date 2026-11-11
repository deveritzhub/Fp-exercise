import { ACL_SERIES_KEY } from '../../../shared/aclRoute';
import { bossProgress } from '../../../shared/measurementBoss';
import type { Tx } from '../db';
import { pointsFor, type GoalRow } from './boss';

export type CriterionStatus = 'met' | 'open' | 'unmeasured';

/** Therapist view of every phase goal: both sides, the computed index, and the trend. */
export async function aclBoard(tx: Tx, patientId: string) {
  const route = (await tx.query(
    `SELECT side, to_char(surgery_on, 'YYYY-MM-DD') AS surgery_on, to_char(start_on, 'YYYY-MM-DD') AS start_on
       FROM acl_routes WHERE patient_id = $1`,
    [patientId],
  )).rows[0] as { side: 'left' | 'right'; surgery_on: string | null; start_on: string | null } | undefined;
  const programs = (await tx.query(
    `SELECT id, phase_no, phase_name, status FROM programs
      WHERE patient_id = $1 AND series_key = $2 AND NOT is_template
      ORDER BY phase_no`,
    [patientId, ACL_SERIES_KEY],
  )).rows;
  if (!programs.length) return { assigned: false as const, side: null, surgeryOn: null, startOn: null, phases: [] };
  const goals = (await tx.query(
    `SELECT * FROM phase_boss_goals WHERE patient_id = $1 ORDER BY slot`,
    [patientId],
  )).rows as GoalRow[];
  const phases = [];
  for (const program of programs) {
    const mine = goals.filter((g) => g.program_id === program.id);
    const criteria = [];
    for (const g of mine) {
      const points = g.active === false ? [] : await pointsFor(tx, patientId, g);
      const progress = bossProgress(points, Number(g.target), g.comparator);
      const status: CriterionStatus = !g.active ? 'unmeasured' : progress.defeated || g.defeated_at ? 'met' : progress.latest == null ? 'unmeasured' : 'open';
      const sides = g.source === 'lsi' ? await rawSides(tx, patientId, g) : null;
      criteria.push({
        slot: Number((g as GoalRow & { slot?: number }).slot ?? 1),
        active: g.active !== false,
        labelNl: g.label_nl,
        labelEn: g.label_en,
        clinicalNl: (g as GoalRow & { clinical_nl?: string }).clinical_nl ?? '',
        clinicalEn: (g as GoalRow & { clinical_en?: string }).clinical_en ?? '',
        comparator: g.comparator,
        target: Number(g.target),
        unit: g.unit,
        mode: g.mode,
        status: g.active === false ? 'unmeasured' as const : status,
        latest: progress.latest,
        latestOn: points.at(-1)?.at ?? null,
        involved: sides?.involved ?? null,
        uninvolved: sides?.uninvolved ?? null,
        lsi: g.source === 'lsi' ? progress.latest : null,
        ratio: g.active === false ? 0 : progress.ratio,
        points: points.map((p) => ({ at: p.at, value: p.value })),
      });
    }
    const live = criteria.filter((c) => c.active);
    const ratio = live.length ? Math.min(...live.map((c) => c.ratio)) : 0;
    phases.push({
      programId: program.id as string,
      no: Number(program.phase_no),
      name: program.phase_name as string,
      status: program.status as string,
      bossNl: mine[0]?.boss_nl ?? '',
      bossEn: mine[0]?.boss_en ?? '',
      ratio,
      defeated: live.length > 0 && live.every((c) => c.status === 'met'),
      met: live.filter((c) => c.status === 'met').length,
      total: live.length,
      criteria,
    });
  }
  return {
    assigned: true as const,
    side: route?.side ?? null,
    surgeryOn: route?.surgery_on ?? null,
    startOn: route?.start_on ?? null,
    phases,
  };
}

async function rawSides(tx: Tx, patientId: string, g: GoalRow) {
  const key = g.measure_key === 'lsi_quad' ? 'quad_strength'
    : g.measure_key === 'lsi_hamstring' ? 'hamstring_strength'
    : g.measure_key === 'lsi_hop_single' ? 'hop_single'
    : g.measure_key === 'lsi_hop_triple' ? 'hop_triple'
    : g.measure_key === 'lsi_hop_crossover' ? 'hop_crossover'
    : g.measure_key === 'lsi_hop_timed' ? 'hop_timed_6m'
    : null;
  if (!key || (g.involved_side !== 'left' && g.involved_side !== 'right')) return null;
  const other = g.involved_side === 'left' ? 'right' : 'left';
  const { rows } = await tx.query(
    `SELECT DISTINCT ON (side) side, value, to_char(measured_on, 'YYYY-MM-DD') AS at
       FROM patient_outcomes
      WHERE patient_id = $1 AND metric_key = $2 AND side IN ('left', 'right')
      ORDER BY side, measured_on DESC, created_at DESC`,
    [patientId, key],
  );
  const pick = (side: string) => {
    const row = rows.find((r) => r.side === side);
    return row ? { value: Number(row.value), on: row.at as string } : null;
  };
  return { involved: pick(g.involved_side), uninvolved: pick(other) };
}

const NAMES: Record<string, string> = {
  knee_extension: 'Knie strekken',
  knee_flexion: 'Knie buigen',
  extension_lag: 'Been gestrekt optillen',
  effusion_grade: 'Zwelling',
  quad_strength: 'Kracht voorkant been',
  hamstring_strength: 'Kracht achterkant been',
  hop_single: 'Eén sprong',
  hop_triple: 'Drie sprongen',
  hop_crossover: 'Kruissprong',
  hop_timed_6m: 'Sprong over 6 meter',
  acl_rsi: 'Vertrouwen om te sporten',
};

/** Store the raw sides. The index is computed, never written as its own measurement. */
export async function saveAclReadings(tx: Tx, patientId: string, practiceId: string, measuredOn: string, readings: { key: string; domain: string; unit: string; side: string; value: number; device: string }[]) {
  for (const r of readings) {
    await tx.query(
      `INSERT INTO patient_outcomes(patient_id, practice_id, recorded_by, measured_on, domain, metric, metric_key, value, unit, side, device)
       VALUES ($1,$2,app.uid(),$3,$4,$5,$6,$7,$8,$9,$10)`,
      [patientId, practiceId, measuredOn, r.domain, NAMES[r.key] ?? r.key, r.key, r.value, r.unit, r.side, r.device],
    );
  }
}
