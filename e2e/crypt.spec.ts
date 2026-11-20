import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { buildCrypt } from '../shared/dungeon';

/** A crypt under the village: down through the gate, a chest, and back up the stairs. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

test('down into a crypt, open a chest, and back up', async ({ browser }) => {
  test.setTimeout(480_000);
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 }, locale: 'nl-NL' });
  await ctx.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  const [me] = await sql(`SELECT p.id FROM patients p WHERE p.email = 'patient@praktijk-a.test'`);
  await sql("INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 400) ON CONFLICT (patient_id) DO UPDATE SET xp = GREATEST(hero_adventure.xp, 400), crypt_seed = NULL, crypt_depth = NULL, crypt_chests = '{}'", [me.id]);
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  if ((await village.getAttribute('data-zone')) !== 'village') {
    await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
    await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 60_000 });
  }
  // To the crypt gate, and down to depth 1.
  await page.locator('[data-spot="cryptgate"]').press('Enter');
  await page.getByTestId('open-crypt').click({ timeout: 200_000 });
  const panel = page.getByTestId('crypt-panel');
  await expect(panel.locator('[data-depth]')).toHaveCount(1);
  await panel.getByTestId('crypt-go-1').click();
  await expect(village).toHaveAttribute('data-zone', 'crypt', { timeout: 90_000 });
  if (process.env.SHOTS) { await page.waitForTimeout(2000); await page.screenshot({ path: process.env.SHOTS + '/crypt.png' }); }
  const run = (await (await page.request.get('/api/patient/hero/adventure')).json()).crypt.run;
  expect(run.depth).toBe(1);
  // A chest, when this crypt has one.
  if (buildCrypt(run.seed, 1).chests.length) {
    await page.locator('[data-spot="chest:0"]').press('Enter');
    await page.getByTestId('open-chest').click({ timeout: 120_000 });
    await expect(page.getByText(/In de kist: \d+ muntjes/)).toBeVisible();
  }
  // Back up the stairs.
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 120_000 });
  await sql("UPDATE hero_adventure SET crypt_seed = NULL, crypt_depth = NULL, crypt_chests = '{}' WHERE patient_id = $1", [me.id]);
  await ctx.close();
});
