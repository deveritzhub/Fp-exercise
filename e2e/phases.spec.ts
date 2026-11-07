import { test, expect } from '@playwright/test';
import path from 'node:path';
import { login, expectAccessible } from './helpers';

test.describe.configure({ mode: 'serial' });

test('programmes: filter per module, open a series, pick a phase and see criteria with tests', async ({ page }) => {
  await login(page, 'eigenaar@praktijk-a.test');
  await page.goto('/app/praktijk');
  await page.getByRole('tab', { name: 'Instellingen' }).click();
  await page.getByLabel('Kies JSON-bestand').setInputFiles(path.join(import.meta.dirname, '../server/db/seed-data/fp-app-update.json'));
  await expect(page.getByText(/68 oefeningen .* en 22 sjablonen/)).toBeVisible();

  await page.goto('/app/programmas');
  await page.getByRole('button', { name: /^Kracht/ }).click();
  await expect(page.getByRole('link', { name: 'Push Pull Legs, 3 dagen per week' })).toBeVisible();
  await expect(page.getByText('Achillespees belastingsprogramma')).toHaveCount(0);
  await page.getByRole('button', { name: /^Revalidatie/ }).click();
  await page.getByRole('button', { name: /Achillespees belastingsprogramma/ }).click();
  await page.getByRole('tab', { name: /Fase 2/ }).click();
  await expect(page.getByText('Criteria voor Fase 3')).toBeVisible();
  await expect(page.getByText(/Eenbenige kuitheffen/).first()).toBeVisible();
  await expect(page.getByText('Rode vlaggen — stoppen en contact')).toBeVisible();
  await expectAccessible(page, 'programmes phases');

  // Search across criteria and tests too.
  await page.getByRole('searchbox', { name: 'Sjablonen zoeken' }).fill('goniometer');
  await expect(page.getByRole('button', { name: /VKB postoperatief/ })).toBeVisible();
});

test('use a phase for a patient, tick criteria (name + date) and prepare the next phase', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  const tpls = (await (await page.request.get('/api/programs/templates')).json()).items;
  const fase1 = tpls.find((p: any) => p.series?.key === 'tpl_achilles_12w' && p.series.phaseNo === 1);
  const patients = (await (await page.request.get('/api/patients?q=emma')).json()).items;
  await page.goto(`/app/programmas/nieuw?sjabloon=${fase1.id}&patient=${patients[0].id}`);
  await expect(page.getByText('Fase 1 van 3 · week 1-4')).toBeVisible();
  await expect(page.getByText('Na opslaan kun je deze criteria per patiënt afvinken.')).toBeVisible();
  await page.getByRole('button', { name: 'Opslaan & toewijzen' }).click();
  await page.waitForURL(/\/app\/programmas\/[0-9a-f-]{36}$/);
  await page.getByRole('checkbox', { name: /Pijn tijdens isometrie/ }).click();
  await expect(page.getByRole('checkbox', { name: /Pijn tijdens isometrie/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/✓ Joris Bakker/)).toBeVisible();
  await expect(page.getByText('1/3', { exact: true }).first()).toBeVisible();
  await expectAccessible(page, 'patient programme criteria');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Fase 2 klaarzetten' }).click();
  await page.waitForURL(/programmas\/nieuw\?sjabloon=.*&patient=/);
  await expect(page.getByText('Fase 2 van 3 · week 5-8')).toBeVisible();
});
