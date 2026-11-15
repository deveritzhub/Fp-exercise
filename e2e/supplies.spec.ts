import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * The hero's water and food come from real logs: a glass per glass of water logged, a ration per meal
 * logged. Breakfast, lunch and dinner logged: the hero is well fed (faster and stronger).
 */
test('logged water and meals become the hero’s supplies; three meals make the hero well fed', async ({ browser }) => {
  test.setTimeout(240_000);
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  // Patient B: a quiet account for this test; start the day clean.
  const [pt] = (await db.query(`SELECT id FROM patients WHERE email = 'patient@praktijk-b.test'`)).rows;
  await db.query('DELETE FROM food_logs WHERE patient_id = $1', [pt.id]);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-b.test');
  const hero = await (await page.request.get('/api/patient/hero')).json();
  test.skip(!hero.hero, 'this demo patient has no hero');
  // The app's own requests carry this header (the server refuses writes without it).
  const H = { 'x-requested-with': 'fp' };
  const glasses0 = Math.min(8, Math.floor(hero.logs.survival.water.ml / 250));

  // Two glasses of water and two meals, logged as anyone would.
  for (let i = 0; i < 2; i++) expect((await page.request.post('/api/patient/logs/water', { data: { ml: 250 }, headers: H })).ok()).toBe(true);
  for (const meal of ['ontbijt', 'lunch']) expect((await page.request.post('/api/patient/food', { data: { meal, items: [{ foodKey: 'kwark', name: 'Magere kwark', grams: 250 }] }, headers: H })).status()).toBe(201);

  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(page.getByTestId('flask')).toHaveAttribute('data-n', String(Math.min(8, glasses0 + 2)));
  await expect(page.getByTestId('rations')).toHaveAttribute('data-n', '2');
  await expect(page.getByTestId('fed-progress')).toHaveText('Eten 2/3');
  await expect(page.getByTestId('well-fed')).toHaveCount(0);

  // Dinner too: well fed.
  expect((await page.request.post('/api/patient/food', { data: { meal: 'diner', items: [{ foodKey: 'kipfilet', name: 'Kipfilet', grams: 150 }] }, headers: H })).status()).toBe(201);
  await page.reload();
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(page.getByTestId('well-fed')).toHaveText('Goed gegeten · sneller en sterker');
  await expect(page.getByTestId('rations')).toHaveAttribute('data-n', '3');
  await page.screenshot({ path: 'screenshots/hero/supplies.png' });
  await db.query('DELETE FROM food_logs WHERE patient_id = $1', [pt.id]);
  await db.end();
  await context.close();
});
