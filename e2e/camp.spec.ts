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

/** The campfire cooks loot into food that heals; the task of the day is in the task list; the chest stands at home. */
test('the patient cooks at the campfire, eats, sees the task of the day and opens the chest at home', async ({ browser }) => {
  test.setTimeout(420_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  for (const [item, n] of [['meat', 2], ['berries', 4], ['wood', 6], ['hide', 1]] as const) {
    await sql('INSERT INTO hero_loot(patient_id, item, n) VALUES ($1,$2,$3) ON CONFLICT (patient_id, item) DO UPDATE SET n = EXCLUDED.n', [emma.id, item, n]);
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  // The chest is made from loot; it is then a piece in the room at home.
  expect((await (await page.request.post('/api/patient/hero/adventure/craft', { data: { key: 'chest' }, headers: { 'x-requested-with': 'fp' } })).json()).built).toContain('chest');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });

  // The task of the day is in the task list.
  await page.getByTestId('toggle-tasks').click();
  await expect(page.getByRole('button', { name: /avonturen-XP/ })).toBeVisible();
  await page.getByTestId('toggle-tasks').click();

  // The campfire: cook roast meat and a berry tart.
  await page.getByRole('button', { name: 'Loop naar het kampvuur' }).press('Enter');
  await page.getByTestId('open-camp').click({ timeout: 90_000 });
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/camp.png' });
  const list = page.getByTestId('cook-list');
  await list.getByRole('button', { name: 'Kook Gebraden vlees' }).click();
  await expect(page.getByTestId('eat-dish')).toHaveAttribute('data-n', '1');
  await list.getByRole('button', { name: 'Kook Bessentaart' }).click();
  await expect(page.getByTestId('eat-dish')).toHaveAttribute('data-n', '2');
  await expectAccessible(page, 'campfire');
  await page.keyboard.press('Escape');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/camp-fire.png' });

  // Home: the loot chest stands in the room and opens.
  await page.getByTestId('slot-places').click();
  await page.getByTestId('places').getByRole('button', { name: /^Jouw huis/ }).click();
  await page.getByTestId('enter-home').click({ timeout: 90_000 });
  await expect(village).toHaveAttribute('data-zone', 'home', { timeout: 30_000 });
  await page.getByTestId('open-lootchest').click({ timeout: 30_000 });
  await expect(page.getByTestId('chest-loot').locator('[data-loot="cooked_meat"]')).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/chest.png' });
  await page.keyboard.press('Escape');
  await context.close();
  // Leave the home as it was: other tests count the furniture in it.
  await sql("UPDATE hero_homes SET layout = COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(layout) e WHERE e->>'key' <> 'home_lootchest'), '[]'::jsonb) WHERE patient_id = $1", [emma.id]);
  await sql("DELETE FROM hero_purchases WHERE patient_id = $1 AND item IN ('home_lootchest', 'built_chest')", [emma.id]);
});
