import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** Staff: the practice as a village, one numbered home per patient, growing with the hero's level. */
test('therapist sees a home per patient without names and opens the record from it', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page, 'therapeut@praktijk-a.test');
  await page.getByRole('link', { name: 'Dorp' }).first().click();
  await expect(page).toHaveURL(/\/app\/dorp$/);
  await expect(page.getByTestId('practice-village')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });

  // One home per patient of this therapist, by number; no patient name anywhere on the page.
  const list = page.getByTestId('home-list').getByRole('button');
  await expect(list.first()).toContainText('Huisje 1');
  expect(await list.count()).toBeGreaterThan(1);
  const main = page.getByRole('main');
  for (const name of ['Emma', 'de Jong', 'Mila', 'de Vries', 'Daan', 'Lucas']) await expect(main).not.toContainText(name);

  // A home in the scene is a real button; picking it shows its level and the way to the record.
  await page.getByRole('button', { name: /^Huisje 1 · lv/ }).press('Enter');
  const panel = page.getByTestId('home-panel');
  await expect(panel).toContainText('Huisje 1');
  await expect(panel).toContainText(/level \d+/);
  await expect(panel.getByRole('link', { name: 'Open het dossier' })).toHaveAttribute('href', /\/app\/patienten\/[0-9a-f-]{36}$/);
  await expectAccessible(page, 'practice village');

  // Names are off until asked for; switched on, the home says whose it is.
  await expect(page.getByTestId('home-name')).toHaveCount(0);
  await page.getByTestId('toggle-names').click();
  await expect(page.getByTestId('home-name')).toHaveText(/\S+ \S+/);
  await expect(page.getByTestId('home-list')).toContainText('Emma de Jong');
  await expectAccessible(page, 'practice village with names');
  await page.getByTestId('toggle-names').click();
  await expect(page.getByTestId('home-name')).toHaveCount(0);
  await expect(main).not.toContainText('Emma');

  // The example shows every kind of home, is marked as made up and has no record behind it.
  await page.getByRole('button', { name: 'Voorbeeld: alle soorten huisjes' }).click();
  await expect(page.getByTestId('sample-notice')).toBeVisible();
  await page.getByTestId('home-list').getByRole('button').nth(11).click();
  await expect(panel).toContainText('Villa');
  await expect(panel.getByRole('link', { name: 'Open het dossier' })).toHaveCount(0);

  // The record itself still opens for this therapist.
  await page.getByRole('button', { name: 'Terug naar mijn patiënten' }).click();
  await list.first().click();
  await panel.getByRole('link', { name: 'Open het dossier' }).click();
  await expect(page).toHaveURL(/\/app\/patienten\/[0-9a-f-]{36}/);
});
