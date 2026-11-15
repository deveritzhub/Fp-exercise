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

/** Chop an oak for wood; a next home is built with loot once the level allows it. */
test('the patient chops wood and builds the next home with loot', async ({ browser }) => {
  test.setTimeout(300_000);
  const [emma] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  // An oak asks for a hatchet from the smith.
  await sql("INSERT INTO hero_purchases(patient_id, item, price) VALUES ($1, 'tool_hatchet', 0) ON CONFLICT DO NOTHING", [emma.id]);
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  const woodBefore = Number((await (await page.request.get('/api/patient/hero/adventure')).json()).loot.wood ?? 0);

  // An oak behind the strength house: chop it until it falls; it gives wood.
  await page.getByRole('button', { name: 'Loop naar Eik' }).first().press('Enter');
  const chop = page.getByTestId('strike');
  await expect(chop).toContainText('Hak de eik', { timeout: 90_000 });
  await page.screenshot({ path: 'screenshots/hero/chop-oak.png' });
  for (let i = 0; i < 8 && (await chop.count()); i++) await chop.click();
  await expect(chop).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(async () => Number((await (await page.request.get('/api/patient/hero/adventure')).json()).loot.wood ?? 0)).toBeGreaterThan(woodBefore);

  // Enough loot for a cottage, and the hut as the home that stands now (the level allows a cottage).
  await sql('UPDATE hero_homes SET built_stage = 1 WHERE patient_id = $1', [emma.id]);
  for (const [item, n] of [['wood', 12], ['stone', 6], ['hide', 2]] as const) {
    await sql('INSERT INTO hero_loot(patient_id, item, n) VALUES ($1,$2,$3) ON CONFLICT (patient_id, item) DO UPDATE SET n = greatest(hero_loot.n, EXCLUDED.n)', [emma.id, item, n]);
  }
  await page.reload();
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.getByTestId('slot-places').click();
  await page.getByTestId('places').getByRole('button', { name: /Jouw huis/ }).click();
  await page.getByTestId('enter-home').click({ timeout: 90_000 });
  await expect(village).toHaveAttribute('data-zone', 'home', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Loop naar de inrichtingstafel' }).press('Enter');
  await page.getByTestId('open-decor').click({ timeout: 60_000 });
  const panel = page.getByTestId('build-home');
  await expect(panel).toContainText('Bouw een huisje');
  await expect(panel.locator('[data-cost="wood"]')).toContainText('12/12');
  await expectAccessible(page, 'build home');
  await page.screenshot({ path: 'screenshots/hero/build-home.png' });
  await panel.getByTestId('build-home-button').click();
  // The village draws the new house first; that can take a moment on a slow machine.
  await expect(page.getByTestId('home-built')).toHaveText('Gebouwd! Je woont nu in een huisje.', { timeout: 30_000 });
  // The next one asks for a higher level first.
  await expect(panel).toContainText('Bouw een woonhuis');
  await expect(panel.getByTestId('build-home-button')).toBeDisabled();
  await context.close();
});
