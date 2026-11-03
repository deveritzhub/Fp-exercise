import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible, expandFolds } from './helpers';

/** Skills v2: a locked skill explains itself, coins from training buy gear, and the sheet fits a narrow phone. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

const clearSeed = () =>
  sql(`DELETE FROM exercise_logs WHERE session_id IN (SELECT id FROM workout_sessions WHERE feedback = 'skills-v2-e2e');
       DELETE FROM workout_sessions WHERE feedback = 'skills-v2-e2e';
       UPDATE patient_heroes SET gear = '{}', showcase = '{}' FROM patients p WHERE p.id = patient_heroes.patient_id AND p.email = 'patient@praktijk-a.test';
       DELETE FROM hero_purchases WHERE patient_id IN (SELECT id FROM patients WHERE email = 'patient@praktijk-a.test')`);

test.afterAll(clearSeed);

test('lock reasons are visible, training buys gear in the shop, and the sheet fits 300px', async ({ page }) => {
  test.setTimeout(120_000);
  await clearSeed();
  await page.setViewportSize({ width: 300, height: 780 });
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/held');
  await expandFolds(page);
  await expect(page.getByRole('heading', { name: 'Skills' })).toBeVisible();
  await expect(page.getByText('binnenkort').first()).toBeVisible();
  await expect(page.getByText('nog niet in je programma').first()).toBeVisible();
  await expectAccessible(page, 'skills locks');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  // Nine days of fifteen planned strength logs: 1350 XP, inside the daily cap, which is level 10 (1305).
  await sql(`WITH item AS (
      SELECT p.practice_id, p.id AS patient_id, pr.id AS program_id, i.id AS item_id, i.exercise_id
        FROM patients p
        JOIN programs pr ON pr.patient_id = p.id AND pr.status = 'active'
        JOIN program_items i ON i.program_id = pr.id
        JOIN exercises e ON e.id = i.exercise_id
       WHERE p.email = 'patient@praktijk-a.test'
         AND 'strength' = ANY(e.training_categories)
         AND cardinality(i.days) = 7
       LIMIT 1
    ),
    slots AS (SELECT d, n FROM generate_series(1, 9) d CROSS JOIN generate_series(1, 15) n),
    ins AS (
      INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at, feedback)
      SELECT item.practice_id, item.patient_id, item.program_id, 1,
             (CURRENT_DATE - slots.d) + (slots.n || ' minutes')::interval,
             (CURRENT_DATE - slots.d) + (slots.n || ' minutes')::interval + interval '20 minutes',
             'skills-v2-e2e'
        FROM item CROSS JOIN slots
      RETURNING id, practice_id, patient_id
    )
    INSERT INTO exercise_logs(session_id, practice_id, patient_id, program_item_id, exercise_id, completed, sets_done, reps_done)
    SELECT ins.id, ins.practice_id, ins.patient_id, item.item_id, item.exercise_id, true, 3, 8 FROM ins CROSS JOIN item`);

  await page.goto('/p/held/inventaris');
  // The training earned coins: buy the gloves (rare, 90 coins); they go on right away.
  const buy = page.getByRole('button', { name: 'Kopen 90 muntjes: Handschoenen' });
  await buy.scrollIntoViewIfNeeded();
  await expect(buy).toBeVisible();
  await buy.click();
  // A purchase opens the "new in your collection" reveal; continue past it.
  const reveal = page.getByRole('dialog', { name: 'Nieuw in je collectie' });
  await reveal.getByRole('button', { name: 'Verder' }).click();
  await expect(page.getByRole('button', { name: /^Handschoenen.*Aan ✓/, pressed: true })).toBeVisible();
  await expect(page.getByText(/^Gearscore 45$/).first()).toBeVisible();
  // Outfits are sold too and fill their own slot on the character screen.
  const outfit = page.getByRole('button', { name: 'Kopen 40 muntjes: Trainingspak' });
  await outfit.scrollIntoViewIfNeeded();
  await outfit.click();
  await reveal.getByRole('button', { name: 'Verder' }).click();
  await expect(page.getByRole('button', { name: 'Outfit: Trainingspak. Wijzigen' })).toBeVisible();
  await expect(page.getByText(/^Gearscore 70$/).first()).toBeVisible();
  const close = page.getByRole('status').getByRole('button', { name: 'Sluiten / Close' });
  while (await close.count()) await close.first().click();
  // Character screen: the hands slot now shows the gloves; a slot opens its own picker.
  await expect(page.getByRole('button', { name: 'Handen: Handschoenen. Wijzigen' })).toBeVisible();
  await page.getByRole('button', { name: /^Hoofd/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Hoofd' })).toBeVisible();
  await expectAccessible(page, 'gear slot picker');
  await page.getByRole('button', { name: 'Sluiten' }).last().click();
  // Trophy cabinet: Strength level 10 won bronze. The wall stays away until something is placed.
  await expect(page.getByRole('img', { name: /^Muur achter je held/ })).toHaveCount(0);
  await expect(page.getByText(/Je muur is leeg en staat uit/)).toBeVisible();
  const bronze = page.getByRole('button', { name: /^Kracht Brons/ });
  await bronze.scrollIntoViewIfNeeded();
  await bronze.click();
  await expect(page.getByRole('button', { name: /^Kracht Brons/, pressed: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Muur achter je held: Kracht Brons/ }).first()).toBeVisible();
  await page.getByRole('img', { name: /^Muur achter je held/ }).first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'screenshots/hero/trophy-wall.png' });
  await expectAccessible(page, 'skills gear worn');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
