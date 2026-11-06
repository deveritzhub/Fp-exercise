import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('therapist sends a muscle card; the patient opens it from Vandaag, with the question of the day', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pro = await ctx.newPage();
  await login(pro, 'therapeut@praktijk-a.test');
  await pro.goto('/app/spieren?spier=gluteus_medius');
  await pro.getByRole('button', { name: 'Stuur naar patiënt' }).click();
  const dlg = pro.getByRole('dialog', { name: /Stuur "Middelste bilspier" naar een patiënt/ });
  await dlg.getByLabel('Patiënt').selectOption({ label: 'Emma de Jong' });
  await dlg.getByLabel(/Korte toelichting/).fill('Deze trainen we met de schelp.');
  await expectAccessible(pro, 'send muscle dialog');
  await dlg.getByRole('button', { name: 'Versturen' }).click();
  await expect(pro.getByText('Verstuurd: de patiënt ziet het op Vandaag')).toBeVisible();
  await ctx.close();

  const pctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const p = await pctx.newPage();
  await login(p, 'patient@praktijk-a.test');
  await p.goto('/p');
  const msg = p.locator('div', { hasText: 'Lees over de middelste bilspier' }).filter({ has: p.getByRole('link', { name: 'Bekijken' }) }).last();
  await expect(msg.getByText('Deze trainen we met de schelp.')).toBeVisible();
  // Question of the day on Vandaag.
  await expect(p.getByRole('heading', { level: 2 }).filter({ hasText: /\?$/ }).first()).toBeVisible();
  await expect(p.getByText('Vraag van de dag')).toBeVisible();
  await expectAccessible(p, 'patient home with message and question of the day');
  await msg.getByRole('link', { name: 'Bekijken' }).click();
  await expect(p).toHaveURL(/\/p\/spieren\?tab=spieren&open=gluteus_medius/);
  await expect(p.getByRole('button', { name: /Middelste bilspier/, expanded: true })).toBeVisible();
  await pctx.close();
});

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
  // Antagonist with the balance of strength exercises, and the nerve as a link.
  await expect(page.getByText(/Krachtoefeningen: \d+ hier, \d+ voor de hamstrings/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'n. femoralis' }).first()).toHaveAttribute('href', '/app/spieren?tab=zenuwen&zenuw=femoralis');
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
