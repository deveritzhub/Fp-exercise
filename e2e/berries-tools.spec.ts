import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** Berries are picked from a bush by hand; a hatchet from the backpack shop makes chopping an oak quick. */
test('the patient picks berries and buys a hatchet', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  const adv = async () => (await (await page.request.get('/api/patient/hero/adventure')).json()) as { loot: Record<string, number>; tools: string[]; coins: number };
  const before = await adv();

  await page.goto('/p/dorp');
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Loop naar Bessenstruik' }).first().press('Enter');
  const pick = page.getByTestId('strike');
  await expect(pick).toContainText('Pluk bessen', { timeout: 90_000 });
  await page.screenshot({ path: 'screenshots/hero/berry-bush.png' });
  for (let i = 0; i < 4 && (await pick.count()); i++) await pick.click();
  await expect.poll(async () => (await adv()).loot.berries ?? 0, { timeout: 15_000 }).toBeGreaterThan(before.loot.berries ?? 0);

  // The berries are in the backpack; the hatchet is bought at the tool shop with coins, once.
  await page.goto('/p/held/inventaris');
  await expect(page.getByTestId('loot').locator('[data-loot="berries"]')).toHaveAttribute('data-n', /[1-9]/);
  await page.goto('/p/winkel/gereedschap');
  const tools = page.getByTestId('tools');
  await expect(tools.locator('[data-tool]')).toHaveCount(2);
  const hatchet = tools.locator('[data-tool="hatchet"]');
  if (!before.tools.includes('hatchet')) {
    test.skip(before.coins < 40, 'not enough coins left in this run');
    await hatchet.getByRole('button', { name: 'Koop' }).click();
  }
  await expect(hatchet).toHaveAttribute('data-state', 'owned');
  await expectAccessible(page, 'tool shop');
  await page.goto('/p/held/inventaris');
  await expect(page.getByTestId('pack-tools').locator('[data-tool="hatchet"]')).toBeVisible();

  // With the hatchet an oak (5 life) falls in two blows.
  await page.goto('/p/dorp');
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Loop naar Eik' }).first().press('Enter');
  const chop = page.getByTestId('strike');
  await expect(chop).toContainText('met je hakbijl', { timeout: 90_000 });
  await chop.click();
  await chop.click();
  await expect(chop).toHaveCount(0, { timeout: 15_000 });
  await context.close();
});
