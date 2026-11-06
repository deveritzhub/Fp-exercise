import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

test('the + button logs protein and weight from anywhere', async ({ browser }) => {
  test.setTimeout(90_000);
  await sql(`DELETE FROM protein_logs; DELETE FROM weight_logs; DELETE FROM protein_goals; UPDATE patient_body_metrics SET weight_kg = NULL`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  const plus = pp.getByRole('button', { name: /Snel loggen/ });
  await expect(plus).toBeVisible();
  await plus.click();
  const sheet = pp.getByRole('dialog', { name: 'Snel loggen' });
  await expect(sheet.getByText(/Vul je gewicht in/)).toBeVisible();
  await sheet.getByRole('tab', { name: 'Gewicht' }).click();
  await sheet.getByRole('button', { name: '0,1 kg meer' }).click();
  await sheet.getByRole('textbox', { name: 'Gewicht in kg' }).fill('82,5');
  await sheet.getByRole('button', { name: 'Gewicht opslaan' }).click();
  await expect(pp.getByText(/Optimaal eiwit voor jou: 130 g/)).toBeVisible();
  await sheet.getByRole('tab', { name: 'Eiwit' }).click();
  await expect(sheet.getByText(/Optimaal voor jou is 130 g/)).toBeVisible();
  await sheet.getByRole('button', { name: /Kipfilet/ }).click();
  await expect(pp.getByText(/\+30 g eiwit/)).toBeVisible();
  await expect(sheet.getByRole('img', { name: /Eiwit vandaag: 30 gram/ })).toBeVisible();
  await expectAccessible(pp, 'quick log sheet');
  await pp.screenshot({ path: 'screenshots/hero/quicklog.png' });
  await ctx.close();
});

test('the therapist puts crutches on the hero; the patient sees them', async ({ browser, page }) => {
  test.setTimeout(90_000);
  const [emma] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  await sql(`UPDATE patients SET hero_aids = '{}' WHERE id = $1`, [emma.id]);
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto(`/app/patienten/${emma.id}`);
  const sw = page.getByRole('switch', { name: 'Krukken op de held' });
  await sw.scrollIntoViewIfNeeded();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expectAccessible(page, 'crutches toggle');

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.goto('/p/held');
  await expect(pp.locator('[data-gear="crutches"]').first()).toBeAttached();
  await pp.screenshot({ path: 'screenshots/hero/crutches.png', fullPage: false });
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await pp.reload();
  await expect(pp.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(pp.locator('[data-gear="crutches"]')).toHaveCount(0);
  await ctx.close();
});

test('the therapist chooses the skill of the weekly quest; the patient sees it is chosen by the physio', async ({ browser, page }) => {
  test.setTimeout(90_000);
  const [emma] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  await sql(`UPDATE patients SET hero_focus = '[]' WHERE id = $1`, [emma.id]);
  try {
    await login(page, 'therapeut@praktijk-a.test');
    await page.goto(`/app/patienten/${emma.id}`);
    const pick = page.getByLabel('Skill van de weekquest kiezen');
    await pick.scrollIntoViewIfNeeded();
    await pick.selectOption({ label: 'Balans' });
    await expect(page.getByText('Door jou gekozen: Balans.')).toBeVisible();
    await expectAccessible(page, 'quest focus');

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL' });
    const pp = await ctx.newPage();
    await login(pp, 'patient@praktijk-a.test');
    await pp.goto('/p/held');
    await expect(pp.getByText('Gekozen door je fysio: doe 2 oefeningen voor Balans')).toBeVisible();
    await ctx.close();
  } finally {
    await sql(`UPDATE patients SET hero_focus = '[]' WHERE id = $1`, [emma.id]);
  }
});
