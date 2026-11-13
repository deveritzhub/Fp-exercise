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

/** Staff on foot: from the practice into the street of homes, the record at a door and a look inside. */
test('therapist walks from the practice to a patient home and looks inside', async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/dorp');
  await page.getByTestId('toggle-walk').click();
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(village).toHaveAttribute('data-zone', 'practice');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/tw-0.png' });

  // Out of the practice: at the exit the door opens by itself.
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 60_000 });
  if (process.env.SHOTS) { await page.waitForTimeout(1500); await page.screenshot({ path: process.env.SHOTS + '/tw-1.png' }); }

  // To a home: numbered, no name; at the door the record and the way in.
  await page.getByRole('button', { name: 'Loop naar Huisje 1', exact: true }).press('Enter');
  const record = page.getByTestId('walk-record');
  await expect(record).toBeVisible({ timeout: 90_000 });
  await expect(record).toHaveAttribute('href', /\/app\/patienten\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId('home-panel')).toContainText('Huisje 1');
  for (const name of ['Emma', 'de Jong']) await expect(page.getByRole('main')).not.toContainText(name);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/tw-2.png' });

  await page.getByTestId('enter-home').click();
  await expect(village).toHaveAttribute('data-zone', 'home', { timeout: 30_000 });
  await expect(page.getByTestId('visit-note')).toContainText('Binnen bij Huisje 1');
  if (process.env.SHOTS) { await page.waitForTimeout(1500); await page.screenshot({ path: process.env.SHOTS + '/tw-3.png' }); }
  await page.getByTestId('leave-home').click();
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 60_000 });
  await expect(page.getByTestId('visit-note')).toHaveCount(0);
});
