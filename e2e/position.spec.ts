import { test, expect } from '@playwright/test';
import { login } from './helpers';
test('the hero starts where it was; the tool shop and pebbles picked up by hand', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByTestId('slot-places').click();
  await page.getByTestId('jump-grocer').click();
  await expect(village).toHaveAttribute('data-near', 'grocer', { timeout: 20_000 });
  // Leave the page: the place is saved on the way out; back again, the hero stands there.
  await page.goto('/p');
  await expect.poll(async () => (await (await page.request.get('/api/patient/hero/adventure')).json()).pos?.x ?? 0, { timeout: 15_000 }).toBeGreaterThan(5);
  await page.goto('/p/dorp');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(village).toHaveAttribute('data-near', 'grocer', { timeout: 20_000 });
  // The tool shop sells the tools; a big rock asks for the pickaxe.
  await page.getByTestId('slot-places').click();
  await page.getByTestId('jump-toolshop').click();
  await expect(page.getByTestId('enter-building')).toHaveAttribute('href', '/p/winkel/gereedschap', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Loop naar Steentjes' }).first().press('Enter');
  await expect(page.getByTestId('strike')).toContainText('Raap de steentjes op', { timeout: 120_000 });
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/pebbles.png' });
});
