import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** Vandaag has one main thing to do: the training of the day, with its button in view without scrolling. */
test('"Start training" is in view on a phone without scrolling, under a compact header', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
  // One training: the dark lead card. More than one: the mission card. Either way its button is in view.
  const start = page.getByRole('link', { name: /Start training|Training hervatten|Missie/ }).first();
  // Another test may have finished today's training already; then there is no button to place.
  test.skip((await start.count()) === 0, 'today is already done in this database');
  await expect(start).toBeVisible();
  const box = (await start.boundingBox())!;
  const nav = (await page.getByRole('navigation', { name: 'Navigatie' }).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
  // The practice name is shown in full on at most two short lines, never three.
  const name = page.locator('header').getByText(/Functional Performance/);
  expect((await name.boundingBox())!.height).toBeLessThan(34);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/vandaag-nieuw.png' });

  // A link to an explanation that is gone: a text and a way back, not an empty page.
  await page.goto('/p/uitleg');
  await expect(page.getByTestId('no-explanation')).toContainText('Deze uitleg is er niet');
  await page.getByRole('link', { name: 'Terug naar Vandaag' }).click();
  await expect(page).toHaveURL(/\/p$/);
  await context.close();
});

test('the app opens on Today after being away, not in the game where it was left', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  // A short break: the village stays where it was.
  await page.goto('/p/wereld');
  await expect(page).toHaveURL(/\/p\/wereld$/);
  // Away for an hour: back on Today.
  await page.evaluate(() => localStorage.setItem('fp.p.seen', String(Date.now() - 3600_000)));
  await page.goto('/p/dorp');
  await expect(page).toHaveURL(/\/p$/);
  await context.close();
});
