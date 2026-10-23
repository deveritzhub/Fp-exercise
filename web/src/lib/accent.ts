import { useEffect } from 'react';

/**
 * Practice branding: a practice may set its own accent colour (practices.branding.accent). It replaces
 * the base accent (Deep Forest Green) through the CSS variables in index.css. A colour that is too
 * light is darkened until white text on it, and it as text on white, meet WCAG AA (4.5:1).
 */
export const DEFAULT_ACCENT = '#29483c';
// Former default of the settings form; practices that never chose a colour have this stored.
const LEGACY_DEFAULTS = new Set(['#413d28', DEFAULT_ACCENT]);

type Rgb = [number, number, number];

function parse(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: Rgb) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a: Rgb, b: Rgb) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** CSS variable values (RGB triplets) for an accent colour, or null to keep the base theme. */
export function accentVars(hex: string | null | undefined): Record<string, string> | null {
  if (!hex || LEGACY_DEFAULTS.has(hex.toLowerCase())) return null;
  let c = parse(hex);
  if (!c) return null;
  for (let i = 0; i < 20 && contrast(c, WHITE) < 4.5; i++) c = mix(c, BLACK, 0.08);
  const triplet = (v: Rgb) => v.join(' ');
  return {
    '--accent': triplet(c),
    '--accent-strong': triplet(mix(c, BLACK, 0.25)),
    '--accent-soft': triplet(mix(c, WHITE, 0.88)),
    '--accent-ink': '255 255 255',
  };
}

/** Applies the practice accent to the document while the component is mounted. */
export function usePracticeAccent(hex: string | null | undefined) {
  useEffect(() => {
    const vars = accentVars(hex);
    if (!vars) return;
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(vars)) root.setProperty(k, v);
    return () => {
      for (const k of Object.keys(vars)) root.removeProperty(k);
    };
  }, [hex]);
}
