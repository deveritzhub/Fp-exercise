import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('therapist: "What\'s new" shows the latest improvements; the "New" badge goes away once opened', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  const btn = page.getByRole('button', { name: /Wat is er nieuw\?/ });
  await expect(btn).toContainText('Nieuw');
  await btn.click();
  const dlg = page.getByRole('dialog', { name: 'Wat is er nieuw?' });
  await expect(dlg.getByText(/Snelfilters in de patiëntenlijst/)).toBeVisible();
  await expectAccessible(page, 'whats new (staff)');
  await dlg.getByRole('listitem').filter({ hasText: 'Snelfilters in de patiëntenlijst' }).getByRole('link', { name: 'Bekijken' }).click();
  await expect(page).toHaveURL(/patienten/);
  await expect(page.getByRole('button', { name: /Wat is er nieuw\?/ })).not.toContainText('Nieuw');
});

test('patient: "What\'s new" in Settings', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/instellingen');
  await page.getByRole('button', { name: /Wat is er nieuw\?/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Wat is er nieuw?' });
  await expect(dlg.getByText(/Lees voor/)).toBeVisible();
  await expectAccessible(page, 'whats new (patient)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  // The full history, from the first version, with dates.
  await dlg.getByRole('link', { name: 'Alle versies sinds de eerste, met datum' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Versiegeschiedenis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Eerste versie' })).toBeVisible();
  await expect(page.getByText('donderdag 22 oktober 2026')).toBeVisible();
  await expectAccessible(page, 'version history');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await ctx.close();
});

test('after an update: a one-time notice says the app was updated and opens the list', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  // Someone who used an earlier version.
  await page.evaluate(() => localStorage.setItem('fp.whatsnew.v1', '2026-01-01'));
  await page.goto('/p');
  const notice = page.getByRole('status').filter({ hasText: 'FP Flow is bijgewerkt.' });
  await expect(notice).toBeVisible();
  await expectAccessible(page, 'update notice');
  await notice.getByRole('button', { name: 'Bekijk' }).click();
  const dlg = page.getByRole('dialog', { name: 'Wat is er nieuw?' });
  await expect(dlg).toContainText('Versie van');
  await dlg.getByRole('button', { name: /Sluiten/ }).first().click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('FP Flow is bijgewerkt.')).toHaveCount(0);
  // A first visit never shows the notice.
  await page.evaluate(() => localStorage.removeItem('fp.whatsnew.v1'));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('FP Flow is bijgewerkt.')).toHaveCount(0);
  await ctx.close();
});
