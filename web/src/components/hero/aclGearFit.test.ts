import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ACL_REWARDS, wearableAclReward } from '@shared/aclRewards';
import { HumanFigure } from './HumanFigure';
import { GearArtwork } from './RpgGear';

const look = {
  frame: 'm' as const, build: 'athletic' as const, skin: 's4', hair: 'short',
  outfit: 'forest', hairColor: 'black',
};
const figure = (gear: string[]) => renderToStaticMarkup(createElement(HumanFigure, {
  look: { ...look, gear }, rpg: true,
}));

describe('ACL journey cosmetic gear positioning', () => {
  const wearable = ACL_REWARDS.filter(x => wearableAclReward(x.key));
  it('renders every actual wearable reward, but does not render banners or pets on the body', () => {
    for (const item of wearable) {
      const svg = figure([item.key]);
      expect(svg, item.key).toContain(`data-rpg-item="${item.key}"`);
    }
    for (const item of ACL_REWARDS.filter(x => !wearableAclReward(x.key))) {
      expect(figure([item.key]), item.key).not.toContain(`data-rpg-item="${item.key}"`);
    }
  });

  it('draws capes underneath the body, not as a rectangle on the chest', () => {
    for (const key of ['wind_cape','deswell_mantle']) {
      const svg = figure([key]);
      expect(svg.indexOf(`data-rpg-item="${key}"`)).toBeLessThan(svg.indexOf('linearGradient'));
      expect(svg).toContain(`data-rpg-item="${key}"`);
    }
  });

  it('anchors both knee rewards around y=294, and shoes at the feet instead of the torso', () => {
    for (const key of ['iron_brace','rune_guard']) {
      const svg = renderToStaticMarkup(createElement(GearArtwork, { item: key }));
      expect(svg).toContain(' 294)');
      expect(svg).toContain(`data-rpg-item="${key}"`);
    }
    for (const key of ['pilgrim_boots','wing_shoes']) {
      const svg = renderToStaticMarkup(createElement(GearArtwork, { item: key }));
      expect(svg).toContain(' 382)');
      expect(svg).toContain(`data-rpg-item="${key}"`);
    }
  });

  it('sports kits cover the actual figure and do not show a chest-only placeholder', () => {
    for (const item of ACL_REWARDS.filter(x => x.slot === 'outfit')) {
      const svg = figure([item.key]);
      expect(svg).toContain(`data-rpg-item="${item.key}"`);
      expect(svg).not.toContain('M72,30 h56 v50 h-56Z');
    }
  });

  it('keeps all inventory thumbnails available using the same visual assets', () => {
    for (const item of wearable) {
      const svg = renderToStaticMarkup(createElement(GearArtwork, { item: item.key }));
      expect(svg, item.key).toContain('<svg');
      expect(svg, item.key).toContain(`data-rpg-item="${item.key}"`);
    }
  });

  it('does not expose new cosmetics on non-RPG clinical body maps', () => {
    expect(renderToStaticMarkup(createElement(HumanFigure, { look: { ...look, gear: ['iron_brace','wing_shoes'] } }))).not.toContain('data-rpg-item');
  });
});
