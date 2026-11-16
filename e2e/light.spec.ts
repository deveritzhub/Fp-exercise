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

/** Helpers set free stand as shrines in the town; the crown of light glows on the hero; the book opens. */
test('the light side: shrines in town, the crown on the hero and the book of creatures', async ({ browser }) => {
  test.setTimeout(300_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  const freed = ['courage', 'reason', 'acceptance', 'enlightenment'];
  for (const k of freed) await sql("INSERT INTO hero_purchases(patient_id, item, price) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING", [emma.id, `light_${k}`]);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/held/inventaris');
  const light = page.getByTestId('light');
  await expect(light.locator('[data-light="courage"]')).toHaveAttribute('data-state', 'free');
  await expect(light.locator('[data-light="love"]')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('bestiary').locator('[data-creature="shame_lord"]')).toContainText('Schaamtevorst');
  await page.locator('#light-title').scrollIntoViewIfNeeded();
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/light-card.png' });
  await expectAccessible(page, 'light side');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(page.locator('[data-spot="light:courage"]')).toHaveCount(1);
  await expect(page.locator('[data-spot="light:love"]')).toHaveCount(0);
  await expect(page.getByTestId('acceptance-heal')).toHaveCount(1);
  await page.getByRole('button', { name: 'Loop naar de schrijn van Moed' }).press('Enter');
  await expect(page.getByTestId('shrine-info')).toContainText('eerste klap', { timeout: 120_000 });
  if (process.env.SHOTS) {
    for (let i = 0; i < 2; i++) await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: process.env.SHOTS + '/shrine.png' });
  }
  for (const k of freed) await sql('DELETE FROM hero_purchases WHERE patient_id = $1 AND item = $2', [emma.id, `light_${k}`]);
  await context.close();
});
