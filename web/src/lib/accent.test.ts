import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { accentVars, contrast } from './accent';

const require = createRequire(import.meta.url);
const tw = require('../../tailwind.config.cjs').theme.extend.colors;
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const triplet = (s: string) => s.split(' ').map(Number) as [number, number, number];
const ratio = (a: string, b: string) => contrast(rgb(a), rgb(b));

describe('design tokens (WCAG 2.2 AA)', () => {
  const surfaces = { white: '#ffffff', canvas: tw.canvas, sage: tw.sage };
  it.each(['900', '800', '700', '600', '500', '400'])('ink-%s text is readable on every surface', (k) => {
    for (const bg of Object.values(surfaces)) expect(ratio(tw.ink[k], bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['ok', 'warn', 'bad', 'info'])('status %s is readable on white, canvas and its own soft background', (k) => {
    for (const bg of [surfaces.white, surfaces.canvas, tw[k].soft]) expect(ratio(tw[k].DEFAULT, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('status colours are distinct from each other and from the brand green', () => {
    const all = ['#29483c', tw.ok.DEFAULT, tw.warn.DEFAULT, tw.bad.DEFAULT, tw.info.DEFAULT];
    expect(new Set(all).size).toBe(all.length);
  });
  it('the sand streak chip is readable', () => {
    expect(ratio(tw.sand.ink, tw.sand.soft)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('practice accent', () => {
  it('keeps the base theme for no colour, an invalid one or the former default', () => {
    expect(accentVars(null)).toBeNull();
    expect(accentVars('red')).toBeNull();
    expect(accentVars('#413D28')).toBeNull();
    expect(accentVars('#29483c')).toBeNull();
  });
  it('uses a dark practice colour as is', () => {
    expect(accentVars('#1d4e89')?.['--accent']).toBe('29 78 137');
  });
  it('darkens a light colour until white text and the colour as text both pass AA', () => {
    const v = accentVars('#9fe0b0')!;
    const c = triplet(v['--accent']);
    expect(contrast(c, [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(triplet(v['--accent-strong']), [255, 255, 255])).toBeGreaterThan(contrast(c, [255, 255, 255]));
  });
});
