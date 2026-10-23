import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { seedDb, type Seed } from './helpers';
import { completeExerciseTexts } from '../db/complete-exercises';
import { EXERCISE_TEXTS } from '../db/seed-data/exercise-texts';

let s: Seed;
const url = () => process.env.DATABASE_OWNER_URL!;
async function q(sql: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: url() });
  await db.connect();
  try {
    return (await db.query(sql, p)).rows;
  } finally {
    await db.end();
  }
}

beforeAll(async () => {
  s = await seedDb();
});

describe('completing the FP library texts', () => {
  it('fills only empty fields and never overwrites what a practice wrote', async () => {
    await q(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region, starting_position_nl, movement_nl)
       VALUES ($1,$2,'kr_db_curl','Dumbbell curl','Dumbbell curl','elbow','',''),
              ($1,$2,'kr_face_pull','Face pull','Face pull','shoulder','Eigen tekst van de praktijk','')`,
      [s.practices.A, s.users.therapistA],
    );
    await completeExerciseTexts(url());
    const [curl] = await q(`SELECT * FROM exercises WHERE source_key = 'kr_db_curl'`);
    expect(curl.starting_position_nl).toBe(EXERCISE_TEXTS.kr_db_curl.start[0]);
    expect(curl.movement_en).toBe(EXERCISE_TEXTS.kr_db_curl.move![1]);
    expect(curl.body_region).toBe('elbow'); // metadata untouched
    expect(curl.review_status).not.toBe('reviewed');
    const [face] = await q(`SELECT * FROM exercises WHERE source_key = 'kr_face_pull'`);
    expect(face.starting_position_nl).toBe('Eigen tekst van de praktijk');
    expect(face.movement_nl).toBe(EXERCISE_TEXTS.kr_face_pull.move![0]);
    // Running again changes nothing.
    expect(await completeExerciseTexts(url())).toBe(0);
  });

  it('every entry has Dutch and English text', () => {
    for (const [k, t] of Object.entries(EXERCISE_TEXTS)) {
      expect(t.start[0].length, k).toBeGreaterThan(10);
      expect(t.start[1].length, k).toBeGreaterThan(10);
      if (t.move) expect(t.move.every((x) => x.length > 10), k).toBe(true);
    }
  });
});

describe('library videos for the practice library (by source key)', () => {
  it('links an available video to practice exercises without replacing an existing one', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { importLibraryVideos } = await import('../db/import-videos');
    const { LIBRARY_VIDEOS } = await import('../db/seed-data/videos');
    const v = LIBRARY_VIDEOS.find((x) => x.sourceKeys?.includes('ex_kniebuiging_muur'))!;
    const dir = await fs.mkdtemp(path.join((await import('node:os')).tmpdir(), 'fpvid-'));
    // The file is already "on disk", so nothing is downloaded (this test needs no network).
    const key = `global/${path.basename(new URL(v.file).pathname)}`;
    await fs.mkdir(path.join(dir, 'global'), { recursive: true });
    await fs.writeFile(path.join(dir, key), Buffer.from('test'));
    const [ex] = await q(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region) VALUES ($1,$2,'ex_kniebuiging_muur','Kniebuiging tegen muur','Knee to wall','ankle_foot') RETURNING id`,
      [s.practices.A, s.users.therapistA],
    );
    const [own] = await q(`INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name) VALUES ($1,'video','video/mp4',4,'p/own.mp4','own.mp4') RETURNING id`, [s.practices.B]);
    const [other] = await q(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region, video_media_id) VALUES ($1,$2,'ex_kniebuiging_muur','Kniebuiging tegen muur','Knee to wall','ankle_foot',$3) RETURNING id`,
      [s.practices.B, s.users.therapistB, own.id],
    );
    const origError = console.error;
    console.error = () => undefined; // the other entries cannot be fetched offline
    try {
      await importLibraryVideos(url(), dir);
    } finally {
      console.error = origError;
    }
    const [a] = await q('SELECT e.video_media_id, m.storage_key FROM exercises e JOIN media m ON m.id = e.video_media_id WHERE e.id = $1', [ex.id]);
    expect(a.storage_key).toBe(key);
    const [b] = await q('SELECT video_media_id FROM exercises WHERE id = $1', [other.id]);
    expect(b.video_media_id).toBe(own.id);
  });
});
