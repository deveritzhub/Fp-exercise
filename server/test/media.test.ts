import { describe, it, expect, beforeAll } from 'vitest';
import { Client, login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

// Minimal valid file headers (synthetic test bytes, not real media).
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(1)]);
const mp4 = () => new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, ...new Array(2000).fill(7)]);
const form = (bytes: Uint8Array, name: string, type: string) => {
  const f = new FormData();
  f.append('file', new File([bytes as unknown as BlobPart], name, { type }));
  return f;
};

describe('private media storage', () => {
  let A: Client;
  let videoId: string;

  it('accepts real image/video signatures and rejects disguised files', async () => {
    A = await login('therapistA');
    const img = await A.req('POST', '/media', form(png(), 'thumb.png', 'image/png'));
    expect(img.status).toBe(201);
    expect(img.body.kind).toBe('image');
    const vid = await A.req('POST', '/media', form(mp4(), 'demo.mp4', 'video/mp4'));
    expect(vid.status).toBe(201);
    videoId = vid.body.id;
    const fake = await A.req('POST', '/media', form(new TextEncoder().encode('<script>alert(1)</script>'), 'x.mp4', 'video/mp4'));
    expect(fake.status).toBe(400);
    expect(fake.body.error).toBe('unsupported_file_type');
  });

  it('serves media to authorised users with range support', async () => {
    const full = await A.get(`/media/${videoId}`);
    expect(full.status).toBe(200);
    expect(full.headers.get('content-type')).toBe('video/mp4');
    expect(full.headers.get('cache-control')).toContain('private');
    const part = await A.get(`/media/${videoId}`, { range: 'bytes=0-99' });
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe('bytes 0-99/2012');
    expect(Number(part.headers.get('content-length'))).toBe(100);
  });

  it('patients of the same practice can stream it (e.g. exercise video)', async () => {
    const pa = await login('patientA');
    expect((await pa.get(`/media/${videoId}`)).status).toBe(200);
  });

  it('other practices, their patients and anonymous users cannot access it', async () => {
    expect((await (await login('therapistB')).get(`/media/${videoId}`)).status).toBe(404);
    expect((await (await login('patientB')).get(`/media/${videoId}`)).status).toBe(404);
    expect((await new Client().get(`/media/${videoId}`)).status).toBe(401);
  });

  it('media can be attached to a custom exercise only with matching kind', async () => {
    const img = await A.req('POST', '/media', form(png(), 't.png', 'image/png'));
    const body = { nameNl: 'Met video', nameEn: 'With video', bodyRegion: 'knee', videoMediaId: videoId, thumbnailMediaId: img.body.id };
    expect((await A.post('/exercises', body)).status).toBe(201);
    expect((await A.post('/exercises', { ...body, videoMediaId: img.body.id })).status).toBe(400);
    const B = await login('ownerB');
    expect((await B.post('/exercises', body)).status).toBe(400); // cannot reference Practice A media
    void s;
  });
});
