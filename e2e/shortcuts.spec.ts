import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('therapist keyboard shortcuts: overview under ?, single keys navigate, never while typing', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await expect(page.getByRole('heading', { name: /Goede(morgen|middag|navond)/ })).toBeVisible();
  await page.keyboard.press('?');
  const dlg = page.getByRole('dialog', { name: 'Sneltoetsen' });
  await expect(dlg).toBeVisible();
  await expectAccessible(page, 'shortcuts');
  // Keys do nothing while a dialog is open.
  await page.keyboard.press('p');
  await expect(page).toHaveURL(/\/app$/);
  await page.keyboard.press('Escape');
  await page.keyboard.press('p');
  await expect(page).toHaveURL(/\/app\/patienten$/);
  await page.keyboard.press('k');
  await expect(page).toHaveURL(/\/app\/klachtwijzer$/);
  // Typing a "d" in a search field does not navigate.
  await page.getByLabel('Klacht zoeken').fill('d');
  await expect(page).toHaveURL(/\/app\/klachtwijzer/);
  await page.getByRole('heading', { name: 'Klachtwijzer', level: 1 }).click();
  await page.keyboard.press('d');
  await expect(page).toHaveURL(/\/app$/);
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog').first()).toBeVisible();
});
