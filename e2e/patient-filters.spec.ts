import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('patients list: quick filters with counts', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/patienten');
  const filters = page.getByRole('group', { name: 'Snelfilters' });
  await expect(filters.getByRole('button', { name: /^Alle/ })).toHaveAttribute('aria-pressed', 'true');
  const rows = page.getByRole('table').getByRole('row');
  const total = (await rows.count()) - 1;
  // Each filter shows its count, and the table shows exactly that many patients (or the empty note).
  for (const name of ['Vraagt aandacht', 'Nog niet uitgenodigd', 'Uitnodiging open', 'Geen programma']) {
    const chip = filters.getByRole('button', { name: new RegExp(`^${name}`) });
    const n = Number((await chip.innerText()).match(/(\d+)\s*$/)![1]);
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    if (n === 0) await expect(page.getByText('Niemand in dit filter')).toBeVisible();
    else await expect(rows).toHaveCount(n + 1);
    expect(n).toBeLessThanOrEqual(total);
  }
  await expectAccessible(page, 'patient quick filters');
  await page.goto('/app/patienten?filter=no_program');
  await expect(filters.getByRole('button', { name: /^Geen programma/ })).toHaveAttribute('aria-pressed', 'true');
});

test('empty results always offer one clear way back', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/programmas');
  // Templates: nothing found → clear search and filters.
  const tpl = page.getByLabel('Sjablonen zoeken');
  await tpl.fill('zzzz-bestaat-niet');
  await expect(page.getByText('Geen sjablonen gevonden')).toBeVisible();
  await page.getByRole('button', { name: 'Wis zoeken en filters' }).click();
  await expect(tpl).toHaveValue('');
  await expect(page.getByText('Geen sjablonen gevonden')).toHaveCount(0);
  // Patient programmes: the same.
  await page.getByRole('tab', { name: 'Patiëntprogramma’s' }).click();
  const search = page.getByLabel('Zoek op programma of patiënt');
  await search.fill('zzzz-bestaat-niet');
  await expect(page.getByText('Geen programma’s gevonden')).toBeVisible();
  await page.getByRole('button', { name: 'Wis zoeken en filters' }).click();
  await expect(search).toHaveValue('');
});
