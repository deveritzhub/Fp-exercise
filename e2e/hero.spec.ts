import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/** Sports hero: first visit → character creator → body map → character sheet; therapist sees the map. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

// Put every seeded patient's hero back for the other specs.
test.afterAll(async () => {
  await sql(`INSERT INTO patient_heroes(patient_id, practice_id, hero_name, skin, hair, outfit, sport)
    SELECT id, practice_id, first_name, 's3', 'short', 'forest', 'running' FROM patients ON CONFLICT DO NOTHING`);
});

test('patient creates a sports hero on the first visit and marks where it hurts', async ({ browser, page }) => {
  test.setTimeout(120_000);
  const [emma] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  await sql('DELETE FROM patient_heroes WHERE patient_id = $1', [emma.id]);
  await sql('DELETE FROM pain_map_entries WHERE patient_id = $1', [emma.id]);

  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await expect(pp).toHaveURL(/\/p\/held\/nieuw$/);
  await expect(pp.getByRole('heading', { name: 'Maak je sportheld' })).toBeVisible();
  await expectAccessible(pp, 'hero step 1');
  await pp.getByLabel('Naam van je held').fill('Emma de Sprinter');
  await pp.getByRole('radio', { name: 'Hardlopen' }).click();
  await pp.getByRole('button', { name: 'Volgende' }).click();

  await pp.getByRole('radio', { name: 'Krullen' }).click();
  await pp.getByRole('radio', { name: 'Oceaan' }).click();
  await expectAccessible(pp, 'hero step 2');
  await pp.getByRole('button', { name: 'Volgende' }).click();

  await expect(pp.getByRole('heading', { name: 'Waar heb je pijn?' })).toBeVisible();
  await pp.getByRole('button', { name: /^Linkerknie/ }).click();
  await pp.getByLabel(/Hoeveel pijn/).fill('7');
  await expect(pp.getByRole('button', { name: /^Linkerknie: 7\/10, veel/ })).toBeVisible();
  await pp.getByRole('radio', { name: 'Achterkant' }).click();
  await pp.getByRole('button', { name: /^Onderrug/ }).click();
  await pp.getByLabel(/Hoeveel pijn/).fill('4');
  await expectAccessible(pp, 'body map');
  expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await pp.screenshot({ path: 'screenshots/hero/body-map.png', fullPage: true });
  await pp.getByRole('button', { name: 'Klaar: start mijn avontuur' }).click();

  await expect(pp).toHaveURL(/\/p\/held$/);
  await expect(pp.getByRole('heading', { name: 'Emma de Sprinter' })).toBeVisible();
  await expect(pp.getByText(/Level \d+ · /).first()).toBeVisible();
  await expect(pp.getByRole('img', { name: /Linkerknie: 7\/10/ })).toBeVisible();
  await expectAccessible(pp, 'character sheet');
  await pp.screenshot({ path: 'screenshots/hero/character-sheet.png', fullPage: true });

  // Home shows the hero card; the Held tab is in the bottom bar.
  await pp.goto('/p');
  await expect(pp.getByRole('link', { name: /Emma de Sprinter/ })).toBeVisible();
  await expect(pp.getByRole('navigation', { name: 'Navigatie' }).getByRole('link', { name: 'Held' })).toBeVisible();
  await pp.screenshot({ path: 'screenshots/hero/home.png', fullPage: true });

  // Pain check-in: knee better.
  await pp.goto('/p/held/pijn');
  await pp.getByRole('button', { name: /^Linkerknie/ }).click();
  await pp.getByLabel(/Hoeveel pijn/).fill('3');
  await pp.getByRole('button', { name: 'Opslaan' }).click();
  await expect(pp).toHaveURL(/\/p\/held$/);
  await expect(pp.getByRole('img', { name: /Linkerknie: 3\/10, licht \(start 7\/10\)/ })).toBeVisible();
  await ctx.close();

  // Therapist sees the body map in the record.
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto(`/app/patienten/${emma.id}`);
  await expect(page.getByRole('heading', { name: 'Pijnkaart (door patiënt ingevuld)' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Linkerknie' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '3 · licht' })).toBeVisible();
  await expectAccessible(page, 'therapist pain map');
  await page.screenshot({ path: 'screenshots/hero/therapist.png', fullPage: true });
});

test('"Later" postpones the character creator for this visit', async ({ browser }) => {
  const [p] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-b.test'`);
  await sql('DELETE FROM patient_heroes WHERE patient_id = $1', [p.id]);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  await expect(pp).toHaveURL(/\/p\/held\/nieuw$/);
  await pp.getByRole('link', { name: 'Later' }).click();
  await expect(pp).toHaveURL(/\/p$/);
  await expect(pp.getByRole('link', { name: /Maak je sportheld/ })).toBeVisible();
  await ctx.close();
});
