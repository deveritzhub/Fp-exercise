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
] as const;

const DIR = path.join(import.meta.dirname, '../../db/seed-data');

export function readFpBundle(file: string): LibraryFile {
  return libraryFileSchema.parse(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
}
