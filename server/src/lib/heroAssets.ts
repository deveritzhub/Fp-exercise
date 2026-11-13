import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HERO_AVATAR_FILES, HERO_AWARD_FILES, HERO_ITEM_FILES, HERO_OUTFIT_FILES, HERO_SHOP_FILES, HERO_WEAR_FILES, heroAssetUrl } from '../../db/seed-data/hero-assets';
import { sniff } from '../routes/media';

export type HeroAssetKind = 'avatar' | 'item' | 'wear' | 'award' | 'shop' | 'outfit';
const LIST: Record<HeroAssetKind, Record<string, string>> = { avatar: HERO_AVATAR_FILES, item: HERO_ITEM_FILES, wear: HERO_WEAR_FILES, award: HERO_AWARD_FILES, shop: HERO_SHOP_FILES, outfit: HERO_OUTFIT_FILES };

export const heroAssetFile = (storageDir: string, kind: HeroAssetKind, key: string) => path.join(storageDir, 'hero-assets', kind, `${key}.png`);
export const isHeroAsset = (kind: string, key: string): kind is HeroAssetKind =>
  (kind === 'avatar' || kind === 'item' || kind === 'wear' || kind === 'award' || kind === 'shop' || kind === 'outfit') &&
  /^[a-z0-9_]{2,40}$/.test(key) && Object.hasOwn(LIST[kind as HeroAssetKind], key);

/**
 * A free/ephemeral host loses images on every restart. Serve a requested, allowlisted photo
 * immediately instead of 404 -> illustrated fallback while the huge background sync catches up.
 * Only fixed, checked asset URLs can be fetched; user-controlled URLs are never accepted.
 */
const loading = new Map<string, Promise<Uint8Array | null>>();
export async function loadHeroAsset(storageDir: string, kind: string, key: string): Promise<Uint8Array | null> {
  if (!isHeroAsset(kind, key)) return null;
  const target = heroAssetFile(storageDir, kind, key);
  const local = await fs.readFile(target).catch(() => null);
  if (local?.length && sniff(local)?.mime === 'image/png') return local;
  // A cancelled download from an older release may have left an invalid file behind.
  if (local?.length) await fs.rm(target, { force: true }).catch(() => {});

  const id = `${kind}/${key}`;
  const inFlight = loading.get(id);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const file = LIST[kind][key];
    let temp: string | undefined;
    try {
      const res = await fetch(heroAssetUrl(file), { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const length = Number(res.headers.get('content-length') ?? 0);
      if (length > 15 * 1024 * 1024) throw new Error('image too large');
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length > 15 * 1024 * 1024 || sniff(buf)?.mime !== 'image/png') throw new Error('invalid image');
      await fs.mkdir(path.dirname(target), { recursive: true });
      // Atomic replacement: never let a concurrent request read a partially downloaded photo.
      temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
      await fs.writeFile(temp, buf, { mode: 0o600 });
      await fs.rename(temp, target);
      return buf;
    } catch (err) {
      console.error(`[hero-assets] ${id}: ${(err as Error).message}`);
      return null;
    } finally {
      if (temp) await fs.rm(temp, { force: true }).catch(() => {});
    }
  })();
  loading.set(id, promise);
  try {
    return await promise;
  } finally {
    loading.delete(id);
  }
}

/** Warm visible avatar photos before optional award and collectible art on ephemeral hosts. */
export async function syncHeroAssets(storageDir: string) {
  let ok = 0;
  for (const kind of ['avatar', 'outfit', 'wear', 'item', 'shop', 'award'] as const) {
    for (const key of Object.keys(LIST[kind])) {
      const file = heroAssetFile(storageDir, kind, key);
      if (await fs.stat(file).then(s => s.size > 0).catch(() => false)) { ok++; continue; }
      if (await loadHeroAsset(storageDir, kind, key)) ok++;
    }
  }
  console.log(`[hero-assets] ${ok} of ${Object.values(LIST).reduce((n, group) => n + Object.keys(group).length, 0)} ready`);
}
