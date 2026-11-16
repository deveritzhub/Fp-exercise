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

/** Out through the gate to the wolf wood: its creatures show themselves from their level on. */
test('an adventurer of level 6 walks out of the gate to the wolves', async ({ browser }) => {
  test.setTimeout(400_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  // Below level 6 the wolf wood is empty; its sign is there.
  await sql(`INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 0) ON CONFLICT (patient_id) DO UPDATE SET xp = 0`, [emma.id]);
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(page.locator('[data-spot="zone:wolfwood"]')).toContainText('level 6+');
  // Fast travel from the world map: the hero stands at the grocer at once.
  await page.getByTestId('slot-places').click();
  await page.getByTestId('jump-grocer').click();
  await expect(village).toHaveAttribute('data-near', 'grocer', { timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Loop naar Wolf' })).toHaveCount(0);
  // At level 6 they are there, with their level on the label.
  await sql(`UPDATE hero_adventure SET xp = 1100 WHERE patient_id = $1`, [emma.id]);
  await page.reload();
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Loop naar Wolf' }).first().press('Enter');
  await expect(page.getByTestId('strike')).toContainText('Wolf', { timeout: 240_000 });
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/wolves.png' });
  await expect(page.locator('[data-spot^="mob:"]').filter({ hasText: 'Wolf' }).first()).toContainText('lvl 6');
  await sql(`UPDATE hero_adventure SET xp = 0 WHERE patient_id = $1`, [emma.id]);
  await context.close();
});
