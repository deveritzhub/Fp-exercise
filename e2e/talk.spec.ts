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
  // The clear button above the world opens it full screen; + and − zoom.
  await page.getByTestId('play-full').click();
  await expect(page.getByTestId('toggle-full')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('zoom-out').click();
  await page.getByTestId('zoom-out').click();
  if (process.env.SHOTS) { await page.waitForTimeout(2500); await page.screenshot({ path: process.env.SHOTS + '/zoom-out.png' }); }
  await page.getByTestId('zoom-in').click();
  await page.getByTestId('zoom-in').click();
  await page.getByTestId('zoom-in').click();
  if (process.env.SHOTS) { await page.waitForTimeout(2500); await page.screenshot({ path: process.env.SHOTS + '/zoom-in.png' }); }
  await page.getByTestId('zoom-out').click();
  await page.getByRole('button', { name: 'Loop naar Mobiliteitsstudio' }).press('Enter');
  await page.getByTestId('enter-house').click({ timeout: 120_000 });
  await expect(village).toHaveAttribute('data-zone', 'mobiliteit', { timeout: 30_000 });
  // Walk up so the flow master is in view; then the body itself is tapped, a little below the name above the head.
  await page.getByRole('button', { name: 'Loop naar het programmabord van Mobiliteitsstudio' }).press('Enter');
  await expect(page.getByTestId('talk-hint')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1200);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/body.png' });
  const plate = (await page.locator('[data-talk="mobiliteit"]').boundingBox())!;
  await page.touchscreen.tap(plate.x + plate.width / 2, plate.y + plate.height + 55);
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

/** The strength house: walk in, tap the coach from across the room, and find the 1RM among the choices. */
test('the coach in the strength house offers the programme and the 1RM', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // A house can be entered too: the strength house has its own room with the programme board.
  await page.getByRole('button', { name: 'Loop naar Krachthonk' }).press('Enter');
  await page.getByTestId('enter-house').click({ timeout: 60_000 });
  await expect(village).toHaveAttribute('data-zone', 'kracht', { timeout: 30_000 });
  // The coach is tapped from across the room: the hero walks up and the talk opens, with the 1RM among the choices.
  await page.getByRole('button', { name: 'Praat met Coach' }).press('Enter');
  const talk = page.getByTestId('keeper-talk');
  await expect(talk).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('enter-building')).toHaveAttribute('href', '/p/kracht');
  await expect(talk.getByRole('link', { name: /1RM/ })).toHaveAttribute('href', '/p/krachtlog');
  await page.getByRole('dialog').getByRole('button', { name: /Sluit/ }).first().click();
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 90_000 });
  await context.close();
});
