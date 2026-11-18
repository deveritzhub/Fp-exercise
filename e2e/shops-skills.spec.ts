import { test, expect } from '@playwright/test';
import { expandFolds, expectAccessible, login } from './helpers';

/** As in an RPG: the backpack holds what you have, the shops of the town sell and make, and the adventure skill shows what each level unlocks. */
test('backpack, town shops and the adventure skill guide', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');

  // The backpack: owned things only, and the way to the shops.
  await page.goto('/p/held/inventaris');
  await expect(page.getByTestId('pack-weapons').locator('[data-weapon="fists"]')).toBeVisible();
  await expect(page.getByTestId('pack-weapons').locator('[data-state="locked"], [data-state="shop"]')).toHaveCount(0);
  if (process.env.SHOTS) await page.getByTestId('pack-weapons').screenshot({ path: process.env.SHOTS + '/pack-owned.png' });

  // Each shop of the town opens with its goods and the coins.
  for (const shop of ['smid', 'gereedschap', 'stallen', 'werkplaats', 'pantser']) {
    await page.goto('/p/held/inventaris');
    await page.getByTestId('pack-shops').locator(`[data-shop="${shop}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/p/winkel/${shop}$`));
    await expect(page.getByTestId(`shop-${shop}`)).toBeVisible();
    await expect(page.getByTestId('shop-coins')).toContainText('muntjes');
    if (shop === 'smid') {
      await expectAccessible(page, 'smithy');
      if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/shop-smid.png', fullPage: true });
    }
  }
  // The smithy sells nothing above your level.
  await page.goto('/p/winkel/smid');
  await expect(page.getByTestId('weapons').locator('[data-weapon="hero_sword"]')).toHaveCount(0);

  // Skills: the adventure skill opens a guide of what every level unlocks, and where.
  await page.goto('/p/held');
  await expandFolds(page);
  await page.getByTestId('adventure-skill').click();
  const guide = page.getByTestId('adventure-unlocks');
  await expect(guide).toBeVisible();
  await expect(guide.locator('[data-level]').first()).toBeVisible();
  await expect(guide).toContainText('Smederij');
  await expect(guide).toContainText('Stallen');
  await expect(guide.locator('[data-level="16"]')).toHaveAttribute('data-open', '0');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/skill-guide.png' });
  await expectAccessible(page, 'adventure skill guide');
  await context.close();
});
