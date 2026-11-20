import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** The backpack opens inside the game; a page opened from the game leads straight back to it; the hero page has the way in. */
test('backpack in the game, the way back to the game, and the 3D world button by the hero', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  // The hero page: the 3D world right by the hero.
  await page.goto('/p/held');
  await page.getByTestId('hero-play').click();
  await expect(page).toHaveURL(/\/p\/dorp$/);
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // The backpack, in the game.
  await page.getByTestId('slot-backpack').click();
  const pack = page.getByTestId('game-backpack');
  await expect(pack.getByTestId('pack-weapons')).toBeVisible();
  await expect(pack.getByTestId('pack-shops')).toBeVisible();
  await expect(pack.getByTestId('light')).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/game-backpack.png' });
  await expectAccessible(page, 'game backpack');
  await page.keyboard.press('Escape');
  // The gear screen behind the two swords: the adventurer level, the three ways to fight, and on/off.
  await page.getByTestId('slot-gear').click();
  const gear = page.getByTestId('gear-screen');
  await expect(gear).toBeVisible();
  await expect(gear.getByTestId('gear-xp')).toContainText('XP');
  await expect(gear.getByTestId('gear-skills').locator('[data-skill]')).toHaveCount(3);
  await expect(gear.locator('[data-gear-weapon="fists"]')).toBeVisible();
  await expect(gear.locator('[data-ammo="arrows"]')).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/game-gear.png' });
  await expectAccessible(page, 'game gear');
  await page.keyboard.press('Escape');
  await page.getByTestId('slot-backpack').click();
  // A page opened from the game opens over the world; closing it is back in the game.
  await pack.getByRole('link', { name: /Alles van je held/ }).click();
  await expect(page.getByTestId('game-page')).toBeVisible();
  await page.getByTestId('game-page-close').click();
  await expect(page).toHaveURL(/\/p\/dorp$/);
  // Opened from elsewhere, a page has no such bar.
  await page.goto('/p/held/inventaris');
  await expect(page.getByTestId('back-to-game')).toHaveCount(0);
  await context.close();
});
