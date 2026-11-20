import pg from 'pg';
import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

async function sql(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows;
  } finally {
    await db.end();
  }
}

/** The boss board on the square: every boss with its card, a stamp for the ones beaten, and the way there. */
test('the boss board shows the bosses and takes the hero to one', async ({ browser }) => {
  test.setTimeout(300_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  await sql(`INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 4300) ON CONFLICT (patient_id) DO UPDATE SET xp = 4300`, [emma.id]);
  await sql("INSERT INTO hero_purchases(patient_id, item, price) VALUES ($1, 'slain_alpha_boar', 0) ON CONFLICT DO NOTHING", [emma.id]);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByTestId('slot-places').click();
  await page.getByTestId('jump-bossboard').click();
  await page.getByTestId('open-bossboard').click({ timeout: 30_000 });
  const board = page.getByTestId('boss-board');
  await expect(board.locator('[data-boss]')).toHaveCount(6);
  await expect(board.locator('[data-boss="alpha_boar"]')).toHaveAttribute('data-state', 'slain');
  await expect(board.locator('[data-boss="shame_lord"]')).toContainText('Laat zich zien vanaf avonturier 16');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/bossboard.png' });
  await expectAccessible(page, 'boss board');
  // Take me there: the Alpha wolf in the wolf wood.
  await page.getByTestId('go-alpha_wolf').click();
  await expect(page.getByTestId('strike')).toContainText('Alfawolf', { timeout: 60_000 });
  await sql(`UPDATE hero_adventure SET xp = 0 WHERE patient_id = $1`, [emma.id]);
  await sql("DELETE FROM hero_purchases WHERE patient_id = $1 AND item = 'slain_alpha_boar'", [emma.id]);
  await context.close();
});
