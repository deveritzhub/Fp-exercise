import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('therapist: "What\'s new" shows the latest improvements; the "New" badge goes away once opened', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  const btn = page.getByRole('button', { name: /Wat is er nieuw\?/ });
  await expect(btn).toContainText('Nieuw');
  await btn.click();
  const dlg = page.getByRole('dialog', { name: 'Wat is er nieuw?' });
  await expect(dlg.getByText(/Klachten zoeken met Ctrl\+K/)).toBeVisible();
  await expectAccessible(page, 'whats new (staff)');
  await dlg.getByRole('listitem').filter({ hasText: 'Uitleg over een klacht naar de patiënt sturen' }).getByRole('link', { name: 'Bekijken' }).click();
  await expect(page).toHaveURL(/klachtwijzer/);
  await expect(page.getByRole('button', { name: /Wat is er nieuw\?/ })).not.toContainText('Nieuw');
});

test('patient: "What\'s new" in Settings', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/instellingen');
  await page.getByRole('button', { name: /Wat is er nieuw\?/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Wat is er nieuw?' });
  await expect(dlg.getByText(/Berichten van je praktijk/)).toBeVisible();
  await expectAccessible(page, 'whats new (patient)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await ctx.close();
});
