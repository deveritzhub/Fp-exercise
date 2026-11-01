/**
 * Hosted demo: copy the clinically approved library videos into private storage and link them
 * to their exercises. Runs in the background after start-up. Local seed files are the live
 * source, so a host with an ephemeral disk can refill storage from the deploy artifact without
 * a CDN. When a seed file changes, the storage file is overwritten and media is upserted.
 *
 * Matching exercises always get `video_media_id` set to that media row: the central exercise
 * by Dutch name, and practice copies by source key. An older clip that is already linked is
 * replaced. A practice's own "Video van je praktijk" on a central exercise lives in
 * exercise_media_overrides and is left alone.
 *
 * Remote URLs are only a fallback and are fetched when the file is missing.
 */
import crypto from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { LIBRARY_VIDEOS, resolveLibraryVideo, type LibraryVideo } from './seed-data/videos';
import { sniff } from '../src/routes/media';

function sha256(file: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(file);
    stream.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') resolve(null);
      else reject(err);
    });
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function readHeader(file: string): Promise<{ size: number; header: Uint8Array }> {
  const fh = await fs.open(file, 'r');
  try {
    const st = await fh.stat();
    const buf = Buffer.alloc(32);
    await fh.read(buf, 0, Math.min(32, st.size), 0);
    return { size: Number(st.size), header: new Uint8Array(buf) };
  } finally {
    await fh.close();
  }
}

/** Copy a local seed file into storage when the bytes differ. Returns the file size. */
async function placeLocal(localPath: string, target: string): Promise<number> {
  const { size, header } = await readHeader(localPath);
  if (sniff(header)?.kind !== 'video') throw new Error('not a video');
  const [srcHash, dstHash] = await Promise.all([sha256(localPath), sha256(target)]);
  if (!srcHash) throw new Error('seed video disappeared');
  if (srcHash !== dstHash) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(localPath, target);
    await fs.chmod(target, 0o600);
  }
  return size;
}

/** Download a remote video when it is not already in storage. Returns the file size. */
async function placeRemote(url: string, target: string): Promise<number> {
  const onDisk = await fs.stat(target).then((s) => s.size).catch(() => 0);
  if (onDisk) return onDisk;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (sniff(buf)?.kind !== 'video') throw new Error('not a video');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buf, { mode: 0o600 });
  return buf.byteLength;
}

export async function importLibraryVideos(ownerUrl: string, storageDir: string, videos: readonly LibraryVideo[] = LIBRARY_VIDEOS) {
  const db = new pg.Client({ connectionString: ownerUrl });
  await db.connect();
  let ok = 0;
  try {
    for (const v of videos) {
      try {
        // Central exercise by name and/or practice-library exercises (all practices) by source key.
        const ex = await db.query(
          `SELECT id FROM exercises
            WHERE archived_at IS NULL AND ((practice_id IS NULL AND name_nl = $1) OR (source_key = ANY($2::text[])))`,
          [v.exercise ?? null, v.sourceKeys ?? []],
        );
        if (!ex.rows.length) continue;
        const src = resolveLibraryVideo(v.file);
        const key = `global/${src.storageName}`;
        const target = path.join(storageDir, key);
        const size = src.localPath ? await placeLocal(src.localPath, target) : await placeRemote(src.url!, target);
        const m = await db.query(
          `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
           VALUES (NULL, 'video', 'video/mp4', $1, $2, $3)
           ON CONFLICT (storage_key) DO UPDATE SET size_bytes = EXCLUDED.size_bytes RETURNING id`,
          [size, key, `${v.exercise ?? v.sourceKeys?.[0]}.mp4`],
        );
        await db.query('UPDATE exercises SET video_media_id = $2 WHERE id = ANY($1::uuid[])', [ex.rows.map((r) => r.id), m.rows[0].id]);
        ok++;
      } catch (e) {
        console.error(`[videos] ${v.exercise ?? v.sourceKeys?.[0]}: ${(e as Error).message}`);
      }
    }
  } finally {
    await db.end();
  }
  console.log(`[videos] ${ok}/${videos.length} library videos available`);
}
