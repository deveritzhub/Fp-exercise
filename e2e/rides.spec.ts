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

/** The stables sell rides; with a bike the hero gets on in the world, rides faster and gets off again. */
test('the stables sell a bike and the hero rides it in the village', async ({ page }) => {
  test.setTimeout(300_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  await sql("DELETE FROM hero_purchases WHERE patient_id = $1 AND item LIKE 'ride\\_%'", [emma.id]);
  for (const day of ['2000-01-01', '2000-01-02']) await sql('INSERT INTO hero_daily_chests (patient_id, day, coins) VALUES ($1, $2, 50) ON CONFLICT DO NOTHING', [emma.id, day]);
  try {
    await page.addInitScript(() => { localStorage.setItem('fp.village.tip', '1'); localStorage.setItem('fp.village.ride', '0'); });
    await login(page, 'patient@praktijk-a.test');
    // The stables: the bike can be bought, the car waits for a higher level.
    await page.goto('/p/held/inventaris#rides-title');
    const rides = page.getByTestId('rides');
    await expect(rides.locator('[data-ride="bike"]')).toHaveAttribute('data-state', 'shop');
    await rides.locator('[data-ride="bike"]').getByRole('button', { name: /Koop Fiets/ }).click();
    await expect(rides.locator('[data-ride="bike"]')).toHaveAttribute('data-state', 'owned');
    if (process.env.SHOTS) await rides.screenshot({ path: process.env.SHOTS + '/rides-shop.png' });

    // In the world: get on, walk, get off.
    await page.goto('/p/dorp');
    const village = page.getByTestId('walk-village');
    await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
    await page.getByTestId('slot-ride').click();
    await expect(page.getByTestId('slot-ride')).toHaveAttribute('aria-pressed', 'true');
    await expect(village).toHaveAttribute('data-ride', 'bike', { timeout: 20_000 });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(3000);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(1500);
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/rides-bike.png' });
    await page.getByTestId('slot-ride').click();
    await expect(village).not.toHaveAttribute('data-ride', /./, { timeout: 20_000 });
  } finally {
    await sql("DELETE FROM hero_purchases WHERE patient_id = $1 AND item LIKE 'ride\\_%'", [emma.id]);
    await sql("DELETE FROM hero_daily_chests WHERE patient_id = $1 AND day < '2001-01-01'", [emma.id]);
  }
});

/** The recipes show a photo of the dish. */
test('recipes show their photo', async ({ page }) => {
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/voeding');
  await page.getByRole('tab', { name: 'Recepten' }).click();
  const list = page.getByTestId('recipe-list');
  const photo = list.getByTestId('recipe-photo').first();
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(100);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/recipes.png' });
});
