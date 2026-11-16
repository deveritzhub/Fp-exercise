import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { expectAccessible } from './helpers';

test('portrait study renders true 3D eyes and hair from front, three-quarter and profile', async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync('docs/hero3d-portrait', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 900, height: 960 });
  await page.goto('/hero3d-face-study.html');
  const hero = page.getByTestId('hero-3d');
  await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await hero.screenshot({ path: 'docs/hero3d-portrait/front.png' });
  for (const view of ['three-quarter', 'profile']) {
    await page.getByRole('button', { name: 'Draai naar rechts' }).press('Enter');
    await hero.screenshot({ path: `docs/hero3d-portrait/${view}.png` });
  }
  await page.getByRole('button', { name: 'Vorige versie' }).press('Enter');
  await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await hero.screenshot({ path: 'docs/hero3d-portrait/before.png' });
  await page.getByRole('button', { name: 'Nieuw personage' }).press('Enter');
  await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('main').screenshot({ path: 'docs/hero3d-portrait/mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectAccessible(page, 'Portrait art study');
  await page.goto('/hero3d-face-study.html?skin=s8&eyeColor=blue&hairColor=blond');
  await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await page.getByTestId('hero-3d').screenshot({ path: 'docs/hero3d-portrait/colour-variant.png' });
  expect(errors).toEqual([]);
});


test('a ready character includes its clothing image', async ({ page }) => {
  test.setTimeout(60000);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/hero3d/fabric/effen.webp*', async route => { requested = true; await gate; await route.continue(); });
  try {
    await page.goto('/hero3d-face-study.html', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => requested).toBe(true);
    await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'loading');
    release();
    await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  } finally { release(); }
});
