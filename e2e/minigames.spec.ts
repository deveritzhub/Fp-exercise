import pg from 'pg';
import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';
import { MINIGAMES } from '../shared/minigames';

async function sql(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows;
  } finally {
    await db.end();
  }
}

/** The games page lists all the little games; each one starts, can be stopped, and shows a result with stars and XP. */
test('every little game starts, stops and shows its result', async ({ browser }) => {
  test.setTimeout(400_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  await sql('DELETE FROM hero_minigames WHERE patient_id = $1', [emma.id]);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL', permissions: [] });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'patient@praktijk-a.test');
  // From the hero page to the games.
  await page.goto('/p/held');
  await page.getByTestId('hero-games').click();
  await expect(page).toHaveURL(/\/p\/spellen$/);
  for (const g of MINIGAMES) await expect(page.getByTestId(`game-${g.key}`)).toBeVisible();
  await expectAccessible(page, 'games hub');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/games-hub.png', fullPage: true });

  for (const g of MINIGAMES) {
    await page.goto(`/p/spellen/${g.key}`);
    await page.getByTestId('game-start').click();
    await expect(page.getByTestId(`${g.key}-game`)).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/game-${g.key}.png` });
    await page.getByTestId('game-stop').click();
    const result = page.getByTestId('game-result');
    await expect(result.getByTestId('game-score')).toBeVisible({ timeout: 15_000 });
    await expect(result.getByTestId('game-xp')).toContainText(/XP/);
    await expect(page.getByTestId('game-again')).toBeVisible();
  }
  const saved = await sql('SELECT count(*)::int AS n FROM hero_minigames WHERE patient_id = $1', [emma.id]);
  expect(saved[0].n).toBe(MINIGAMES.length);
  expect(errors).toEqual([]);
  await sql('DELETE FROM hero_minigames WHERE patient_id = $1', [emma.id]);
});
