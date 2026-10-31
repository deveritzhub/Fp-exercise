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
] as const;

const DIR = path.join(import.meta.dirname, '../../db/seed-data');

export function readFpBundle(file: string): LibraryFile {
  return libraryFileSchema.parse(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
}
