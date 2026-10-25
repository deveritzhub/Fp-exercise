import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/** Patient text size: larger text everywhere in the app, no sideways scrolling, kept after reload. */
test('patient sets extra large text; every screen still fits a 360 px phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  const home = await (await page.request.get('/api/patient/home')).json();
  const id = home.programs[0].id as string;

  await page.goto('/p/account');
  const group = page.getByRole('radiogroup', { name: 'Tekstgrootte' });
  await expect(group.getByRole('radio', { name: 'Normaal' })).toHaveAttribute('aria-checked', 'true');
  const before = (await page.getByRole('heading', { name: 'Tekstgrootte' }).boundingBox())!.height;
  await group.getByRole('radio', { name: 'Extra groot' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'xlarge');
  const after = (await page.getByRole('heading', { name: 'Tekstgrootte' }).boundingBox())!.height;
  expect(after).toBeGreaterThan(before * 1.15);
  await expectAccessible(page, 'text size setting');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'xlarge');
  for (const url of ['/p', `/p/programma/${id}`, '/p/voortgang', '/p/account']) {
    await page.goto(url);
    await page.locator('h1').first().waitFor();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), url).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: 'screenshots/print/patient-home-xlarge.png', fullPage: true });

  await page.goto('/p/account');
  await page.getByRole('radiogroup', { name: 'Tekstgrootte' }).getByRole('radio', { name: 'Normaal' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-text-size', /.+/);
  await ctx.close();
});

test('the therapist app is not affected by a patient text size on the same device', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fp.textSize', 'xlarge'));
  await login(page, 'therapeut@praktijk-a.test');
  await page.locator('h1').first().waitFor();
  await expect(page.locator('html')).not.toHaveAttribute('data-text-size', /.+/);
});
