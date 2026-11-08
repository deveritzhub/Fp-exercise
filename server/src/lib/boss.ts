import type { Tx } from '../db';
import { limbSymmetryIndex } from '../../../shared/aclRoute';
import { bossProgress, heirloomTier, type Comparator, type MeasurePoint } from '../../../shared/measurementBoss';

export type GoalRow = {
  id: string;
  program_id: string;
  patient_id: string;
  practice_id: string;
  source: 'outcome' | 'mobility' | 'lsi';
  domain: string | null;
  metric: string | null;
  unit: string;
  side: string;
  test_key: string | null;
  comparator: Comparator;
  target: string | number;
  label_nl: string;
  label_en: string;
  boss_nl: string;
  boss_en: string;
  measure_key: string | null;
  involved_side: 'left' | 'right' | null;
  mode: 'value' | 'lsi' | 'recorded';
  active?: boolean;
  defeated_at: string | null;
  notified_at: string | null;
};

const LSI_RAW: Record<string, { key: string; better: 'higher' | 'lower' }> = {
  lsi_quad: { key: 'quad_strength', better: 'higher' },
  lsi_hamstring: { key: 'hamstring_strength', better: 'higher' },
  lsi_hop_single: { key: 'hop_single', better: 'higher' },
  lsi_hop_triple: { key: 'hop_triple', better: 'higher' },
  lsi_hop_crossover: { key: 'hop_crossover', better: 'higher' },
  lsi_hop_timed: { key: 'hop_timed_6m', better: 'lower' },
};

async function lsiPoints(tx: Tx, patientId: string, g: GoalRow): Promise<MeasurePoint[]> {
  const spec = g.measure_key ? LSI_RAW[g.measure_key] : undefined;
  if (!spec || (g.involved_side !== 'left' && g.involved_side !== 'right')) return [];
  const other = g.involved_side === 'left' ? 'right' : 'left';
  const { rows } = await tx.query(
    `SELECT to_char(measured_on, 'YYYY-MM-DD') AS at, side, unit, value
       FROM patient_outcomes
      WHERE patient_id = $1 AND metric_key = $2 AND side IN ('left', 'right')
      ORDER BY measured_on, created_at`,
    [patientId, spec.key],
  );
  const byDay = new Map<string, Map<string, { side: string; value: number }[]>>();
  for (const r of rows) {
    const day = r.at as string;
    const unit = r.unit as string;
    const bag = byDay.get(day) ?? new Map();
    const list = bag.get(unit) ?? [];
    list.push({ side: r.side as string, value: Number(r.value) });
    bag.set(unit, list);
    byDay.set(day, bag);
  }
  const points: MeasurePoint[] = [];
  for (const [day, units] of byDay) {
    for (const list of units.values()) {
      const involved = [...list].reverse().find((p) => p.side === g.involved_side);
      const uninvolved = [...list].reverse().find((p) => p.side === other);
      if (!involved || !uninvolved) continue;
      const index = limbSymmetryIndex(involved.value, uninvolved.value, spec.better);
      if (index == null) continue;
      points.push({ at: day, value: index });
      break;
    }
  }
  return points;
}

export async function pointsFor(tx: Tx, patientId: string, g: GoalRow): Promise<MeasurePoint[]> {
  if (g.source === 'lsi') return lsiPoints(tx, patientId, g);
  if (g.source === 'outcome') {
    const { rows } = await tx.query(
      `SELECT to_char(measured_on, 'YYYY-MM-DD') AS at, value
         FROM patient_outcomes
        WHERE patient_id = $1
          AND (
            ($2::text IS NOT NULL AND metric_key = $2 AND unit = $3 AND ($4 = 'not_applicable' OR side = $4))
            OR ($2::text IS NULL AND domain = $5 AND unit = $3 AND lower(btrim(metric)) = lower(btrim($6)) AND ($4 = 'not_applicable' OR side = $4))
          )
        ORDER BY measured_on, created_at`,
      [patientId, g.measure_key, g.unit, g.side, g.domain, g.metric],
    );
    return rows.map((r) => ({ at: r.at as string, value: Number(r.value) }));
  }
  const { rows } = await tx.query(
    `SELECT to_char(t.day, 'YYYY-MM-DD') AS at, t.cm AS value
       FROM mobility_tests t
       JOIN mobility_confirmations c ON c.test_id = t.id
      WHERE t.patient_id = $1 AND t.test = $2 AND ($3 = 'none' OR t.side = $3)
      ORDER BY t.day, t.created_at`,
    [patientId, g.test_key, g.side === 'not_applicable' ? 'none' : g.side],
  );
  return rows.map((r) => ({ at: r.at as string, value: Number(r.value) }));
}

async function notifyBoss(tx: Tx, g: GoalRow) {
  const nameNl = g.boss_nl || g.label_nl;
  const nameEn = g.boss_en || g.label_en;
  const therapists = await tx.query(
    `SELECT a.therapist_id, u.locale FROM patient_therapists a JOIN users u ON u.id = a.therapist_id WHERE a.patient_id = $1`,
    [g.patient_id],
  );
  for (const row of therapists.rows) {
    const nl = row.locale !== 'en';
    await tx.query(
      'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        row.therapist_id,
        g.practice_id,
        'boss_met',
        nl ? 'Doel gehaald' : 'Goal met',
        nl
          ? `"${nameNl}" is gehaald. De volgende fase gaat niet vanzelf open. Jij beoordeelt dat.`
          : `"${nameEn}" is met. The next phase does not open by itself. You judge that.`,
        `/app/patienten/${g.patient_id}?tab=programmas`,
      ],
    );
  }
  await tx.query('UPDATE phase_boss_goals SET notified_at = now() WHERE program_id = $1', [g.program_id]);
}

/** Re-read measurements. A boss falls only when every criterion of that phase is met. */
export async function refreshBosses(tx: Tx, patientId: string) {
  const { rows } = await tx.query('SELECT * FROM phase_boss_goals WHERE patient_id = $1 AND active ORDER BY slot', [patientId]);
  const goals = rows as GoalRow[];
  let best = 0;
  let counted = 0;
  const byProgram = new Map<string, { goal: GoalRow; defeated: boolean; was: boolean }[]>();
  for (const g of goals) {
    const progress = bossProgress(await pointsFor(tx, patientId, g), Number(g.target), g.comparator);
    if (progress.baseline != null || progress.defeated) {
      counted++;
      best += progress.bestRatio;
    }
    if (progress.defeated && !g.defeated_at) {
      await tx.query('UPDATE phase_boss_goals SET defeated_at = now() WHERE id = $1 AND defeated_at IS NULL', [g.id]);
    }
    const list = byProgram.get(g.program_id) ?? [];
    list.push({ goal: g, defeated: progress.defeated || !!g.defeated_at, was: !!g.defeated_at });
    byProgram.set(g.program_id, list);
  }
  for (const list of byProgram.values()) {
    const whole = list.every((x) => x.defeated);
    const fresh = list.some((x) => x.defeated && !x.was);
    const quiet = list.every((x) => x.goal.notified_at);
    if (whole && fresh && !quiet) await notifyBoss(tx, list[0].goal);
  }
  const ratio = counted ? best / counted : 0;
  const floors = (await tx.query(
    `SELECT p.phase_no FROM programs p
      WHERE p.patient_id = $1 AND p.series_key = 'acl_vkb_flagship' AND NOT p.is_template
        AND EXISTS (SELECT 1 FROM phase_boss_goals g WHERE g.program_id = p.id AND g.active)
        AND NOT EXISTS (SELECT 1 FROM phase_boss_goals g WHERE g.program_id = p.id AND g.active AND g.defeated_at IS NULL)`,
    [patientId],
  )).rows.map((r) => Number(r.phase_no));
  const floor = floors.includes(5) ? 1 : floors.includes(3) ? 0.25 : 0;
  const hero = await tx.query('SELECT heirloom_best FROM patient_heroes WHERE patient_id = $1', [patientId]);
  const next = Math.max(ratio, floor);
  if (hero.rows[0] && next > Number(hero.rows[0].heirloom_best)) {
    await tx.query('UPDATE patient_heroes SET heirloom_best = $2 WHERE patient_id = $1', [patientId, next]);
  }
}

export async function heirloomView(tx: Tx, patientId: string) {
  await refreshBosses(tx, patientId);
  const row = (await tx.query('SELECT heirloom, heirloom_best FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0];
  if (!row?.heirloom) return null;
  return { kind: row.heirloom as 'weapon' | 'shield' | 'amulet', tier: heirloomTier(Number(row.heirloom_best)) };
}

export type BossLine = {
  labelNl: string;
  labelEn: string;
  unit: string;
  remaining: number | null;
  latest: number | null;
  target: number;
  ratio: number;
  defeated: boolean;
};

export type BossPublic = {
  programId: string;
  labelNl: string;
  labelEn: string;
  unit: string;
  remaining: number | null;
  latest: number | null;
  ratio: number;
  defeated: boolean;
  lines: BossLine[];
};

export async function publicBosses(tx: Tx, patientId: string): Promise<BossPublic[]> {
  const { rows } = await tx.query('SELECT * FROM phase_boss_goals WHERE patient_id = $1 AND active ORDER BY slot', [patientId]);
  const groups = new Map<string, GoalRow[]>();
  for (const g of rows as GoalRow[]) {
    const list = groups.get(g.program_id) ?? [];
    list.push(g);
    groups.set(g.program_id, list);
  }
  const out: BossPublic[] = [];
  for (const list of groups.values()) {
    const lines: BossLine[] = [];
    for (const g of list) {
      const progress = bossProgress(await pointsFor(tx, patientId, g), Number(g.target), g.comparator);
      lines.push({
        labelNl: g.label_nl,
        labelEn: g.label_en,
        unit: g.unit,
        remaining: progress.remaining,
        latest: progress.latest,
        target: Number(g.target),
        ratio: progress.ratio,
        defeated: !!g.defeated_at || progress.defeated,
      });
    }
    if (!lines.length) continue;
    const defeated = lines.every((l) => l.defeated);
    const headline = [...lines].sort((a, b) => Number(a.defeated) - Number(b.defeated) || a.ratio - b.ratio)[0];
    const first = list[0];
    out.push({
      programId: first.program_id,
      labelNl: first.boss_nl || headline.labelNl,
      labelEn: first.boss_en || headline.labelEn,
      unit: headline.unit,
      remaining: defeated ? 0 : headline.remaining,
      latest: headline.latest,
      ratio: Math.min(...lines.map((l) => l.ratio)),
      defeated,
      lines: lines.filter((l) => !l.defeated),
    });
  }
  return out;
}
