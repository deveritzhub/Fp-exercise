import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('patient logs protein and an own workout and sees the XP', async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  const before = await (await pp.request.get('/api/patient/hero')).json();

  await pp.goto('/p/logboek');
  await expect(pp.getByRole('heading', { name: 'Logboek' })).toBeVisible();
  await pp.getByLabel('Dagelijks doel (g)').fill('40');
  await pp.getByRole('button', { name: 'Doel instellen' }).click();
  await expect(pp.getByText('nog 40 g')).toBeVisible();

  await pp.getByRole('textbox', { name: 'Grammen toevoegen' }).fill('40');
  await pp.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await expect(pp.getByText('Doel gehaald').first()).toBeVisible();
  await expect(pp.getByRole('progressbar', { name: 'Eiwit vandaag' }).first()).toHaveAttribute('aria-valuenow', '100');

  await pp.getByRole('radio', { name: 'Wandelen' }).check();
  await pp.getByRole('textbox', { name: 'Minuten', exact: true }).fill('20');
  await pp.getByRole('group', { name: /Pijn tijdens de training/ }).getByRole('button', { name: '2', exact: true }).click();
  await pp.getByRole('button', { name: 'Training opslaan' }).click();
  await expect(pp.getByRole('list', { name: 'Gelogde trainingen' }).getByText(/Wandelen/)).toBeVisible();

  const after = await (await pp.request.get('/api/patient/hero')).json();
  expect(after.logs.protein.hit).toBe(true);
  expect(after.skills.find((k: { key: string }) => k.key === 'discipline').xp).toBeGreaterThan(before.skills.find((k: { key: string }) => k.key === 'discipline').xp);
  expect(after.skills.find((k: { key: string }) => k.key === 'endurance').xp).toBeGreaterThan(before.skills.find((k: { key: string }) => k.key === 'endurance').xp);
  expect(after.skills.find((k: { key: string }) => k.key === 'recovery').xp).toBeGreaterThan(before.skills.find((k: { key: string }) => k.key === 'recovery').xp);
  expect(after.level.xp).toBeGreaterThan(before.level.xp);
  expect(after.skills).toHaveLength(9);

  await pp.goto('/p');
  await expect(pp.getByRole('link', { name: /Logboek/ })).toBeVisible();
  await expect(pp.getByText('Eiwit 40 van 40 g').first()).toBeVisible();

  await pp.goto('/p/logboek');
  expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await expectAccessible(pp, 'logbook');
  await pp.screenshot({ path: 'screenshots/hero/logbook.png', fullPage: true });
  await ctx.close();
});
