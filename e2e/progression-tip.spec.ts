import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('own mobility programme: three light workouts give a "step up" tip; rehab never does', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const pt = (await db.query(`SELECT p.id, p.practice_id, p.user_id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-b.test'`)).rows[0];
  await db.query(`DELETE FROM programs WHERE title = 'Soepel E2E'`);
  const prog = (await db.query(
    `INSERT INTO programs(practice_id, patient_id, title, status, module, created_by, version) VALUES ($1, $2, 'Soepel E2E', 'active', 'mobiliteit', $3, 1) RETURNING id`,
    [pt.practice_id, pt.id, pt.user_id],
  )).rows[0].id;
  for (const d of [1, 2, 3])
    await db.query(
      `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at, difficulty, pain)
       VALUES ($1, $2, $3, 1, now() - make_interval(days => $4), now() - make_interval(days => $4) + interval '20 minutes', 2, 0)`,
      [pt.practice_id, pt.id, prog, d],
    );
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page, 'patient@praktijk-b.test');
    await page.goto('/p/mobiliteit');
    const tip = page.getByRole('status').filter({ hasText: 'Dit gaat je makkelijk af' });
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Soepel E2E');
    await expectAccessible(page, 'progression tip');
    await ctx.close();
  } finally {
    await db.query(`DELETE FROM workout_sessions WHERE program_id = $1`, [prog]);
    await db.query(`DELETE FROM programs WHERE id = $1`, [prog]);
    await db.end();
  }
});

test('progress page: own effort and pain after workouts, with a plain summary', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/voortgang');
  const card = page.getByRole('region', { name: 'Zwaarte en pijn na je trainingen' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('status')).toContainText(/Je pijn na het trainen/);
  await expectAccessible(page, 'scores card');
  await ctx.close();
});

test('messages: the patient finds replies from the practice behind the bell', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p');
  await page.getByRole('link', { name: /^Berichten/ }).click();
  await expect(page.getByRole('heading', { name: 'Berichten', level: 1 })).toBeVisible();
  await expectAccessible(page, 'messages');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await ctx.close();
});

test('pain after workouts rising three times: the patient is told to slow down and tell the physio', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const pt = (await db.query(`SELECT p.id, p.practice_id, p.user_id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-b.test'`)).rows[0];
  await db.query(`DELETE FROM programs WHERE title = 'Pijn E2E'`);
  const prog = (await db.query(
    `INSERT INTO programs(practice_id, patient_id, title, status, module, created_by, version) VALUES ($1, $2, 'Pijn E2E', 'active', 'mobiliteit', $3, 1) RETURNING id`,
    [pt.practice_id, pt.id, pt.user_id],
  )).rows[0].id;
  // Newest (1 day ago) hurts most.
  for (const [d, pain] of [[1, 5], [2, 3], [3, 2]])
    await db.query(
      `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at, difficulty, pain)
       VALUES ($1, $2, $3, 1, now() - make_interval(days => $4), now() - make_interval(days => $4) + interval '20 minutes', 5, $5)`,
      [pt.practice_id, pt.id, prog, d, pain],
    );
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page, 'patient@praktijk-b.test');
    await page.goto('/p/mobiliteit');
    const tip = page.getByRole('status').filter({ hasText: 'Je pijn na het trainen loopt op' });
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('van 2 naar 5 op 10');
    await expectAccessible(page, 'pain rising');
    await ctx.close();
  } finally {
    await db.query(`DELETE FROM workout_sessions WHERE program_id = $1`, [prog]);
    await db.query(`DELETE FROM programs WHERE id = $1`, [prog]);
    await db.end();
  }
});
