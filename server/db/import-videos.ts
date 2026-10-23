/**
 * Hosted demo: make sure the library demo videos exist in private storage and are linked to their
 * exercises. Runs in the background after start-up; re-downloads files that disappeared (e.g. the
 * free hosting plan has no persistent disk). Only the fixed URLs in seed-data/videos.ts are fetched.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { LIBRARY_VIDEOS } from './seed-data/videos';
import { sniff } from '../src/routes/media';

export async function importLibraryVideos(ownerUrl: string, storageDir: string) {
  const db = new pg.Client({ connectionString: ownerUrl });
  await db.connect();
  let ok = 0;
  try {
    for (const v of LIBRARY_VIDEOS) {
      const key = `global/${path.basename(new URL(v.file).pathname)}`;
      const target = path.join(storageDir, key);
      try {
        // Central exercise by name and/or practice-library exercises (all practices) by source key.
        const ex = await db.query(
          `SELECT id, video_media_id FROM exercises
            WHERE archived_at IS NULL AND ((practice_id IS NULL AND name_nl = $1) OR (source_key = ANY($2::text[])))`,
          [v.exercise ?? null, v.sourceKeys ?? []],
        );
        if (!ex.rows.length) continue;
        const onDisk = await fs.stat(target).then((s) => s.size).catch(() => 0);
        let size = onDisk;
        if (!onDisk) {
          const res = await fetch(v.file);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = new Uint8Array(await res.arrayBuffer());
          if (sniff(buf)?.kind !== 'video') throw new Error('not a video');
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, buf, { mode: 0o600 });
          size = buf.byteLength;
        }
        const m = await db.query(
          `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
           VALUES (NULL, 'video', 'video/mp4', $1, $2, $3)
           ON CONFLICT (storage_key) DO UPDATE SET size_bytes = EXCLUDED.size_bytes RETURNING id`,
          [size, key, `${v.exercise ?? v.sourceKeys?.[0]}.mp4`],
        );
        for (const row of ex.rows) {
          // Never replace a video that is already linked.
          if (!row.video_media_id) await db.query('UPDATE exercises SET video_media_id = $2 WHERE id = $1', [row.id, m.rows[0].id]);
        }
        ok++;
      } catch (e) {
        console.error(`[videos] ${v.exercise}: ${(e as Error).message}`);
      }
    }
  } finally {
    await db.end();
  }
  console.log(`[videos] ${ok}/${LIBRARY_VIDEOS.length} library videos available`);
}
