import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('new people see five first steps on Vandaag; done ones are ticked and the list can be hidden', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, locale: 'nl-NL' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-b.test');
  await page.goto('/p');
  const card = page.getByRole('region', { name: 'Eerste stappen' });
  await expect(card).toBeVisible();
  await expect(card.getByText(/van 5 gedaan/)).toBeVisible();
  // Steps still to do link to where you do them.
  await expect(card.getByRole('link', { name: /Meet je mobiliteit/ })).toHaveAttribute('href', '/p/mobiliteit/meten');
  await expectAccessible(page, 'first steps');
  await card.getByRole('button', { name: 'Eerste stappen verbergen' }).click();
  await expect(page.getByRole('region', { name: 'Eerste stappen' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Eerste stappen' })).toHaveCount(0);
  await ctx.close();
});

test('after three workouts the app asks once for feedback', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test', undefined, { feedbackNudge: true });
  await page.goto('/p');
  const card = page.getByRole('region', { name: /Wat vind je van de app\?/ });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Laat het weten' }).click();
  const dlg = page.getByRole('dialog', { name: 'Wat vind je ervan?' });
  await expect(dlg.getByRole('radio', { name: 'Idee' })).toHaveAttribute('aria-checked', 'true');
  await dlg.getByRole('button', { name: 'Annuleren' }).click();
  await card.getByRole('button', { name: 'Nu niet' }).click();
  await expect(page.getByRole('region', { name: /Wat vind je van de app\?/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: /Wat vind je van de app\?/ })).toHaveCount(0);
  await ctx.close();
});
