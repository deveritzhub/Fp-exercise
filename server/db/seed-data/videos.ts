/**
 * Clinically approved demonstration videos for central-library exercises
 * (dynamic Grok remakes, 2026-11-01). The files live next to this module and
 * are copied into private storage on start-up. See docs/VIDEOS.md.
 *
 * The old Higgsfield CloudFront URLs are not the live source.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIBRARY_VIDEO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'library-videos');

export type LibraryVideo = { exercise?: string; sourceKeys?: string[]; file: string };

export const LIBRARY_VIDEOS: LibraryVideo[] = [
  { exercise: 'Bekkenbrug', file: 'bekkenbrug.mp4' },
  { exercise: 'Kinintrekking', file: 'kinintrekking.mp4' },
  { exercise: 'Kat-koe', file: 'kat-koe.mp4' },
  { exercise: 'Viervoetsstand diagonaal (bird dog)', file: 'bird-dog.mp4' },
  { exercise: 'Dead bug', file: 'deadbug.mp4' },
  { exercise: 'Zijplank op knieën', file: 'zijplank.mp4' },
  { exercise: 'Schelp met weerstandsband', file: 'schelp.mp4' },
  { exercise: 'Heupabductie in zijlig', file: 'heupabductie.mp4' },
  { exercise: 'Squat naar stoel', file: 'squat-stoel.mp4' },
  { exercise: 'Muurzit', file: 'muurzit.mp4' },
  { exercise: 'Hielheffen staand', file: 'hielheffen.mp4' },
  { exercise: 'Eenbeensstand', file: 'eenbeensstand.mp4' },
  { exercise: 'Opstappen', file: 'opstappen.mp4' },
];

/** Resolve a library video `file` to a local seed path or a remote URL. */
export function resolveLibraryVideo(file: string): { storageName: string; localPath?: string; url?: string } {
  if (/^https?:\/\//i.test(file)) {
    const storageName = path.posix.basename(new URL(file).pathname);
    if (!storageName || storageName === '.' || storageName === '..') throw new Error('video url has no file name');
    return { storageName, url: file };
  }
  if (file.includes('\0')) throw new Error('invalid video path');
  const localPath = path.isAbsolute(file) ? path.resolve(file) : path.resolve(LIBRARY_VIDEO_DIR, file);
  if (!path.isAbsolute(file)) {
    const rel = path.relative(LIBRARY_VIDEO_DIR, localPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('video path escapes the seed directory');
  }
  const storageName = path.basename(localPath);
  if (!storageName || storageName === '.' || storageName === '..') throw new Error('video path has no file name');
  return { storageName, localPath };
}
