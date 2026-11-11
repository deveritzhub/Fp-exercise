import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('the hero follows weight, height and body fat', async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'nl-NL' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  await pp.goto('/p/held/uiterlijk');
  await pp.getByLabel(/Gewicht \(kg\)/).fill('95');
  await pp.getByLabel(/Lengte \(cm\)/).fill('180');
  await pp.getByLabel(/Lichaamsvet/).fill('12');
  await expect(pp.getByText(/Lichaamsbouw van je held: Gespierd/)).toBeVisible();
  await expect(pp.getByText(/Je bouw volgt nu je eigen maten/)).toBeVisible();
  const preview = pp.getByRole('img', { name: /Voorbeeld van/ });
  await preview.screenshot({ path: 'screenshots/hero/body-muscular.png' });
  await pp.getByLabel(/Lichaamsvet/).fill('32');
  await expect(pp.getByText(/Lichaamsbouw van je held: (Iets voller|Voller)/)).toBeVisible();
  await preview.screenshot({ path: 'screenshots/hero/body-fuller.png' });
  // Without body fat it is estimated from BMI.
  await pp.getByLabel(/Lichaamsvet/).fill('');
  await expect(pp.getByText(/geschat uit BMI/)).toBeVisible();
  await expectAccessible(pp, 'body measurements');
  await ctx.close();
});

test('long pages fold into short summaries and remember it', async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.goto('/p/held');
  const skills = pp.getByRole('button', { name: /^Skills Totaal level \d+/ });
  await expect(skills).toHaveAttribute('aria-expanded', 'false');
  await expect(pp.getByRole('button', { name: /^Badges \d+ van \d+ behaald/ })).toBeVisible();
  await pp.screenshot({ path: 'screenshots/hero/folded.png', fullPage: true });
  await expectAccessible(pp, 'folded hero page');
  await skills.click();
  await expect(pp.getByRole('heading', { name: 'Skills' })).toBeVisible();
  await pp.reload();
  await expect(pp.getByRole('heading', { name: 'Skills' })).toBeVisible();
  await pp.getByRole('button', { name: 'Skills inklappen' }).click();
  await expect(pp.getByRole('button', { name: /^Skills Totaal level/ })).toHaveAttribute('aria-expanded', 'false');
  await ctx.close();
});
