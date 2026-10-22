import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test.describe.configure({ mode: 'serial' });

test('therapist sends feedback; the practice owner reads it', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.getByRole('button', { name: 'Feedback geven' }).click();
  const dialog = page.getByRole('dialog', { name: 'Wat vind je ervan?' });
  await dialog.getByRole('radio', { name: 'Idee' }).click();
  await expect(dialog.getByRole('radio', { name: 'Idee' })).toHaveAttribute('aria-checked', 'true');
  await dialog.getByLabel('Je bericht').fill('E2E: graag een snelkoppeling naar sjablonen');
  await expectAccessible(page, 'feedback dialog');
  await dialog.getByRole('button', { name: 'Versturen' }).click();
  await expect(page.getByText('Bedankt! Je feedback is verstuurd.')).toBeVisible();

  await page.context().clearCookies();
  await login(page, 'eigenaar@praktijk-a.test');
  await page.goto('/app/praktijk');
  await page.getByRole('tab', { name: 'Feedback' }).click();
  const item = page.getByRole('listitem').filter({ hasText: 'E2E: graag een snelkoppeling naar sjablonen' });
  await expect(item.getByText('Idee', { exact: true })).toBeVisible();
});

test('patient trains without internet; the workout is sent once back online', async ({ page, context }) => {
  await login(page, 'patient@praktijk-b.test');
  const home = await (await page.request.get('/api/patient/home')).json();
  const before = (await (await page.request.get('/api/patient/history')).json()).sessions.length;
  const programId = home.programs[0].id;

  await page.goto(`/p/sessie/${programId}`);
  await expect(page.getByRole('button', { name: /Beginnen|Verder met training/ })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: /Beginnen|Verder met training/ }).click();

  await page.getByRole('button', { name: 'Oefening gedaan' }).click();
  await page.getByRole('button', { name: 'Opslaan en verder' }).click();
  for (let i = 0; i < 20; i++) {
    if (await page.getByRole('button', { name: 'Training afronden' }).isVisible()) break;
    await page.getByRole('button', { name: 'Overslaan' }).click();
  }
  await page.getByRole('button', { name: 'Training afronden' }).click();
  await expect(page.getByText(/Houd de app open: je training wordt automatisch verstuurd/)).toBeVisible();
  // Nothing about the workout is stored on the device.
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/pain|sessions/);

  await page.getByRole('button', { name: 'Terug naar overzicht' }).click();
  await expect(page.getByText(/Geen internet/)).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/Geen internet/)).toBeHidden();
  await expect(page.getByText(/Je training wordt verstuurd/)).toBeHidden();
  await expect.poll(async () => (await (await page.request.get('/api/patient/history')).json()).sessions.length).toBe(before + 1);
});

test('patient sees the reminder option (needs the installed app on iPhone)', async ({ page }) => {
  await login(page, 'patient@praktijk-b.test');
  await expect(page.getByText('Wil je een herinnering?')).toBeVisible();
  await page.goto('/p/account');
  await expect(page.getByRole('heading', { name: 'Herinnering' })).toBeVisible();
  await expectAccessible(page, 'patient account');
});
