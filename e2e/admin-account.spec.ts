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

test('new practice form: slug becomes lowercase while typing; errors name the field', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin@fp-exercise.test');
  await page.getByRole('button', { name: 'Nieuwe praktijk' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe praktijk' });
  await dlg.getByLabel('Praktijknaam').fill('Fp Training Één');
  await expect(dlg.getByLabel('Slug')).toHaveValue('fp-training-een');
  await dlg.getByLabel('Slug').fill('Fp');
  await expect(dlg.getByLabel('Slug')).toHaveValue('fp');
  await dlg.getByLabel('Naam eigenaar').fill('Test Eigenaar');
  await dlg.getByLabel('E-mail eigenaar').fill('eigenaar@fp-training.test');
  await page.getByRole('button', { name: 'Aanmaken' }).click();
  await expect(page.getByText('Praktijk aangemaakt, eigenaar uitgenodigd')).toBeVisible();

  // Same slug again: the message says what is wrong.
  await page.getByRole('button', { name: 'Nieuwe praktijk' }).click();
  await dlg.getByLabel('Praktijknaam').fill('Nog een');
  await dlg.getByLabel('Slug').fill('fp');
  await dlg.getByLabel('Naam eigenaar').fill('Test Eigenaar');
  await dlg.getByLabel('E-mail eigenaar').fill('ander@fp-training.test');
  await page.getByRole('button', { name: 'Aanmaken' }).click();
  await expect(dlg.getByText('Deze praktijk-URL is al in gebruik.')).toBeVisible();
  await expectAccessible(page, 'new practice error');
});
