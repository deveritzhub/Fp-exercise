import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import { Client } from './helpers';
import { heroAssetFile } from '../src/lib/heroAssets';
import { config } from '../src/config';
import { HERO_AVATAR_FILES, HERO_ITEM_FILES } from '../db/seed-data/hero-assets';

describe('hero art', () => {
  it('has 60 avatars (2 figures × 5 skin groups × 6 builds) and a photo per gear item', () => {
    expect(Object.keys(HERO_AVATAR_FILES)).toHaveLength(60);
    expect(HERO_AVATAR_FILES.m_s3_muscular).toMatch(/\.png$/);
    expect(Object.keys(HERO_ITEM_FILES)).toContain('crutches');
  });
  it('serves only known files from storage, with a long cache', async () => {
    const c = new Client();
    expect((await c.raw('GET', '/hero-assets/avatar/m_s3_muscular')).status).toBe(404); // not synced yet
    expect((await c.raw('GET', '/hero-assets/avatar/..%2F..%2Fetc')).status).toBe(404);
    expect((await c.raw('GET', '/hero-assets/secret/x')).status).toBe(404);
    const file = heroAssetFile(config.storageDir, 'item', 'medal');
    await fs.mkdir(file.replace(/[^/]+$/, ''), { recursive: true });
    await fs.writeFile(file, Buffer.from('89504e470d0a1a0a00', 'hex'));
    const r = await c.raw('GET', '/hero-assets/item/medal');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/png');
    expect(r.headers.get('cache-control')).toContain('max-age');
    await fs.rm(file);
  });
});
