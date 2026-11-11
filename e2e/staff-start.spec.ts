import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('new therapist: "Get started" on the dashboard ticks off the complaint guide once opened', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  const card = page.getByRole('region', { name: 'Aan de slag' });
  await expect(card).toBeVisible();
  await expectAccessible(page, 'staff get started');
  await card.getByRole('link', { name: /Bekijk de klachtwijzer/ }).click();
  await expect(page.getByRole('heading', { name: 'Klachtwijzer', level: 1 })).toBeVisible();
  await page.goto('/app');
  // Either the guide step is ticked, or everything is done and the card is gone.
  await expect(page.getByRole('link', { name: /Bekijk de klachtwijzer/ })).toHaveCount(0);
});

test('"Get started" can be hidden', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.getByRole('button', { name: 'Aan de slag verbergen' }).click();
  await expect(page.getByRole('region', { name: 'Aan de slag' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Goede(morgen|middag|navond)/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Aan de slag' })).toHaveCount(0);
});
