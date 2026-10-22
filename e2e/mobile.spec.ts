import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

test('marketing site navigation on mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Prijzen' }).last().click();
  await expect(page.getByRole('heading', { level: 1, name: /Eenvoudige prijzen/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('patient app on a phone: home, programme, progress', async ({ page }) => {
  await login(page, 'patient@praktijk-a.test');
  await expect(page.getByRole('heading', { name: /Emma/ })).toBeVisible();
  await page.getByRole('link', { name: /Knie — patellapees/ }).last().click();
  await expect(page.getByText('Van je fysiotherapeut')).toBeVisible();
  await expectAccessible(page, 'patient-program');
  await page.goto('/p/voortgang');
  await expect(page.getByRole('heading', { name: 'Mijn voortgang' })).toBeVisible();
  await expectAccessible(page, 'patient-progress');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('therapist workspace is usable on a phone', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.getByRole('button', { name: 'Menu openen' }).click();
  await page.getByRole('link', { name: 'Oefeningen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Oefenbibliotheek' })).toBeVisible();
});
