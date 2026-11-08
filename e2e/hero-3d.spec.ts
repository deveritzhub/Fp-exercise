import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

const SHOTS = 'screenshots/hero-3d';

test('3D hero toggle opens a canvas or the WebGL fallback', async ({ browser }) => {
  test.setTimeout(90_000);
  mkdirSync(SHOTS, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  try {
    await login(page, 'patient@praktijk-a.test');
    await page.goto('/p/held');
    await expect(page.getByRole('button', { name: 'Bekijk in 3D' })).toBeVisible();
    await page.getByRole('button', { name: 'Bekijk in 3D' }).click();
    const canvas = page.locator('#hero-3d-stage canvas');
    const fallback = page.getByText('3D is niet beschikbaar in deze browser.');
    await expect(canvas.or(fallback)).toBeVisible({ timeout: 20_000 });
    if (await canvas.count()) {
      await page.locator('#hero-3d-stage').focus();
      await page.keyboard.press('ArrowRight');
      await page.locator('#hero-3d-stage').screenshot({ path: `${SHOTS}/hero-3d-360.png`, animations: 'disabled' });
    }
    await page.goto('/p/held?webgl=0');
    await page.getByRole('button', { name: 'Bekijk in 3D' }).click();
    await expect(page.getByText('3D is niet beschikbaar in deze browser.')).toBeVisible();
    await expect(page.locator('#hero-3d-stage canvas')).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/hero-3d-fallback-360.png`, animations: 'disabled' });
  } finally {
    await ctx.close();
  }
});
