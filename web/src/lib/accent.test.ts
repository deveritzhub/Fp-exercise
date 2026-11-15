import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { accentVars, contrast } from './accent';

const triplet = (s: string) => s.split(' ').map(Number) as [number, number, number];

/** The colour tokens are CSS variables (RGB triplets) in index.css: one set for light, one for dark. */
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const block = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  const body = css.slice(at, css.indexOf('}', at));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([0-9 ]+);/g)].map((m) => [m[1], triplet(m[2].trim())]));
};
const MODES = { light: block(':root'), dark: { ...block(':root'), ...block('.dark') } } as const;

describe.each(Object.entries(MODES))('design tokens (WCAG 2.2 AA), %s mode', (_mode, v) => {
  const surfaces = [v.surface, v.canvas, v.sage, v.mist];
  it.each(['900', '800', '700', '600', '500', '400'])('ink-%s text is readable on every surface', (k) => {
    for (const bg of surfaces) expect(contrast(v[`ink-${k}`], bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['ok', 'warn', 'bad', 'info'])('status %s is readable on the surface, canvas and its own soft background', (k) => {
    for (const bg of [v.surface, v.canvas, v[`${k}-soft`]]) expect(contrast(v[k], bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('status colours are distinct from each other', () => {
    const all = ['ok', 'warn', 'bad', 'info'].map((k) => v[k].join(','));
    expect(new Set(all).size).toBe(all.length);
  });
  it('the sand streak chip is readable', () => {
    expect(contrast(v['sand-ink'], v['sand-soft'])).toBeGreaterThanOrEqual(4.5);
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
