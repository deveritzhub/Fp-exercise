import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test.describe.configure({ mode: 'serial' });

test('quick add from a library card to an existing programme, with dose', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen?q=dead bug');
  await page.getByRole('button', { name: 'Dead bug toevoegen aan programma' }).click();
  const sheet = page.getByRole('dialog', { name: 'Toevoegen aan programma' });
  await sheet.getByRole('button', { name: 'Sets +' }).click();
  await sheet.getByRole('button', { name: 'za', exact: true }).click();
  await expectAccessible(page, 'quick add');
  await sheet.getByRole('button', { name: /Knie — patellapees/ }).click();
  await expect(page.getByText(/Toegevoegd aan “Knie — patellapees.*de patiënt krijgt een melding/)).toBeVisible();
});

test('quick add to a new programme opens the builder with the exercise and dose', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen?q=bekkenbrug');
  await page.getByRole('button', { name: 'Bekkenbrug toevoegen aan programma', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Toevoegen aan programma' });
  await sheet.getByRole('textbox', { name: 'Herhalingen' }).fill('15');
  await sheet.getByRole('button', { name: 'Nieuw programma' }).click();
  await page.waitForURL(/programmas\/nieuw\?oefening=/);
  await expect(page.getByText('Oefeningen (1)')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Herhalingen', exact: true }).first()).toHaveValue('15');
});

test('favourite gives feedback and shows up under Favourites', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen?q=muurzit');
  await page.getByRole('button', { name: 'Muurzit als favoriet bewaren' }).click();
  await expect(page.getByText('Bewaard bij je favorieten')).toBeVisible();
  await page.getByRole('button', { name: 'Zoekopdracht wissen' }).click();
  await page.getByRole('tab', { name: 'Favorieten' }).click();
  await expect(page.getByRole('heading', { name: 'Muurzit', exact: true })).toBeVisible();
});

test('search: English names, synonyms, empty state and clear', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen');
  const search = page.getByRole('searchbox', { name: 'Oefeningen zoeken' });
  await search.fill('glute bridge');
  await expect(page.getByRole('heading', { name: 'Bekkenbrug', exact: true })).toBeVisible();
  await search.fill('calf');
  await expect(page.getByRole('heading', { name: 'Hielheffen staand' })).toBeVisible();
  await search.fill('zzqqxx');
  await expect(page.getByText('Niets gevonden voor “zzqqxx”')).toBeVisible();
  await expectAccessible(page, 'library empty');
  await page.getByRole('button', { name: 'Alles wissen' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Bekkenbrug', exact: true })).toBeVisible();
});

test('filters survive opening an exercise and going back', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen');
  await page.getByRole('button', { name: 'Knie', exact: true }).click();
  await page.getByRole('combobox', { name: 'Materiaal' }).selectOption('wall');
  await expect(page.getByRole('button', { name: 'Filter Muur verwijderen' })).toBeVisible();
  await page.getByRole('link', { name: 'Muurzit', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Muurzit' })).toBeVisible();
  await expectAccessible(page, 'exercise detail');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Knie', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: 'Materiaal' })).toHaveValue('wall');
  await expectAccessible(page, 'library filtered');
});
