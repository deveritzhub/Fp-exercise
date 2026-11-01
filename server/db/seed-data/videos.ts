/**
 * Clinically approved demonstration videos for central-library exercises
 * (dynamic Grok remakes, 2026-11-01). The files live next to this module and
 * are copied into private storage on start-up. See docs/VIDEOS.md.
 *
 * The October 2026 Higgsfield clips are not the live source. The three Seedance clips below are.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIBRARY_VIDEO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'library-videos');

const HF = 'https://d8j0ntlcm91z4.cloudfront.net/user_3Fqm6YLMCboRqZzqeVY5m3hJkxK/';

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

/**
 * Seedance 2.0 via Higgsfield (2026-11-01), approved by the practice owner. They belong to
 * practice-library exercises (by source key), so they are linked after the library import.
 * Fetched once on the server; the CDN is reachable from the host.
 */
export const SEEDANCE_VIDEOS: LibraryVideo[] = [
  { sourceKeys: ['kr_bodyweight_squat'], file: `${HF}hf_20261101_100113_66bb90c8-b419-40c3-bca9-f798ef61c7ec.mp4` },
  { sourceKeys: ['kr_forward_lunge'], file: `${HF}hf_20261101_115959_070fb383-fc07-42e3-bfc4-cfebe8547e4b.mp4` },
  { sourceKeys: ['kr_conventional_deadlift'], file: `${HF}hf_20261101_120000_397d6443-cce6-4150-a60d-9a89e6176ac1.mp4` },
  // Glute series with the female model (2026-11-01).
  { sourceKeys: ['kr_hip_thrust'], file: `${HF}hf_20261101_142129_57d3a262-a377-429b-9dab-754cde3f56bc.mp4` },
  { sourceKeys: ['ex_split_squat_bulgarian'], file: `${HF}hf_20261101_142129_fb7e7bb7-6d36-4f2a-ad4a-4a896680e64d.mp4` },
  { sourceKeys: ['kr_rdl'], file: `${HF}hf_20261101_142129_79dd7a85-01db-4ddf-b3c8-8fdf1e5477b4.mp4` },
  { exercise: 'Eenbenige bekkenbrug', file: `${HF}hf_20261101_142129_07f5fd32-cc06-445c-b019-d3bb21a769a8.mp4` },
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
