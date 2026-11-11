import { describe, it, expect } from 'vitest';
import { heroPhotoSources } from './HeroPhoto';

describe('hero photo sources', () => {
  const look = { frame: 'f', skin: 'tan', build: 'average', hair: 'long' } as Parameters<typeof heroPhotoSources>[0];
  it('without an outfit: hairstyle photo, then the base photo', () => {
    const k = heroPhotoSources(look);
    expect(k.every((x) => x.startsWith('avatar/'))).toBe(true);
    expect(k.at(-1)).toMatch(/^avatar\/f_s\d_[a-z]+$/);
  });
  it('with an outfit: the outfit photo of the base avatar first, the plain photos as fallback', () => {
    const k = heroPhotoSources({ ...look, gear: ['cap', 'champion'] });
    expect(k[0]).toMatch(/^outfit\/f_s\d_[a-z]+__champion$/);
    expect(k.slice(1).every((x) => x.startsWith('avatar/'))).toBe(true);
  });
  it('a personal or guest photo gets its own outfit photo first', () => {
    const k = heroPhotoSources({ ...look, photo: 'custom_1', gear: ['tracksuit'] });
    expect(k[0]).toBe('outfit/custom_1__tracksuit');
    expect(k).toContain('avatar/custom_1');
  });
});
