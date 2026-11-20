import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login } from './helpers';
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try { return (await db.query(q, p)).rows; } finally { await db.end(); }
}
/** A shop opened in the game shows inside the game, and buying there works. */
test('buy in the weapon shop from inside the game', async ({ browser }) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  await ctx.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) errors.push(`${r.status()} ${r.url()}`); });
  await login(page, 'patient@praktijk-a.test');
  const [me] = await sql(`SELECT p.id FROM patients p WHERE p.email = 'patient@praktijk-a.test'`);
  await sql('DELETE FROM hero_purchases WHERE patient_id = $1 AND item LIKE $2', [me.id, 'wpn\\_%']);
  await sql('INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 300) ON CONFLICT (patient_id) DO UPDATE SET xp = 300, weapon = NULL', [me.id]);
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  await page.getByTestId('slot-places').click();
  await page.getByTestId('places').getByRole('button', { name: /Wapenwinkel/ }).first().click();
  await page.getByTestId('enter-building').click({ timeout: 60_000 });
  const gp = page.getByTestId('game-page');
  await expect(gp).toBeVisible();
  const frame = page.frameLocator('[data-testid="game-page-frame"]');
  // The shop itself, inside the frame (with a word while it loads).
  await expect(frame.getByTestId('shop-smid')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('game-page-loading')).toHaveCount(0);
  const coins = Number((await frame.getByTestId('shop-coins').innerText()).replace(/\D/g, ''));
  await frame.getByRole('button', { name: /^Koop Wandelstaf/ }).click();
  await expect(frame.getByText('Wandelstaf gekocht en in de hand!')).toBeVisible();
  await expect.poll(async () => Number((await frame.getByTestId('shop-coins').innerText()).replace(/\D/g, ''))).toBe(coins - 30);
  expect(errors).toEqual([]);
  // Back in the game: the staff is in hand.
  await page.getByTestId('game-page-close').click();
  await expect(page.getByTestId('game-page')).toHaveCount(0);
  const adv = await (await page.request.get('/api/patient/hero/adventure')).json();
  expect(adv.weapon).toBe('staff');
});
