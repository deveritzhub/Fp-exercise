import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/** Skills v2: a locked skill explains itself, level-10 gear can be worn, and the sheet fits a narrow phone. */
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
       UPDATE patient_heroes SET gear = '{}' FROM patients p WHERE p.id = patient_heroes.patient_id AND p.email = 'patient@praktijk-a.test'`);

test.afterAll(clearSeed);

test('lock reasons are visible, a level-10 item can be worn, and the sheet fits 300px', async ({ page }) => {
  test.setTimeout(120_000);
  await clearSeed();
  await page.setViewportSize({ width: 300, height: 780 });
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/held');
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

  await page.reload();
  const wear = page.getByRole('button', { name: 'Aandoen: Handschoenen' });
  await wear.scrollIntoViewIfNeeded();
  await expect(wear).toBeVisible();
  await wear.click();
  await expect(page.getByRole('button', { name: 'Aan: Handschoenen', pressed: true })).toBeVisible();
  await expectAccessible(page, 'skills gear worn');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
