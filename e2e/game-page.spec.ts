import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** What a building or figure opens is shown over the world; sideways play turns the view; the hero tab leads to the world. */
test('pages open over the world, sideways play, and the hero tab leads into the world', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  // The hero tab opens the 3D world.
  await page.goto('/p/kracht');
  await page.getByTestId('tab-hero').click();
  await expect(page).toHaveURL(/\/p\/dorp$/);
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // The grocer opens nutrition over the world: the hero does not leave.
  await page.getByTestId('slot-places').click();
  await page.getByTestId('jump-grocer').click();
  await page.getByTestId('enter-building').click({ timeout: 20_000 });
  await expect(page.getByTestId('game-page')).toBeVisible();
  const frame = page.frameLocator('[data-testid="game-page-frame"]');
  await expect(frame.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  await expect(frame.locator('nav[aria-label="Navigatie"]')).toHaveCount(0);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/game-page.png' });
  await page.getByTestId('game-page-close').click();
  await expect(page.getByTestId('game-page')).toHaveCount(0);
  await expect(page).toHaveURL(/\/p\/dorp$/);
  await expect(village).toHaveAttribute('data-near', 'grocer');
  // Sideways: where the screen cannot be held sideways, the view itself is turned; a tap still walks.
  await page.getByTestId('play-sideways').click();
  await expect(page.locator('section[data-sideways="1"]')).toHaveCount(1);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/sideways.png' });
  await page.mouse.click(195, 300);
  await expect(village).toHaveAttribute('data-walking', '1', { timeout: 10_000 });
  await context.close();
});
