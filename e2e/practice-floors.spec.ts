import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * The whole practice: from the exercise room through the hall door to the landing upstairs, down the
 * stairs to the lower floor with the treatment room and exercise room 2, and back up again.
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

  // Through the hall door: upstairs. No seat close by the door, so no Sit button yet.
  await page.locator('[data-spot="door:gang"]').press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'boven', { timeout: 150_000 });
  await expect(page.getByTestId('sit')).toHaveCount(0);
  if (process.env.SHOTS) await village.screenshot({ path: process.env.SHOTS + '/practice-upstairs.png' });

  // Dinish, the physiotherapist in the treatment room: walk up and talk; pain can be reported there.
  await page.getByRole('button', { name: /^Praat met Dinish/ }).press('Enter');
  const talk = page.getByTestId('keeper-talk');
  await expect(talk).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('dialog', { name: /Dinish/ })).toBeVisible();
  await expect(talk).toContainText('Ik wil mijn pijn doorgeven');
  await page.keyboard.press('Escape');
  await expect(talk).toHaveCount(0);

  // Down the stairs.
  await page.locator('[data-spot="door:beneden"]').press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'beneden', { timeout: 150_000 });
  if (process.env.SHOTS) await village.screenshot({ path: process.env.SHOTS + '/practice-downstairs.png' });
  // No street door down here (the way in is the exercise room's): the stairs lead back up.
  await expect(page.locator('[data-spot="exit"]')).toHaveAttribute('style', /-9999px|opacity: 0/);
  await page.locator('[data-spot="door:boven"]').press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'boven', { timeout: 150_000 });
  expect(errors).toEqual([]);
  await context.close();
});
