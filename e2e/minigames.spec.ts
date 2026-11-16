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
  // One game a day gives double XP.
  await expect(page.getByTestId('game-of-day')).toContainText('Spel van de dag');
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

/** A few games played for real: a balanced plate scores well, a pain card explains itself, lit lamps can be tapped, the beat can be tapped. */
test('the games can be played, not only started', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'patient@praktijk-a.test');

  // Fill the plate: chicken, potatoes and two portions of vegetables make a good meal.
  await page.goto('/p/spellen/plate');
  await page.getByTestId('game-start').click();
  for (const f of ['kipfilet', 'aardappel', 'broccoli', 'sperziebonen']) await page.getByTestId(`plate-food-${f}`).click();
  await page.getByTestId('plate-ready').click();
  await expect(page.getByTestId('plate-tip')).toBeVisible();
  const plate = page.getByTestId('game-score');
  await expect(plate).toBeVisible({ timeout: 15_000 });
  expect(Number(await plate.textContent())).toBeGreaterThanOrEqual(50);

  // Pain: myth or fact? An answer shows whether it was right and why.
  await page.goto('/p/spellen/pain_facts');
  await page.getByTestId('game-start').click();
  await page.getByTestId('pain-myth').click();
  await expect(page.getByTestId('pain-feedback')).toBeVisible();
  await page.getByTestId('pain-next').click();
  await expect(page.getByTestId('pain-card')).toBeVisible();

  // Reaction: tap the lit lamp a few times.
  await page.goto('/p/spellen/reaction');
  await page.getByTestId('game-start').click();
  let hits = 0;
  for (let i = 0; i < 40 && hits < 3; i++) {
    const lit = page.locator('[data-testid^="reaction-lamp-"][data-lit="true"]');
    if (await lit.count()) {
      await lit.first().click({ timeout: 2000 }).then(() => hits++).catch(() => undefined);
    } else await page.waitForTimeout(150);
  }
  await expect.poll(async () => Number((await page.getByTestId('reaction-score').textContent())?.match(/\d+/)?.[0] ?? 0)).toBeGreaterThan(0);
  await page.getByTestId('game-stop').click();
  await expect(page.getByTestId('game-score')).toBeVisible({ timeout: 15_000 });

  // Rhythm: choose, start the beat, tap along.
  await page.goto('/p/spellen/rhythm');
  await page.getByTestId('game-start').click();
  await page.getByTestId('rhythm-begin').click();
  await expect(page.getByTestId('rhythm-tap')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('rhythm-tap').click();
    await page.waitForTimeout(600);
  }
  await page.getByTestId('game-stop').click();
  await expect(page.getByTestId('game-score')).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
