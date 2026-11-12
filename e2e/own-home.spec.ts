import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** The patient's own home in the village: walk in, buy a piece with coins, and put it somewhere else. */
test('patient furnishes the own home with coins', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(village).toHaveAttribute('data-furniture', '0', { timeout: 30_000 });

  // Full screen: the village takes the whole screen, with the controls still on it; the button leaves again.
  await page.getByTestId('toggle-full').click();
  const big = (await village.boundingBox())!;
  expect(big.width).toBeGreaterThanOrEqual(388);
  expect(big.height).toBeGreaterThanOrEqual(800);
  await expect(page.getByTestId('minimap')).toBeVisible();
  await page.getByTestId('toggle-full').click();
  expect((await village.boundingBox())!.height).toBeLessThan(big.height - 60);

  // The home is a place in the village like the others: pick it and the hero walks there.
  await page.getByTestId('slot-places').click();
  await page.getByTestId('places').getByRole('button', { name: /Jouw huis/ }).click();
  await page.getByTestId('enter-home').click({ timeout: 90_000 });
  await expect(village).toHaveAttribute('data-zone', 'home', { timeout: 30_000 });

  // At the furnishing table: the shop sells with the coins earned by training.
  await page.getByRole('button', { name: 'Loop naar de inrichtingstafel' }).press('Enter');
  await page.getByTestId('open-decor').click({ timeout: 60_000 });
  const panel = page.getByTestId('decor-panel');
  const coins = Number(await panel.getByTestId('coins').innerText());
  expect(coins).toBeGreaterThanOrEqual(25);
  await panel.getByRole('tab', { name: 'Winkel' }).click();
  await panel.locator('[data-buy="home_chair"]').click();
  await expect(panel.getByTestId('coins')).toHaveText(String(coins - 25));
  await expect(panel.getByText('Staat in je huis')).toBeVisible();
  await expect(village).toHaveAttribute('data-furniture', '1');
  // A piece above the level is shown, but locked.
  await panel.getByRole('tab', { name: 'Winkel' }).click();
  await expect(panel.locator('[data-buy="home_statue"]')).toBeDisabled();

  // Move it: choose the piece, then tap the floor (a tap past the wall puts it against the wall).
  await panel.getByRole('tab', { name: /Mijn meubels/ }).click();
  await panel.getByRole('button', { name: 'Verplaats' }).click();
  await expect(page.getByTestId('placing')).toBeVisible();
  const box = (await village.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.5);
  await expect(page.getByTestId('placing')).toHaveCount(0, { timeout: 15_000 });
  await expect(village).toHaveAttribute('data-furniture', '1');

  // It is still there after coming back.
  await page.reload();
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-furniture', '1', { timeout: 60_000 });
  await context.close();
});
