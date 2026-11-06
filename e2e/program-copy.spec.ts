import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('copy a programme to another patient as a draft', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  const r = await (await page.request.get('/api/programs/overview?q=Patellapees&status=active&therapist=all')).json();
  const src = r.items[0] as { id: string; title: string };
  await page.goto(`/app/programmas/${src.id}`);
  await page.getByRole('button', { name: 'Meer', exact: true }).click();
  await page.getByRole('button', { name: 'Kopiëren naar andere patiënt…' }).click();
  const dlg = page.getByRole('dialog', { name: 'Kopiëren naar andere patiënt' });
  await expect(dlg.getByRole('button', { name: 'Kopiëren' })).toBeDisabled();
  const select = dlg.getByLabel('Patiënt');
  const options = await select.locator('option').allInnerTexts();
  expect(options.some((o) => /Jong, Emma/.test(o))).toBe(false); // not to the same patient
  await select.selectOption({ index: 1 });
  await expectAccessible(page, 'copy to patient');
  await dlg.getByRole('button', { name: 'Kopiëren' }).click();
  await expect(page.getByText(/Kopie gemaakt voor .* \(concept\)/)).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(src.id));
  const copyId = page.url().split('/').pop()!;
  await expect(page.getByText('Concept').first()).toBeVisible();
  // Clean up.
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  await db.query('DELETE FROM programs WHERE id = $1', [copyId]);
  await db.end();
});

test('patient: the coming week, folded on Today', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p');
  const week = page.locator('details', { hasText: 'Komende week' });
  await expect(week).toBeVisible();
  await expect(week.getByText(/van de 7 dagen trainen/)).toBeVisible();
  await week.locator('summary').click();
  await expect(week.getByRole('listitem')).toHaveCount(7);
  await expect(week.getByText('Morgen')).toBeVisible();
  await expectAccessible(page, 'week ahead');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await ctx.close();
});
