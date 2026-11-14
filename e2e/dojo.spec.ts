import { test, expect } from '@playwright/test';
import { expandFolds, expectAccessible, login } from './helpers';

/** Karate as a skill: tick the list for the next belt, take the exam, and find the dojo in the village. */
test('patient earns the orange belt and walks to the dojo', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/held');
  await expandFolds(page);
  await page.getByTestId('karate-skill').click();
  const sheet = page.getByTestId('karate-sheet');
  await expect(page.getByTestId('karate-belt')).toContainText('witte band');
  const exam = page.getByTestId('karate-exam');
  await expect(exam).toBeDisabled();
  const boxes = sheet.getByRole('checkbox');
  const n = await boxes.count();
  expect(n).toBe(9);
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).check();
    await expect(boxes.nth(i)).toBeChecked();
  }
  await expectAccessible(page, 'karate sheet');
  await expect(exam).toBeEnabled();
  await exam.click();
  await expect(page.getByTestId('karate-belt')).toContainText('oranje band');
  await expect(sheet.getByRole('checkbox').first()).not.toBeChecked();
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/dojo-0.png' });
  await page.getByRole('dialog').getByRole('button', { name: /Sluit/ }).first().click();
  await expect(page.getByTestId('karate-skill')).toContainText('oranje band');

  // In the village the dojo is a building; at its door the same list opens, and the hero wears the belt.
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Loop naar Dojo' }).press('Enter');
  // The hero walks in; the sensei stands on the mats under the banner.
  await expect(village).toHaveAttribute('data-zone', 'dojo', { timeout: 120_000 });
  await page.getByTestId('talk-keeper').click({ timeout: 60_000 });
  await expect(page.getByTestId('karate-belt')).toContainText('oranje band');
  await page.getByTestId('dojo-kun').locator('summary').click();
  await expect(page.getByTestId('dojo-kun')).toContainText('onwankelbare geest');
  if (process.env.SHOTS) { await page.screenshot({ path: process.env.SHOTS + '/dojo-2.png' }); await page.getByRole('dialog').getByRole('button', { name: /Sluit/ }).first().click(); await page.getByTestId('toggle-full').click(); await page.waitForTimeout(2500); await page.screenshot({ path: process.env.SHOTS + '/dojo-1.png' }); }
  await context.close();
});
