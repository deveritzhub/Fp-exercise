import { test, expect } from '@playwright/test';
import { login } from './helpers';
/** Figures are tapped to talk; the talk offers what the app can do at that place. */
test('tapping the flow master and the physiotherapist opens a talk with the functions of the app', async ({ browser }) => {
  test.setTimeout(400_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByTestId('toggle-full').click();
  await page.getByRole('button', { name: 'Loop naar Mobiliteitsstudio' }).press('Enter');
  await page.getByTestId('enter-house').click({ timeout: 120_000 });
  await expect(village).toHaveAttribute('data-zone', 'mobiliteit', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Praat met Flowmeester' }).press('Enter');
  await expect(page.getByTestId('keeper-talk')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('enter-building')).toHaveAttribute('href', '/p/mobiliteit/meten');
  await page.getByRole('dialog').getByRole('button', { name: /Sluit/ }).first().click();
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 90_000 });
  // The physiotherapist in the practice: tapped from outside the room is not possible, so go in first.
  await page.getByRole('button', { name: /^Loop naar Functional/ }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'practice', { timeout: 120_000 });
  await page.getByRole('button', { name: /^Praat met Fysiotherapeut/ }).press('Enter');
  await expect(page.getByTestId('keeper-talk')).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('talk-first').click();
  await expect(page.getByRole('dialog', { name: 'Je oefeningen van vandaag' })).toBeVisible();
  await context.close();
});
