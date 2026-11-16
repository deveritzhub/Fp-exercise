import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login } from './helpers';

async function sql(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows;
  } finally {
    await db.end();
  }
}

/** Through the Shadow valley and down the cave to the dungeon, to the Shame lord at the far end. */
test('a strong adventurer goes down to the underworld and finds the Shame lord', async ({ browser }) => {
  test.setTimeout(450_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  await sql(`INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 6000) ON CONFLICT (patient_id) DO UPDATE SET xp = 6000`, [emma.id]);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // The Shadow valley: its creatures carry their level.
  await expect(page.locator('[data-spot^="mob:"]').filter({ hasText: 'Pronkpauw' }).first()).toContainText('lvl 4');
  // Down the cave.
  await page.getByTestId('slot-places').click();
  await page.getByTestId('jump-dungeon').click();
  await page.getByTestId('enter-dungeon').click({ timeout: 60_000 });
  await expect(village).toHaveAttribute('data-zone', 'dungeon', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Terug naar boven' })).toBeVisible();
  // At the far end: the Shame lord, a fair fight from adventurer 20.
  await page.getByRole('button', { name: 'Loop naar Schaamtevorst' }).press('Enter');
  await expect(page.getByTestId('strike')).toContainText('Schaamtevorst', { timeout: 200_000 });
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/shame-lord.png' });
  await expect(page.locator('[data-spot^="mob:"]').filter({ hasText: 'Schaamtevorst' }).first()).toContainText('lvl 20');
  await sql(`UPDATE hero_adventure SET xp = 0 WHERE patient_id = $1`, [emma.id]);
  await context.close();
});
