import { test, expect } from '@playwright/test';
import { login, expectAccessible, PASSWORD } from './helpers';

/** Platform admin: header fits a phone, and the admin can change their own password. */
test('admin header fits a 390 px phone and the admin changes their password', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin@fp-exercise.test');
  await expect(page.getByRole('heading', { name: 'Praktijken', level: 1 })).toBeVisible();
  const header = (await page.locator('header').first().boundingBox())!;
  expect(header.height).toBeLessThanOrEqual(66); // one line: 64 px + border
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'screenshots/print/admin-phone.png' });

  await page.getByRole('link', { name: 'Account' }).click();
  await expect(page).toHaveURL(/\/admin\/account$/);
  await expectAccessible(page, 'admin account');
  const NEW = 'Nieuw-beheer-wachtwoord-1';
  await page.getByLabel('Huidig wachtwoord').fill(PASSWORD);
  await page.getByLabel('Nieuw wachtwoord').fill(NEW);
  await page.getByRole('button', { name: 'Wachtwoord wijzigen' }).click();
  await expect(page.getByText('Wachtwoord gewijzigd')).toBeVisible();

  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await page.waitForURL(/\/login/);
  await login(page, 'admin@fp-exercise.test', NEW);
  await expect(page).toHaveURL(/\/admin/);

  // Back to the demo password for the other specs.
  await page.goto('/admin/account');
  await page.getByLabel('Huidig wachtwoord').fill(NEW);
  await page.getByLabel('Nieuw wachtwoord').fill(PASSWORD);
  await page.getByRole('button', { name: 'Wachtwoord wijzigen' }).click();
  await expect(page.getByText('Wachtwoord gewijzigd')).toBeVisible();
});
