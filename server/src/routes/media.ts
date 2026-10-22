import { Hono, type Context } from 'hono';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { withUser } from '../db';
import { config } from '../config';
import { requireStaff, requireUser, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { audit } from '../lib/audit';
import { badRequest, notFound, HttpError } from '../lib/errors';
import { uuid } from '../lib/crypto';

export const media = new Hono<AppEnv>();

/** Detect type from magic bytes — never trust the client-supplied MIME type. */
export function sniff(buf: Uint8Array): { kind: 'video' | 'image'; mime: string; ext: string } | null {
  const hex = (o: number, n: number) => Buffer.from(buf.subarray(o, o + n)).toString('hex');
  const ascii = (o: number, n: number) => Buffer.from(buf.subarray(o, o + n)).toString('latin1');
  if (hex(0, 3) === 'ffd8ff') return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  if (hex(0, 8) === '89504e470d0a1a0a') return { kind: 'image', mime: 'image/png', ext: 'png' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  if (ascii(4, 4) === 'ftyp') return { kind: 'video', mime: 'video/mp4', ext: 'mp4' };
  if (hex(0, 4) === '1a45dfa3') return { kind: 'video', mime: 'video/webm', ext: 'webm' };
  return null;
}

media.post('/', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const len = Number(c.req.header('content-length') ?? 0);
  if (len > config.maxUploadBytes) throw new HttpError(413, 'file_too_large');
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) throw badRequest('file_required');
  if (file.size > config.maxUploadBytes) throw new HttpError(413, 'file_too_large');
  if (file.size === 0) throw badRequest('file_empty');
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) throw badRequest('unsupported_file_type');
  if (type.kind === 'image' && file.size > 10 * 1024 * 1024) throw new HttpError(413, 'file_too_large');

  const id = uuid();
  const key = `${practiceId}/${id}.${type.ext}`;
  const target = path.join(config.storageDir, key);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, buf, { mode: 0o600 });
  try {
    await withUser(user.id, async (tx) => {
      await tx.query(
        `INSERT INTO media(id, practice_id, kind, mime_type, size_bytes, storage_key, original_name, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,app.uid())`,
        [id, practiceId, type.kind, type.mime, file.size, key, file.name.slice(0, 200)],
      );
      await audit(tx, user.id, practiceId, 'upload', 'media', id, { kind: type.kind, size: file.size });
    });
  } catch (e) {
    await fsp.rm(target, { force: true });
    throw e;
  }
  return c.json({ id, kind: type.kind, mimeType: type.mime }, 201);
});

media.get('/:id', async (c) => {
  const user = requireUser(c);
  const id = parse(uuidParam, c.req.param('id'));
  // RLS decides visibility: global media for any signed-in user, practice media for its members/patients.
  const row = await withUser(user.id, async (tx) => {
    const { rows } = await tx.query('SELECT storage_key, mime_type, size_bytes FROM media WHERE id = $1', [id]);
    return rows[0];
  });
  if (!row) throw notFound();
  return streamFile(c, row.storage_key, row.mime_type, 'private, max-age=3600');
});

/** Stream a stored file with HTTP Range support (needed for video seeking, and by Safari/iOS). */
export async function streamFile(c: Context, storageKey: string, mime: string, cacheControl: string) {
  const file = path.join(config.storageDir, storageKey);
  if (!file.startsWith(config.storageDir + path.sep)) throw notFound();
  let size: number;
  try {
    size = (await fsp.stat(file)).size;
  } catch {
    throw notFound('media_missing');
  }
  c.header('Content-Type', mime);
  c.header('Cache-Control', cacheControl);
  c.header('Accept-Ranges', 'bytes');
  c.header('Content-Disposition', 'inline');
  const range = c.req.header('range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (m && (m[1] || m[2])) {
    let start: number;
    let end: number;
    if (m[1]) {
      start = Number(m[1]);
      // An end beyond the file is clamped (RFC 9110), not rejected.
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    } else {
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    }
    if (start >= size || start > end) {
      c.header('Content-Range', `bytes */${size}`);
      return c.body(null, 416);
    }
    c.header('Content-Range', `bytes ${start}-${end}/${size}`);
    c.header('Content-Length', String(end - start + 1));
    return c.body(Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream, 206);
  }
  c.header('Content-Length', String(size));
  return c.body(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, 200);
}
