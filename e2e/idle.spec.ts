import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/** Staff are warned a minute before an idle logout and can stay; otherwise they are logged out. */
test('therapist: warning after 29 idle minutes, stay logged in, then logout after 30', async ({ page }) => {
  await page.clock.install();
  await login(page, 'therapeut@praktijk-a.test');
  await page.locator('h1').first().waitFor();

  await page.clock.fastForward('29:05');
  const dlg = page.getByRole('dialog', { name: 'Ben je er nog?' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText(/uitgelogd om de gegevens van patiënten te beschermen/)).toBeVisible();
  await expectAccessible(page, 'idle warning');
  await dlg.getByRole('button', { name: 'Ingelogd blijven' }).click();
  await expect(dlg).toBeHidden();
  await expect(page).toHaveURL(/\/app/);

  await page.clock.fastForward('31:00');
  await expect(page).toHaveURL(/\/login\?reden=inactief/);
  await expect(page.getByText('Je bent automatisch uitgelogd')).toBeVisible();
  expect((await page.request.get('/api/auth/me')).ok() && (await (await page.request.get('/api/auth/me')).json()).user).toBeFalsy();
});

test('activity keeps the therapist logged in', async ({ page }) => {
  await page.clock.install();
  await login(page, 'therapeut@praktijk-a.test');
  await page.locator('h1').first().waitFor();
  for (let i = 0; i < 4; i++) {
    await page.clock.fastForward('10:00');
    await page.mouse.click(5, 300);
  }
  await expect(page.getByRole('dialog', { name: 'Ben je er nog?' })).toHaveCount(0);
  await expect(page).toHaveURL(/\/app/);
});

test('patients are never logged out for inactivity', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.clock.install();
  await login(page, 'patient@praktijk-a.test');
  await page.locator('h1').first().waitFor();
  await page.clock.fastForward('02:00:00');
  await expect(page.getByRole('dialog', { name: 'Ben je er nog?' })).toHaveCount(0);
  await expect(page).toHaveURL(/\/p/);
  await ctx.close();
});
