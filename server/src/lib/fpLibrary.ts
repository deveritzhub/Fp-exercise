import fs from 'node:fs';
import path from 'node:path';
import { libraryFileSchema, type LibraryFile } from './libraryImport';

/**
 * The Functional Performance library bundles shipped with the app: exercises plus phased templates
 * for revalidatie, krachttraining and mobiliteit. Used by the demo seed and by any practice that
 * adds the FP library itself (Praktijk → Bibliotheek).
 */
export const FP_BUNDLES = [
  { name: 'fp-library-v1', file: 'fp-library.json' },
  // Revalidatie (incl. criteria for shoulder/neck/low back), krachttraining and mobiliteit, with phases.
  { name: 'fp-app-update-v1', file: 'fp-app-update.json' },
  // Only guideline-backed frameworks: vestibular, MS, ankle dorsiflexion (measurement moments, no thresholds).
  { name: 'fp-uitbreiding-v2', file: 'fp-uitbreiding-v2.json' },
  // Bodyweight squat and forward lunge, so the 2026-11-01 Seedance demo videos have their exercise.
  { name: 'fp-videos-v1', file: 'fp-videos-v1.json' },
  // Seven extra mobility programmes patients can start themselves (existing exercises only).
  { name: 'fp-mobiliteit-v2', file: 'fp-mobiliteit-v2.json' },
  // Four strength programmes to start yourself (beginner 2x/3x, at home, glutes) plus the push-up.
  { name: 'fp-kracht-v2', file: 'fp-kracht-v2.json' },
  // Twenty more strength exercises for the strength log and own routines.
  { name: 'fp-kracht-v3', file: 'fp-kracht-v3.json' },
  // The backward lunge, so the lunge demo video (which steps backwards) has the right exercise.
  { name: 'fp-kracht-v4', file: 'fp-kracht-v4.json' },
  // Radial and femoral nerve sliders, so every nerve in the muscle atlas has an exercise.
  { name: 'fp-neuro-v1', file: 'fp-neuro-v1.json' },
  // Tibial, fibular, musculocutaneous and obturator sliders: every nerve with a common slider has one.
  { name: 'fp-neuro-v2', file: 'fp-neuro-v2.json' },
  // Exercises the complaint guide needs for chains and compensations (glute medius without TFL, etc.).
  { name: 'fp-ketens-v1', file: 'fp-ketens-v1.json' },
  // Stretches for what takes over (TFL, upper trapezius), so the guide's offload block is filled.
  { name: 'fp-ketens-v2', file: 'fp-ketens-v2.json' },
  // Hand: thumb opposition and grip, so carpal tunnel complaints have a strengthening exercise.
  { name: 'fp-ketens-v3', file: 'fp-ketens-v3.json' },
  // Hand and elbow in daily life: functional work for tennis elbow and carpal tunnel complaints.
  { name: 'fp-ketens-v4', file: 'fp-ketens-v4.json' },
] as const;

const DIR = path.join(import.meta.dirname, '../../db/seed-data');

export function readFpBundle(file: string): LibraryFile {
  return libraryFileSchema.parse(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
}

export type ReviewExercise = { id: string; name: string; instruction: string; dose: string; rule: string; status: string; bundle: string };

/**
 * Exercises whose dose is a convention, not yet checked per exercise ("niet individueel getoetst"),
 * for the clinical review page. Read from the shipped bundle files (texts only, no patient data).
 */
export function exercisesToReview(): ReviewExercise[] {
  const out = new Map<string, ReviewExercise>();
  const doseText = (d: Record<string, unknown> | string | undefined) => {
    if (!d) return '';
    if (typeof d === 'string') return d;
    const parts = [d.sets && d.reps ? `${d.sets} × ${d.reps}` : d.sets ? `${d.sets} sets` : '', d.hold_sec ? `${d.hold_sec} s vasthouden` : '', d.intensiteit ? String(d.intensiteit) : ''];
    return parts.filter(Boolean).join(' · ');
  };
  const walk = (node: unknown, bundle: string) => {
    if (Array.isArray(node)) return node.forEach((x) => walk(x, bundle));
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    if (typeof o.dosis_status === 'string' && typeof o.naam === 'string' && typeof o.id === 'string' && /niet individueel getoetst/.test(o.dosis_status) && !out.has(o.id)) {
      out.set(o.id, { id: o.id, name: o.naam, instruction: String(o.instructie ?? ''), dose: doseText(o.dosering as Record<string, unknown> | string | undefined), rule: String(o.symptoomregel ?? ''), status: o.dosis_status, bundle });
    }
    for (const v of Object.values(o)) walk(v, bundle);
  };
  for (const b of FP_BUNDLES) walk(JSON.parse(fs.readFileSync(path.join(DIR, b.file), 'utf8')), b.name);
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
}
