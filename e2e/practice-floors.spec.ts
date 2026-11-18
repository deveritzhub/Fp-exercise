import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * The whole practice: from the exercise room through the hall door to the landing upstairs, down the
 * stairs to the hall with the treatment room and the strength room, and out of the street door.
 */
test('the practice has an upstairs and a downstairs to walk through', async ({ browser }) => {
  test.setTimeout(600_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'nl-NL' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  await page.getByRole('button', { name: /^Loop naar Oefenzaal/ }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'practice', { timeout: 200_000 });

  // Through the hall door: upstairs, with somewhere to sit.
  await page.locator('[data-spot="door:gang"]').press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'boven', { timeout: 150_000 });
  await expect(page.getByTestId('sit')).toBeVisible();
  if (process.env.SHOTS) await village.screenshot({ path: process.env.SHOTS + '/practice-upstairs.png' });

  // Down the stairs, and out of the street door into the village.
  await page.locator('[data-spot="door:beneden"]').press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'beneden', { timeout: 150_000 });
  if (process.env.SHOTS) await village.screenshot({ path: process.env.SHOTS + '/practice-downstairs.png' });
  await page.locator('[data-spot="exit"]').press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 150_000 });
  expect(errors).toEqual([]);
  await context.close();
});
