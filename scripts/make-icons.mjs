/**
 * Generates every app icon from the FP monogram in the brand colours (Deep Forest Green on
 * Clinical Sage): web/PWA icons, Android launcher icons, the splash image and Play Store graphics.
 *   node scripts/make-icons.mjs
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FOREST = '#29483c';
const SAGE = '#e6eee8';
const CANVAS = '#f7f9f7';
const INK = '#202b26';
const manrope = path.join(root, 'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2');
const inter = path.join(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');

// Fonts inline: a page opened with setContent may not load file:// URLs.
const font = (f) => fs.readFileSync(f).toString('base64');

const mark = (size, color, stroke = 1.6) =>
  `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><g fill="none" stroke="${color}" stroke-width="${stroke}"><path d="M11.2 9.9A10 10 0 1 0 20.8 9.9"/><circle cx="16" cy="17.5" r="5.2"/><circle cx="16" cy="9.6" r="3.2"/></g></svg>`;
const tile = (size, pad, { round = false } = {}) =>
  `<div style="width:${size}px;height:${size}px;background:${FOREST};${round ? 'border-radius:50%;' : ''}display:flex;align-items:center;justify-content:center">${mark(size * (1 - pad), SAGE)}</div>`;

const jobs = [
  ['web/public/icon-192.png', 192, 192, tile(192, 0.38)],
  ['web/public/icon-512.png', 512, 512, tile(512, 0.38)],
  ['web/public/apple-touch-icon.png', 180, 180, tile(180, 0.36)],
  ['android/store/icon-512.png', 512, 512, tile(512, 0.38)],
  ['android/app/src/main/res/drawable/splash.png', 288, 288, tile(288, 0.42)],
  ...[['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].flatMap(([d, s]) => [
    [`android/app/src/main/res/mipmap-${d}/ic_launcher.png`, s, s, tile(s, 0.36)],
    [`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`, s, s, tile(s, 0.4, { round: true }), true],
  ]),
  [
    'android/store/feature-graphic-1024x500.png', 1024, 500,
    `<div style="width:1024px;height:500px;background:${CANVAS};display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box">
      <div style="border-radius:28px;overflow:hidden;flex:none">${tile(300, 0.4)}</div>
      <div><div style="font:800 64px Manrope;color:${FOREST};letter-spacing:-0.02em">FP Exercise</div>
      <div style="font:400 30px Inter;color:${INK};opacity:.75;margin-top:14px;line-height:1.35">Je oefenprogramma van<br>je fysiotherapeut</div></div></div>`,
  ],
];

const b = await chromium.launch(process.env.CI ? {} : { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [out, w, h, html, transparent] of jobs) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<html><head><style>
    @font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font(manrope)});font-weight:200 800}
    @font-face{font-family:Inter;src:url(data:font/woff2;base64,${font(inter)});font-weight:100 900}
    html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(root, out), omitBackground: !!transparent });
  await p.close();
}
await b.close();
console.log(`${jobs.length} images written`);
