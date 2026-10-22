import { describe, it, expect } from 'vitest';
import { buildTsQuery } from '../src/routes/exercises';
import { sniff } from '../src/routes/media';

describe('search query builder', () => {
  it('builds prefix queries and strips operators', () => {
    expect(buildTsQuery('brug')).toBe('(brug:*)');
    expect(buildTsQuery("a & b | !c ' :*")).toBeNull();
  });
  it('expands Dutch taxonomy labels to stored keys', () => {
    expect(buildTsQuery('knie')).toContain('(knee)');
    expect(buildTsQuery('weerstandsband')).toContain('(resistance & band)');
  });
});

describe('file sniffing', () => {
  it('detects formats by magic bytes', () => {
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe('image/jpeg');
    expect(sniff(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))?.kind).toBe('video');
    expect(sniff(new TextEncoder().encode('<svg></svg>'))).toBeNull();
  });
});
