import { test, expect } from '@playwright/test';
import { login, PASSWORD, expectAccessible } from './helpers';

test('first use: a four-step welcome on Vandaag, once per device', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, locale: 'nl-NL' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test', PASSWORD, { welcomeTour: true });
  await page.goto('/p');
  const tour = page.getByRole('dialog', { name: /Welkom bij FP Flow · 1\/4/ });
  await expect(tour).toBeVisible();
  await expect(tour.getByText('Vandaag', { exact: true })).toBeVisible();
  await expectAccessible(page, 'welcome tour');
  for (const [n, title] of [[2, 'De plusknop'], [3, 'Je held'], [4, 'Instellingen']] as const) {
    await page.getByRole('button', { name: 'Volgende' }).click();
    await expect(page.getByRole('dialog', { name: new RegExp(`Welkom bij FP Flow · ${n}/4`) }).getByText(title, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Aan de slag' }).click();
  await expect(page.getByRole('dialog', { name: /Welkom bij FP Flow/ })).toHaveCount(0);
  // Once per device.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Welkom bij FP Flow/ })).toHaveCount(0);
  await ctx.close();
});

test('the welcome can be skipped at once', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-b.test', PASSWORD, { welcomeTour: true });
  await page.goto('/p');
  await page.getByRole('button', { name: 'Overslaan' }).click();
  await expect(page.getByRole('dialog', { name: /Welkom bij FP Flow/ })).toHaveCount(0);
  await ctx.close();
});
