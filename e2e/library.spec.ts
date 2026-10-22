import { test, expect } from '@playwright/test';
import path from 'node:path';
import { login, expectAccessible } from './helpers';

test.describe.configure({ mode: 'serial' });

test('owner imports the practice library; therapists build from the phased templates', async ({ page }) => {
  await login(page, 'eigenaar@praktijk-a.test');
  await page.goto('/app/praktijk');
  await page.getByRole('tab', { name: 'Instellingen' }).click();
  await expectAccessible(page, 'practice settings');
  await page.getByLabel('Kies JSON-bestand').setInputFiles(path.join(import.meta.dirname, '../server/db/seed-data/fp-library.json'));
  await expect(page.getByText('Import gelukt')).toBeVisible();
  await expect(page.getByText(/39 oefeningen \(39 nieuw, 0 bijgewerkt\) en 16 sjablonen/)).toBeVisible();

  await page.goto('/app/oefeningen');
  await page.getByRole('searchbox', { name: 'Oefeningen zoeken' }).fill('Nordic hamstring');
  await expect(page.getByRole('link', { name: /Nordic hamstring/ }).first()).toBeVisible();

  await page.goto('/app/programmas/nieuw');
  await page.getByRole('button', { name: 'Uit sjabloon' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /VKB postoperatief, criteriegestuurd — Fase 1/ }).first().click();
  await expect(page.getByText(/Uit het sjabloon: criteria, rode vlaggen/)).toBeVisible();
  await expect(page.getByText(/Criteria voor Fase 2/)).toBeVisible();
  await expect(page.getByText(/Oefeningen \(4\)/)).toBeVisible();
});
