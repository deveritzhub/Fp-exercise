import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { COLLECTION_GEAR, COLLECTION_ITEM_KEYS, COLLECTION_OUTFIT_KEYS, GEAR_COLLECTIONS } from '@shared/gearCollections';
import { GEAR, GEAR_SLOT, GEAR_TIERS, gearScore, onePerSlot } from '@shared/hero';
import { HeroPhoto, heroPhotoSources } from './HeroPhoto';
import { HumanFigure } from './HumanFigure';
import { GearArtwork } from './RpgGear';

const hero = {
  skin: 's5', hair: 'short', outfit: 'forest', hairColor: 'darkbrown',
  frame: 'm' as const, build: 'athletic' as const,
};

describe('new tier collections and original 2D item art', () => {
  it('has five distinct themed collections and unique slot-valid items', () => {
    expect(GEAR_COLLECTIONS.map(c => c.tier)).toEqual([1, 2, 3, 4, 5]);
    expect(GEAR_COLLECTIONS).toHaveLength(5);
    expect(COLLECTION_GEAR).toHaveLength(22);
    expect(new Set(COLLECTION_GEAR.map(i => i.key)).size).toBe(22);
    expect(COLLECTION_ITEM_KEYS.size).toBe(22);
    for (const c of GEAR_COLLECTIONS) {
      expect(c.items.length).toBeGreaterThanOrEqual(4);
      const slotKeys = new Set(c.items.map(item => item.slot));
      expect(slotKeys.size, c.key).toBe(c.items.length);
      const fullSet = c.items.map(item => item.key);
      expect(onePerSlot(fullSet), c.key).toEqual(fullSet);
      expect(gearScore(fullSet)).toBeGreaterThan(0);
      for (const i of c.items) {
        const entry = GEAR.find(g => g.key === i.key);
        expect(entry, i.key).toBeTruthy();
        expect(GEAR_SLOT[i.key], i.key).toBe(i.slot);
        expect(entry?.tier, i.key).toBe(c.tier);
        expect(entry?.price, i.key).toBe(GEAR_TIERS[c.tier - 1].price);
      }
    }
  });

  it('renders each owned collection item exactly once on both body and inventory artwork', () => {
    for (const c of GEAR_COLLECTIONS) {
      const worn = c.items.map(i => i.key);
      for (const build of ['slim', 'athletic', 'full'] as const) {
        const svg = renderToStaticMarkup(createElement(HumanFigure, {
          rpg: true, look: { ...hero, build, gear: worn },
        }));
        for (const key of worn) {
          expect(svg.match(new RegExp('data-rpg-item="' + key + '"', 'g'))?.length, key + ' ' + build).toBe(1);
        }
      }
      for (const item of c.items) {
        const thumb = renderToStaticMarkup(createElement(GearArtwork, { item: item.key }));
        expect(thumb, item.key).toContain('data-rpg-item="' + item.key + '"');
        expect(thumb, item.key).toContain('data-collection-tier="' + c.tier + '"');
        expect(thumb, item.key).toContain('<svg');
      }
    }
  });

  it('does not put fantasy wearables on the clinical body map or load missing photo outfits', () => {
    const all = COLLECTION_GEAR.map(i => i.key);
    const clinical = renderToStaticMarkup(createElement(HumanFigure, {
      look: { ...hero, gear: all },
    }));
    for (const key of all) expect(clinical).not.toContain('data-rpg-item="' + key + '"');

    for (const c of GEAR_COLLECTIONS) {
      const outfit = c.items.find(i => i.slot === 'outfit')!;
      expect(COLLECTION_OUTFIT_KEYS.has(outfit.key)).toBe(true);
      const sources = heroPhotoSources({ ...hero, gear: [outfit.key] });
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every(s => s.startsWith('avatar/')), outfit.key).toBe(true);
    }
  });

  it('keeps five-tier original shop coins separate from any clinical phase requirements', () => {
    for (const tier of GEAR_TIERS) {
      const group = GEAR_COLLECTIONS.find(c => c.tier === tier.tier)!;
      expect(group.items.every(i => GEAR.find(g => g.key === i.key)?.price === tier.price)).toBe(true);
    }
  });
});
