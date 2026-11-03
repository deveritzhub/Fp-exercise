import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('dashboard figures are links: own patients, and the lists further down', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, 'eigenaar@praktijk-a.test');
  await page.goto('/app');
  const patients = page.getByRole('link', { name: /^Mijn patiënten/ });
  await expect(patients).toBeVisible();
  // No icon may stick out of its card on a narrow phone.
  for (const card of await page.locator('a.card').all()) {
    const box = (await card.boundingBox())!;
    for (const icon of await card.locator('span[aria-hidden]').all()) {
      const ib = await icon.boundingBox();
      if (ib) expect(ib.x + ib.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    }
  }
  await expectAccessible(page, 'dashboard stat links');
  await page.getByRole('link', { name: /^Aandacht/ }).click();
  await expect(page).toHaveURL(/#vraagt-aandacht$/);
  await page.getByRole('link', { name: /^Sessies/ }).click();
  await expect(page).toHaveURL(/#recente-activiteit$/);
  await page.goto('/app');
  await page.getByRole('link', { name: /^Mijn patiënten/ }).click();
  await expect(page).toHaveURL(/\/app\/patienten\?bereik=mijn$/);
  await expect(page.getByRole('radio', { name: 'Mijn patiënten' }).or(page.getByRole('button', { name: 'Mijn patiënten', pressed: true }))).toBeVisible();
});
