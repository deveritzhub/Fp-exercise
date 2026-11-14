import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { expectAccessible } from './helpers';

test('art study renders in WebGL, keeps gear and animations, and turns by keyboard', async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync('docs/hero3d-study', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 900, height: 950 });
  for (const [label, query] of [
    ['before', 'frame=f&build=average&hair=bun&skin=s5&hairColor=darkbrown&gear=&studio=1'],
    ['front', 'study=1'], ['portrait', 'study=1&portrait=1'],
  ]) {
    await page.goto(`/hero3d-review.html?${query}`);
    await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.getByTestId('hero-3d').screenshot({ path: `docs/hero3d-study/${label}.png` });
  }
  await page.goto('/hero3d-review.html?study=1');
  await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await page.getByRole('button', { name: 'Draai naar rechts' }).press('Enter');
  await page.getByRole('button', { name: 'Draai naar rechts' }).press('Enter');
  await page.getByTestId('hero-3d').screenshot({ path: 'docs/hero3d-study/side.png' });
  const motions = await page.evaluate(async () => {
    const path = '/src/hero3d-review.tsx';
    return (await import(path)).checkMotions() as Promise<{name:string;changed:number;finite:boolean}[]>;
  });
  for (const m of motions) { expect(m.changed, m.name).toBeGreaterThan(0); expect(m.finite).toBe(true); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hero3d-review.html?study=1&gear=crown,medal,belt,gold_shoes,champion');
  await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await page.getByTestId('hero-3d').screenshot({ path: 'docs/hero3d-study/equipped-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectAccessible(page, 'Character art study');
  expect(errors).toEqual([]);
});

test('the shareable study page compares both models with the same lighting on mobile', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hero3d-study.html');
  const hero = page.getByTestId('hero-3d');
  await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await page.getByRole('button', { name: 'Vorige versie' }).press('Enter');
  await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Vorige versie' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Nieuw personage' }).press('Enter');
  await page.getByRole('button', { name: 'Gezicht van dichtbij' }).press('Enter');
  await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await page.locator('main').screenshot({ path: 'docs/hero3d-study/page-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectAccessible(page, 'Shareable character study');
});
