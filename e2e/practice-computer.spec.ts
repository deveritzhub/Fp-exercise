import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** In the practice of the 3D village, the therapist walks to the computer and makes or gives a programme there. */
test('the therapist uses the practice computer in the village', async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/dorp');
  await page.getByTestId('toggle-walk').click();
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(village).toHaveAttribute('data-zone', 'practice');
  await page.locator('[data-spot="computer"]').press('Enter');
  await expect(page.getByTestId('computer-menu')).toBeVisible({ timeout: 60_000 });
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/practice-computer.png' });
  // A new programme, in the game: the builder without the app's menu round it.
  await page.getByTestId('computer-new').click();
  const frame = page.frameLocator('[data-testid="game-page-frame"]');
  await expect(frame.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
  await expect(frame.getByRole('navigation', { name: /Hoofdmenu|Main/ })).toHaveCount(0);
  await expect(frame.getByRole('button', { name: /Nieuw programma/ })).toHaveCount(0);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/practice-computer-builder.png' });
  await page.getByTestId('game-page-close').click();
  await expect(page.getByTestId('game-page')).toHaveCount(0);
  // The patient list there too.
  await page.getByTestId('computer-patients').click();
  await expect(frame.getByRole('heading', { level: 1 })).toContainText(/Patiënten|Cliënten|Klanten/, { timeout: 60_000 });
});
