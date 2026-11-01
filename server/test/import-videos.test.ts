import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { seedDb, type Seed } from './helpers';
import { EXERCISES } from '../db/seed-data/exercises';
import { LIBRARY_VIDEOS, SEEDANCE_VIDEOS, resolveLibraryVideo } from '../db/seed-data/videos';
import { readFpBundle } from '../src/lib/fpLibrary';
import { sniff } from '../src/routes/media';

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

/** Minimal buffer sniff() accepts as video/mp4 (ftyp at offset 4). */
function fakeMp4(payload: string) {
  return Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypisom'), Buffer.from(payload)]);
}

describe('Seedance demo videos', () => {
  it('each belongs to an exercise in a library bundle and resolves to a CDN mp4', () => {
    const keys = new Set<string>();
    for (const f of ['fp-library.json', 'fp-app-update.json', 'fp-videos-v1.json']) {
      const b = readFpBundle(f) as { oefeningen?: { id: string }[]; seed_data?: { revalidatie?: { oefeningen: { id: string }[] }; krachttraining?: { oefeningen: { id: string }[] } } };
      for (const e of [...(b.oefeningen ?? []), ...(b.seed_data?.revalidatie?.oefeningen ?? []), ...(b.seed_data?.krachttraining?.oefeningen ?? [])]) keys.add(e.id);
    }
    const central = new Set(EXERCISES.map((e) => e.nl));
    expect(SEEDANCE_VIDEOS.flatMap((v) => v.sourceKeys ?? [v.exercise])).toEqual([
      'kr_bodyweight_squat', 'kr_forward_lunge', 'kr_conventional_deadlift', 'kr_hip_thrust', 'ex_split_squat_bulgarian', 'kr_rdl', 'Eenbenige bekkenbrug',
    ]);
    for (const v of SEEDANCE_VIDEOS) {
      for (const k of v.sourceKeys ?? []) expect(keys.has(k), k).toBe(true);
      if (v.exercise) expect(central.has(v.exercise), v.exercise).toBe(true);
      const src = resolveLibraryVideo(v.file);
      expect(src.url?.startsWith('https://d8j0ntlcm91z4.cloudfront.net/')).toBe(true);
      expect(src.storageName).toMatch(/^hf_20261101_\d{6}_[0-9a-f-]{36}\.mp4$/);
    }
  });
});

describe('approved library video seed files', () => {
  it('points each central exercise at a local mp4 in the repo', async () => {
    const names = new Set(EXERCISES.map((e) => e.nl));
    expect(LIBRARY_VIDEOS.map((v) => v.exercise)).toEqual([
      'Bekkenbrug',
      'Kinintrekking',
      'Kat-koe',
      'Viervoetsstand diagonaal (bird dog)',
      'Dead bug',
      'Zijplank op knieën',
      'Schelp met weerstandsband',
      'Heupabductie in zijlig',
      'Squat naar stoel',
      'Muurzit',
      'Hielheffen staand',
      'Eenbeensstand',
      'Opstappen',
    ]);
    expect(LIBRARY_VIDEOS.map((v) => v.file)).toEqual([
      'bekkenbrug.mp4',
      'kinintrekking.mp4',
      'kat-koe.mp4',
      'bird-dog.mp4',
      'deadbug.mp4',
      'zijplank.mp4',
      'schelp.mp4',
      'heupabductie.mp4',
      'squat-stoel.mp4',
      'muurzit.mp4',
      'hielheffen.mp4',
      'eenbeensstand.mp4',
      'opstappen.mp4',
    ]);
    for (const v of LIBRARY_VIDEOS) {
      expect(v.file.startsWith('http'), v.file).toBe(false);
      expect(names.has(v.exercise!), v.exercise).toBe(true);
      const src = resolveLibraryVideo(v.file);
      expect(src.url).toBeUndefined();
      expect(src.localPath).toBe(path.join(path.dirname(new URL(import.meta.url).pathname), '../db/seed-data/library-videos', v.file));
      const fh = await fs.open(src.localPath!, 'r');
      const buf = Buffer.alloc(16);
      try {
        await fh.read(buf, 0, 16, 0);
      } finally {
        await fh.close();
      }
      expect(sniff(new Uint8Array(buf))?.kind, v.file).toBe('video');
      expect((await fs.stat(src.localPath!)).size, v.file).toBeGreaterThan(1000);
    }
    expect(() => resolveLibraryVideo('../secret.mp4')).toThrow(/escapes/);
  });
});

describe('importing library videos', () => {
  let s: Seed;
  beforeAll(async () => {
    s = await seedDb();
  });

  it('copies local seed files over an existing link and refreshes the bytes when the seed changes', async () => {
    const { importLibraryVideos } = await import('../db/import-videos');
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fpvid-'));
    const storage = path.join(dir, 'storage');
    const seed = path.join(dir, 'clips', 'local-demo.mp4');
    await fs.mkdir(path.dirname(seed), { recursive: true });
    const v1 = fakeMp4('approved-v1');
    await fs.writeFile(seed, v1);
    const [old] = await q(
      `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
       VALUES (NULL,'video','video/mp4',4,'global/old-rejected-local.mp4','old.mp4') RETURNING id`,
    );
    const [central] = await q(
      `INSERT INTO exercises(practice_id, name_nl, name_en, body_region, video_media_id)
       VALUES (NULL,'Lokale seed demo','Local seed demo','hip',$1) RETURNING id`,
      [old.id],
    );
    const [practice] = await q(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region, video_media_id)
       VALUES ($1,$2,'ex_local_seed_demo','Lokale seed demo','Local seed demo','hip',$3) RETURNING id`,
      [s.practices.A, s.users.therapistA, old.id],
    );
    const entry = { exercise: 'Lokale seed demo', sourceKeys: ['ex_local_seed_demo'], file: seed };
    await importLibraryVideos(url(), storage, [entry]);

    const stored = path.join(storage, 'global', 'local-demo.mp4');
    expect(Buffer.compare(await fs.readFile(stored), v1)).toBe(0);
    const [c1] = await q('SELECT video_media_id FROM exercises WHERE id = $1', [central.id]);
    const [p1] = await q('SELECT video_media_id FROM exercises WHERE id = $1', [practice.id]);
    expect(c1.video_media_id).toBe(p1.video_media_id);
    expect(c1.video_media_id).not.toBe(old.id);

    const v2 = fakeMp4('approved-v2-changed');
    await fs.writeFile(seed, v2);
    await importLibraryVideos(url(), storage, [entry]);
    expect(Buffer.compare(await fs.readFile(stored), v2)).toBe(0);
    const [c2] = await q(
      'SELECT m.id, m.size_bytes FROM exercises e JOIN media m ON m.id = e.video_media_id WHERE e.id = $1',
      [central.id],
    );
    expect(c2.id).toBe(c1.video_media_id);
    expect(Number(c2.size_bytes)).toBe(v2.length);
  });

  it('links the 13 approved clips onto the central exercises, replacing a previous video', async () => {
    const { importLibraryVideos } = await import('../db/import-videos');
    const [old] = await q(
      `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
       VALUES (NULL,'video','video/mp4',4,'global/old-rejected-bekkenbrug.mp4','old.mp4') RETURNING id`,
    );
    await q(`UPDATE exercises SET video_media_id = $1 WHERE practice_id IS NULL AND name_nl = 'Bekkenbrug'`, [old.id]);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fpvid-'));
    await importLibraryVideos(url(), dir);

    const names = LIBRARY_VIDEOS.map((v) => v.exercise);
    const rows = await q(
      `SELECT e.name_nl, m.storage_key, m.size_bytes, e.video_media_id
         FROM exercises e JOIN media m ON m.id = e.video_media_id
        WHERE e.practice_id IS NULL AND e.name_nl = ANY($1::text[])`,
      [names],
    );
    expect(rows).toHaveLength(13);
    const byName = new Map(rows.map((r) => [r.name_nl, r]));
    for (const v of LIBRARY_VIDEOS) {
      const row = byName.get(v.exercise);
      expect(row?.storage_key, v.exercise).toBe(`global/${v.file}`);
      const seed = await fs.readFile(resolveLibraryVideo(v.file).localPath!);
      const onDisk = await fs.readFile(path.join(dir, 'global', v.file));
      expect(Buffer.compare(onDisk, seed), v.file).toBe(0);
      expect(Number(row.size_bytes), v.file).toBe(seed.length);
    }
    expect(byName.get('Bekkenbrug').video_media_id).not.toBe(old.id);
  });

  it('refreshes a practice copy that still points at a global clip and keeps a practice-owned file', async () => {
    const { linkSharedVideos } = await import('../src/lib/libraryImport');
    const [globalOld] = await q(
      `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
       VALUES (NULL,'video','video/mp4',4,'global/old-shared-bridge.mp4','old.mp4') RETURNING id`,
    );
    const [globalNew] = await q(
      `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
       VALUES (NULL,'video','video/mp4',8,'global/new-shared-bridge.mp4','new.mp4') RETURNING id`,
    );
    const [own] = await q(
      `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
       VALUES ($1,'video','video/mp4',4,'p/own-bridge.mp4','own.mp4') RETURNING id`,
      [s.practices.B],
    );
    await q(`UPDATE exercises SET video_media_id = $1 WHERE practice_id IS NULL AND name_nl = 'Bekkenbrug'`, [globalNew.id]);
    const [chinMedia] = await q(
      `INSERT INTO media(practice_id, kind, mime_type, size_bytes, storage_key, original_name)
       VALUES (NULL,'video','video/mp4',4,'global/new-shared-chin.mp4','chin.mp4') RETURNING id`,
    );
    await q(`UPDATE exercises SET video_media_id = $1 WHERE practice_id IS NULL AND name_nl = 'Kinintrekking'`, [chinMedia.id]);
    const [stuck] = await q(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region, video_media_id)
       VALUES ($1,$2,'ex_glute_bridge','Bilbrug','Glute bridge','hip',$3) RETURNING id`,
      [s.practices.A, s.users.therapistA, globalOld.id],
    );
    const [custom] = await q(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region, video_media_id)
       VALUES ($1,$2,'ex_glute_bridge','Bilbrug','Glute bridge','hip',$3) RETURNING id`,
      [s.practices.B, s.users.therapistB, own.id],
    );
    const [missing] = await q(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region)
       VALUES ($1,$2,'ex_chin_tuck','Kin intrekken','Chin tuck','cervical_spine') RETURNING id`,
      [s.practices.A, s.users.therapistA],
    );
    const db = new pg.Client({ connectionString: url() });
    await db.connect();
    try {
      expect(await linkSharedVideos(db)).toBe(2);
    } finally {
      await db.end();
    }
    const [stuckRow] = await q('SELECT video_media_id FROM exercises WHERE id = $1', [stuck.id]);
    const [customRow] = await q('SELECT video_media_id FROM exercises WHERE id = $1', [custom.id]);
    const [missingRow] = await q('SELECT video_media_id FROM exercises WHERE id = $1', [missing.id]);
    expect(stuckRow.video_media_id).toBe(globalNew.id);
    expect(customRow.video_media_id).toBe(own.id);
    expect(missingRow.video_media_id).toBe(chinMedia.id);
  });
});
