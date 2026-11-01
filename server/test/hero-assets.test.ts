import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import { Client } from './helpers';
import { heroAssetFile } from '../src/lib/heroAssets';
import { config } from '../src/config';
import { HERO_AVATAR_FILES, HERO_AWARD_FILES, HERO_ITEM_FILES, HERO_SHOP_FILES } from '../db/seed-data/hero-assets';
import { BADGES, GEAR, HAIR_PRESETS, HAIR_PRESET_KEYS, SKILLS, SKIN_GROUPS, TROPHY_TIERS, heroPhotoKey } from '../../shared/hero';

describe('hero art', () => {
  it('has 240 avatars (2 figures × 5 skin groups × 6 builds × 4 hairstyles) and a photo per gear item', () => {
    expect(Object.keys(HERO_AVATAR_FILES).filter((k) => !k.startsWith('custom_'))).toHaveLength(240);
    expect(HERO_AVATAR_FILES.m_s3_muscular).toMatch(/\.png$/);
    expect(Object.keys(HERO_ITEM_FILES)).toContain('crutches');
  });
  it('has art for every trophy (skill × tier) and every badge', () => {
    for (const s of SKILLS) for (const t of TROPHY_TIERS) expect(HERO_AWARD_FILES[`${s.key}_${t.level}`], `${s.key}_${t.level}`).toMatch(/\.png$/);
    for (const b of BADGES) expect(HERO_AWARD_FILES[`badge_${b.key}`], b.key).toMatch(/\.png$/);
  });
  it('has a shop icon for every item in the shop', () => {
    for (const g of GEAR) expect(HERO_SHOP_FILES[g.key], g.key).toMatch(/^hf_\d{8}_\d{6}_[0-9a-f-]{36}\.png$/);
    expect(new Set(Object.values(HERO_SHOP_FILES)).size).toBe(Object.keys(HERO_SHOP_FILES).length);
  });
  it('has a photo for every figure, skin tone, body type and hairstyle the app can pick', () => {
    const files = new Set(Object.values(HERO_AVATAR_FILES));
    expect(files.size).toBe(Object.keys(HERO_AVATAR_FILES).length); // no file used twice
    for (const frame of ['f', 'm'] as const)
      for (const skin of SKIN_GROUPS)
        for (const kind of ['lean', 'athletic', 'muscular', 'average', 'soft', 'full'] as const)
          for (const h of HAIR_PRESET_KEYS) {
            const p = HAIR_PRESETS[frame][h];
            const key = heroPhotoKey({ frame, skin, hair: p.hair, beard: p.beard }, { kind });
            expect(HERO_AVATAR_FILES[key], key).toMatch(/^hf_20261101_\d{6}_[0-9a-f-]{36}\.png$/);
          }
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

describe('personal hero photo', () => {
  it('only the configured account gets its own photo', async () => {
    const { login, seedDb } = await import('./helpers');
    const { DEMO_USERS } = await import('../db/seed');
    await seedDb();
    config.personalHeroPhotos.set(DEMO_USERS.patientA.email, 'custom_1');
    try {
      expect(HERO_AVATAR_FILES.custom_1).toMatch(/\.png$/);
      expect((await (await login('patientA')).get('/patient/hero')).body.customPhoto).toBe('custom_1');
      expect((await (await login('patientB')).get('/patient/hero')).body.customPhoto).toBeNull();
    } finally {
      config.personalHeroPhotos.clear();
    }
  });
});

describe('guest hero', () => {
  it('patients may play as an offered guest hero, and only those', async () => {
    const { login, seedDb } = await import('./helpers');
    await seedDb();
    config.heroGuests.set('custom_1', 'Dinish');
    try {
      const p = await login('patientA');
      const look = { heroName: 'Emma', frame: 'f', build: 'average', skin: 's3', hair: 'long', hairColor: 'darkbrown', eyeColor: 'brown', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' };
      expect((await p.put('/patient/hero', { ...look, photoKey: 'custom_9' })).body.error).toBe('unknown_guest_hero');
      expect((await p.put('/patient/hero', { ...look, photoKey: 'custom_1' })).status).toBe(200);
      let st = (await p.get('/patient/hero')).body;
      expect(st.heroGuests).toEqual([{ key: 'custom_1', name: 'Dinish' }]);
      expect(st.hero.photoKey).toBe('custom_1');
      expect(st.customPhoto).toBe('custom_1');
      // Back to the own hero.
      await p.put('/patient/hero', { ...look, photoKey: null });
      st = (await p.get('/patient/hero')).body;
      expect(st.customPhoto).toBeNull();
      // When the guest is withdrawn from the configuration, the photo disappears too.
      await p.put('/patient/hero', { ...look, photoKey: 'custom_1' });
      config.heroGuests.clear();
      expect((await p.get('/patient/hero')).body.customPhoto).toBeNull();
    } finally {
      config.heroGuests.clear();
    }
  });
});
