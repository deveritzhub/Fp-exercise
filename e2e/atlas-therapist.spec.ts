import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('therapist atlas: muscle card with exercises to add, library gaps, filter and links both ways', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/spieren');
  await expect(page.getByRole('heading', { name: 'Spierenatlas', level: 1 })).toBeVisible();

  await page.getByPlaceholder(/Zoek spier of beweging/).fill('vierhoofdige');
  await page.getByRole('button', { name: /Vierhoofdige dijspier/ }).click();
  await expect(page.getByText('n. femoralis').first()).toBeVisible();
  // One tap opens the quick add sheet (dose and programme choice) for that exercise.
  await page.getByRole('button', { name: /toevoegen aan programma$/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  // The sticky header covers scrolled-past buttons; check from the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectAccessible(page, 'therapist atlas muscle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'screenshots/atlas/therapist.png', fullPage: true });

  // Gaps: muscles without a strength or stretch exercise; a new exercise is prefilled.
  await page.getByPlaceholder(/Zoek spier of beweging/).fill('');
  await page.getByRole('button', { name: /Gaten in je bibliotheek/ }).click();
  const card = page.locator('li[id^="spier-"]').first();
  await card.getByRole('button').first().click();
  const create = card.getByRole('link', { name: 'Nieuwe oefening maken' }).first();
  const href = await create.getAttribute('href');
  expect(href).toMatch(/\/app\/oefeningen\/nieuw\?spier=.+&regio=.+&soort=/);
  await create.click();
  await expect(page).toHaveURL(/\/app\/oefeningen\/nieuw/);
  const spier = new URL(href!, 'http://x').searchParams.get('spier')!;
  await expect(page.getByLabel(/Doelspieren/)).toHaveValue(spier);

  // Library filtered on a muscle, and back to the atlas from an exercise.
  await page.goto('/app/oefeningen?muscle=quadriceps');
  await expect(page.getByText(/^Spier: Vierhoofdige dijspier/)).toBeVisible();
  await page.locator('a[href^="/app/oefeningen/"]').filter({ hasNotText: /Nieuw|Eigen/ }).first().click();
  const chip = page.getByRole('link', { name: 'Vierhoofdige dijspier' });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page).toHaveURL(/\/app\/spieren\?spier=quadriceps/);
  await expect(page.getByRole('button', { name: /Vierhoofdige dijspier/, expanded: true })).toBeVisible();
});
