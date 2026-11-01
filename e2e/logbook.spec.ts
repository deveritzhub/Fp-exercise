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
  await expect(pp.getByText('Koppelen staat op deze server nog uit').or(pp.getByRole('link', { name: 'Koppel Google Health' }))).toBeVisible();
  await pp.getByLabel('Dagelijks doel', { exact: true }).fill('1000');
  await Promise.all([
    pp.waitForResponse((r) => r.url().includes('/api/patient/logs/steps/goal') && r.ok()),
    pp.locator('#stappen').getByRole('button', { name: 'Doel bijwerken' }).click(),
  ]);
  await pp.getByRole('textbox', { name: 'Stappen vandaag' }).fill('1000');
  await Promise.all([
    pp.waitForResponse((r) => r.url().endsWith('/api/patient/logs/steps') && r.request().method() === 'PUT' && r.ok()),
    pp.getByRole('button', { name: 'Zelf invullen' }).click(),
  ]);
  await expect(pp.locator('#stappen').getByText('Doel gehaald')).toBeVisible();

  // Weight → personal levels → choose "Minimaal" → log protein with the quick buttons.
  await pp.locator('#gewicht').getByRole('textbox', { name: 'Gewicht in kg' }).fill('60');
  await pp.getByRole('button', { name: 'Gewicht opslaan' }).click();
  await expect(pp.getByText(/Optimaal eiwit voor jou: 95 g/)).toBeVisible();
  const levels = pp.getByRole('radiogroup', { name: 'Kies je dagdoel' });
  await expect(levels.getByRole('radio')).toHaveCount(3);
  await levels.getByRole('radio', { name: /Minimaal/ }).click();
  await expect(levels.getByRole('radio', { name: /Minimaal/ })).toHaveAttribute('aria-checked', 'true');
  await pp.locator('#eiwit').getByRole('button', { name: '30 g', exact: true }).click();
  await expect(pp.getByText(/\+30 g eiwit/)).toBeVisible();
  await pp.locator('#eiwit').getByRole('button', { name: /Magere kwark/ }).click();
  await expect(pp.getByText(/\+22 g · Minimaal bereikt!/)).toBeVisible();
  await expect(pp.locator('#eiwit').getByRole('img', { name: /Eiwit vandaag: 52 gram/ })).toBeVisible();

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
  expect(after.skills).toHaveLength(10); // incl. Kennis (binnenkort)

  await pp.goto('/p');
  await expect(pp.getByRole('link', { name: /Logboek/ })).toBeVisible();
  await expect(pp.getByText(/Eiwit 52 van 50 g/).first()).toBeVisible();

  await pp.goto('/p/logboek');
  expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await expectAccessible(pp, 'logbook');
  await pp.screenshot({ path: 'screenshots/hero/logbook.png', fullPage: true });
  await ctx.close();
});
