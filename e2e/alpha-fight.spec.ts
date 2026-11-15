import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/**
 * The hero has a life bar in the village. The first Alpha, the Alfazwijn, attacks by itself and can
 * beat the hero; losing costs nothing: the hero gets up at the well with full life.
 */
test('the Alpha attacks, the hero can be beaten and gets up again at the well', async ({ browser }) => {
  test.setTimeout(240_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 60_000 });
  const life = page.getByTestId('hero-hp');
  await expect(life).toBeVisible({ timeout: 30_000 });
  const max = Number(await life.getAttribute('data-max'));
  await expect(life).toHaveAttribute('data-hp', String(max));

  await page.getByRole('button', { name: 'Loop naar Alfazwijn' }).last().press('Enter');
  await expect(page.getByTestId('alpha-warning')).toBeVisible({ timeout: 90_000 });
  // It attacks without being struck: the life bar goes down.
  await expect.poll(async () => Number(await life.getAttribute('data-hp')), { timeout: 15_000 }).toBeLessThan(max);
  await page.screenshot({ path: 'screenshots/hero/alpha-fight.png' });
  // Stand there long enough and the hero is beaten.
  const down = page.getByRole('dialog', { name: 'Je bent verslagen' });
  await expect(down).toBeVisible({ timeout: 60_000 });
  await expect(down).toContainText('Je verliest niets');
  await expect(life).toHaveAttribute('data-hp', '0');
  await expectAccessible(page, 'hero beaten');
  await page.screenshot({ path: 'screenshots/hero/alpha-beaten.png' });
  await down.getByTestId('respawn').click();
  await expect(down).toBeHidden();
  await expect(life).toHaveAttribute('data-hp', String(max));
  await context.close();
});
