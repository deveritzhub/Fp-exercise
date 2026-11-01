import fs from 'node:fs/promises';
import path from 'node:path';
import { HERO_AVATAR_FILES, HERO_AWARD_FILES, HERO_ITEM_FILES, HERO_SHOP_FILES, HERO_WEAR_FILES, heroAssetUrl } from '../../db/seed-data/hero-assets';
import { sniff } from '../routes/media';

export type HeroAssetKind = 'avatar' | 'item' | 'wear' | 'award' | 'shop';
const LIST: Record<HeroAssetKind, Record<string, string>> = { avatar: HERO_AVATAR_FILES, item: HERO_ITEM_FILES, wear: HERO_WEAR_FILES, award: HERO_AWARD_FILES, shop: HERO_SHOP_FILES };

export const heroAssetFile = (storageDir: string, kind: HeroAssetKind, key: string) => path.join(storageDir, 'hero-assets', kind, `${key}.png`);
export const isHeroAsset = (kind: string, key: string): kind is HeroAssetKind => (kind === 'avatar' || kind === 'item' || kind === 'wear' || kind === 'award' || kind === 'shop') && /^[a-z0-9_]{2,40}$/.test(key) && !!LIST[kind as HeroAssetKind][key];

/**
 * Copies the generated hero art into private storage (once; again when the free host lost its disk).
 * Runs in the background after start-up. Only the fixed URLs in seed-data/hero-assets.ts are fetched,
 * and only real PNG images are kept.
 */
export async function syncHeroAssets(storageDir: string) {
  let ok = 0;
  for (const kind of ['shop', 'award', 'item', 'wear', 'avatar'] as const) {
    for (const [key, file] of Object.entries(LIST[kind])) {
      const target = heroAssetFile(storageDir, kind, key);
      if (await fs.stat(target).then((s) => s.size > 0).catch(() => false)) {
        ok++;
        continue;
      }
      try {
        const res = await fetch(heroAssetUrl(file));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        if (sniff(buf)?.mime !== 'image/png') throw new Error('not a png');
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, buf, { mode: 0o600 });
        ok++;
      } catch (e) {
        console.error(`[hero-assets] ${kind}/${key}: ${(e as Error).message}`);
      }
    }
  }
  console.log(`[hero-assets] ${ok} of ${Object.keys(HERO_AVATAR_FILES).length + Object.keys(HERO_ITEM_FILES).length + Object.keys(HERO_WEAR_FILES).length + Object.keys(HERO_AWARD_FILES).length + Object.keys(HERO_SHOP_FILES).length} ready`);
}
