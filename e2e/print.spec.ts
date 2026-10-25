import fs from 'node:fs';
import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/** Programme on paper / PDF, for therapist and patient. Synthetic e2e data only. */
const SHOTS = 'screenshots/print';
fs.mkdirSync(SHOTS, { recursive: true });

async function emmaProgram() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.description, (SELECT array_agg(e.name_nl ORDER BY i.position) FROM program_items i JOIN exercises e ON e.id = i.exercise_id WHERE i.program_id = p.id) AS names
         FROM programs p WHERE p.title ILIKE 'Knie — patellapees%' AND NOT p.is_template AND p.status = 'active' LIMIT 1`,
    );
    return rows[0] as { id: string; description: string; names: string[] };
  } finally {
    await db.end();
  }
}

test('therapist prints a programme: all exercises, no internal notes, no app chrome on paper', async ({ page }) => {
  const p = await emmaProgram();
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto(`/app/programmas/${p.id}`);
  await page.getByRole('button', { name: 'Meer', exact: true }).click();
  await page.getByRole('button', { name: 'Afdrukken / PDF' }).click();
  await expect(page).toHaveURL(new RegExp(`/app/programmas/${p.id}/afdrukken$`));
  const sheet = page.getByRole('article');
  await expect(sheet.getByRole('heading', { level: 1 })).toContainText('patellapees');
  await expect(sheet.getByText('Voor Emma de Jong', { exact: false })).toBeVisible();
  for (const n of p.names) await expect(sheet.getByRole('heading', { name: n, exact: false }).first()).toBeVisible();
  // The internal description (criteria, evidence) never ends up on the patient's sheet.
  if (p.description?.trim()) await expect(page.getByText(p.description.trim().slice(0, 40), { exact: false })).toHaveCount(0);
  await expectAccessible(page, 'print view');
  await page.screenshot({ path: `${SHOTS}/therapist-print-screen.png`, fullPage: true });

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('aside').first()).toBeHidden();
  await expect(page.locator('header').first()).toBeHidden();
  await expect(page.getByRole('button', { name: 'Afdrukken of opslaan als PDF' })).toBeHidden();
  const pdf = await page.pdf({ format: 'A4' });
  expect(pdf.byteLength).toBeGreaterThan(5_000);
  fs.writeFileSync(`${SHOTS}/programma.pdf`, pdf);
});

test('patient prints their own programme from the app', async ({ browser }) => {
  const p = await emmaProgram();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto(`/p/programma/${p.id}`);
  await page.getByRole('link', { name: 'Afdrukken of opslaan als PDF' }).click();
  await expect(page).toHaveURL(new RegExp(`/p/programma/${p.id}/afdrukken$`));
  await expect(page.getByText('Van Joris Bakker', { exact: false })).toBeVisible();
  for (const n of p.names) await expect(page.getByRole('heading', { name: n, exact: false }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await expectAccessible(page, 'patient print view');
  await page.screenshot({ path: `${SHOTS}/patient-print-screen.png`, fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('navigation', { name: 'Navigatie' })).toBeHidden();
  await ctx.close();
});

test('a patient cannot print someone else’s programme', async ({ page }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const { rows } = await db.query(`SELECT p.id FROM programs p JOIN patients pt ON pt.id = p.patient_id WHERE pt.email <> 'patient@praktijk-a.test' AND NOT p.is_template LIMIT 1`);
  await db.end();
  test.skip(!rows[0], 'no other patient programme in the seed');
  await login(page, 'patient@praktijk-a.test');
  await page.goto(`/p/programma/${rows[0].id}/afdrukken`);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});
