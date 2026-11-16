import { limbSymmetryIndex } from './aclRoute';

/** One test session the therapist types in. Empty sides are skipped. LSI is never typed. */
export type AclSidePair = { left?: number | null; right?: number | null };

export type AclSessionInput = {
  measuredOn: string;
  device?: string;
  strengthUnit?: 'kg' | 'Nm';
  extension?: AclSidePair;
  flexion?: AclSidePair;
  extensionLag?: AclSidePair;
  effusion?: AclSidePair;
  quad?: AclSidePair;
  hamstring?: AclSidePair;
  hopSingle?: AclSidePair;
  hopTriple?: AclSidePair;
  hopCrossover?: AclSidePair;
  hopTimed?: AclSidePair;
  aclRsi?: number | null;
};

export type AclReading = {
  key: string;
  domain: 'rom' | 'strength' | 'function' | 'confidence';
  unit: 'degrees' | 'kg' | 'Nm' | 'grade' | 'seconds' | 'cm' | 'percent';
  side: 'left' | 'right' | 'not_applicable';
  value: number;
  device: string;
};

export type AclIndex = {
  key: string;
  better: 'higher' | 'lower';
  involvedSide: 'left' | 'right';
  involved: number;
  uninvolved: number;
  lsi: number | null;
};

const PAIRS: { field: keyof AclSessionInput; key: string; domain: AclReading['domain']; unit: AclReading['unit']; better: 'higher' | 'lower'; lsi: boolean }[] = [
  { field: 'extension', key: 'knee_extension', domain: 'rom', unit: 'degrees', better: 'lower', lsi: false },
  { field: 'flexion', key: 'knee_flexion', domain: 'rom', unit: 'degrees', better: 'higher', lsi: false },
  { field: 'extensionLag', key: 'extension_lag', domain: 'rom', unit: 'degrees', better: 'lower', lsi: false },
  { field: 'effusion', key: 'effusion_grade', domain: 'function', unit: 'grade', better: 'lower', lsi: false },
  { field: 'quad', key: 'quad_strength', domain: 'strength', unit: 'kg', better: 'higher', lsi: true },
  { field: 'hamstring', key: 'hamstring_strength', domain: 'strength', unit: 'kg', better: 'higher', lsi: true },
  { field: 'hopSingle', key: 'hop_single', domain: 'function', unit: 'cm', better: 'higher', lsi: true },
  { field: 'hopTriple', key: 'hop_triple', domain: 'function', unit: 'cm', better: 'higher', lsi: true },
  { field: 'hopCrossover', key: 'hop_crossover', domain: 'function', unit: 'cm', better: 'higher', lsi: true },
  { field: 'hopTimed', key: 'hop_timed_6m', domain: 'function', unit: 'seconds', better: 'lower', lsi: true },
];

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Readings to store, plus the limb symmetry the server shows. The index itself is not stored. */
export function previewAclSession(input: AclSessionInput, involved: 'left' | 'right') {
  const device = (input.device ?? '').trim().slice(0, 80);
  const strengthUnit = input.strengthUnit === 'Nm' ? 'Nm' : 'kg';
  const readings: AclReading[] = [];
  const indexes: AclIndex[] = [];
  for (const spec of PAIRS) {
    const pair = input[spec.field] as AclSidePair | undefined;
    if (!pair) continue;
    const unit = spec.domain === 'strength' ? strengthUnit : spec.unit;
    for (const side of ['left', 'right'] as const) {
      const value = pair[side];
      if (!finite(value)) continue;
      readings.push({ key: spec.key, domain: spec.domain, unit, side, value, device: spec.domain === 'strength' ? device : '' });
    }
    if (spec.lsi && finite(pair.left) && finite(pair.right)) {
      const other = involved === 'left' ? 'right' : 'left';
      indexes.push({
        key: spec.key,
        better: spec.better,
        involvedSide: involved,
        involved: pair[involved] as number,
        uninvolved: pair[other] as number,
        lsi: limbSymmetryIndex(pair[involved] as number, pair[other] as number, spec.better),
      });
    }
  }
  if (finite(input.aclRsi)) {
    readings.push({ key: 'acl_rsi', domain: 'confidence', unit: 'percent', side: 'not_applicable', value: input.aclRsi, device: '' });
  }
  return { readings, indexes };
}
