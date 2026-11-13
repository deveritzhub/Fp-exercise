import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { expectAccessible } from './helpers';

test('eight body models render, turn and retain all four animations', async ({ page }) => {
  test.setTimeout(240000);
  mkdirSync('docs/hero3d-review', { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  let index = 0;
  for (const frame of ['m', 'f']) for (const build of ['slim', 'average', 'athletic', 'full']) {
    const query = new URLSearchParams({ frame, build, hair: ['buzz', 'short', 'afro', 'curly', 'long', 'ponytail', 'bun', 'none'][index], skin: index % 2 ? 's7' : 's3', hairColor: index % 2 ? 'black' : 'brown' });
    const response = page.waitForResponse(r => r.url().includes(`/hero3d/hero_${frame}_${build}.glb`));
    await page.goto(`/hero3d-review.html?${query}`);
    expect((await response).status()).toBe(200);
    const hero = page.getByTestId('hero-3d');
    await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await hero.screenshot({ path: `docs/hero3d-review/${frame}-${build}.png` });
    await page.getByRole('button', { name: 'Draai naar rechts' }).press('Enter');
    await page.getByRole('button', { name: 'Draai naar rechts' }).press('Enter');
    await hero.screenshot({ path: `docs/hero3d-review/${frame}-${build}-side.png` });
    const motions = await page.evaluate(async () => {
      // Variable path avoids TypeScript resolving a browser-only Vite import in Node.
      const path = '/src/hero3d-review.tsx';
      return (await import(path)).checkMotions() as Promise<{ name: string; changed: number; finite: boolean }[]>;
    });
    expect(motions.map(m => m.name)).toEqual(['idle', 'walk', 'run', 'cheer']);
    for (const motion of motions) { expect(motion.changed, `${frame}/${build}/${motion.name}`).toBeGreaterThan(0); expect(motion.finite).toBe(true); }
    index++;
  }
  await expectAccessible(page, '3D hero review');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByTestId('hero-3d').screenshot({ path: 'docs/hero3d-review/mobile.png' });
  await page.goto('/hero3d-review.html?frame=m&build=average&hair=short&gear=crown,gold_shoes,champion');
  await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready');
  await page.locator('main').screenshot({ path: 'docs/rpg-screenshots/hero-3d.png' });
  expect(errors).toEqual([]);
});


test('the live village renderer loads the fuller body and its moving villagers', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hero3d-review.html?village=1&frame=f&build=full&hair=bun');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-villagers', '3', { timeout: 60000 });
  const box = (await village.boundingBox())!;
  await page.mouse.click(box.x + box.width * .75, box.y + box.height * .5);
  await expect(village).toHaveAttribute('data-walking', '1');
  await village.screenshot({ path: 'docs/hero3d-review/village.png' });
  expect(errors).toEqual([]);
});
