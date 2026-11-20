import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/**
 * Pancake on the mobility page: the check "what holds you back", the build-up in phases with criteria
 * to tick off (stored), and the form checklist per exercise. Synthetic e2e data: phase templates that
 * carry the source keys of the FP library build-up.
 */
async function sql<T = Record<string, unknown>>(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows as T[];
  } finally {
    await db.end();
  }
}

test('the patient finds what holds back the pancake and follows the phases with criteria', async ({ browser }) => {
  test.setTimeout(120_000);
  const [emma] = await sql<{ id: string; practice_id: string }>(`SELECT id, practice_id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  const [owner] = await sql<{ user_id: string }>(`SELECT user_id FROM practice_members WHERE practice_id = $1 ORDER BY created_at LIMIT 1`, [emma.practice_id]);
  const [ex] = await sql<{ id: string }>(`SELECT id FROM exercises WHERE practice_id IS NULL ORDER BY name_nl LIMIT 1`);
  await sql(`DELETE FROM flexibility_checks WHERE patient_id = $1`, [emma.id]);
  for (const [key, title, no] of [['mb4_pancake#1', 'Pancake — Rechtop in spreidzit (wk 1-3)', 1], ['mb4_pancake#2', 'Pancake — Kantelen vanuit je heupen (wk 4-7)', 2]] as const) {
    if ((await sql(`SELECT 1 FROM programs WHERE practice_id = $1 AND is_template AND source_key = $2`, [emma.practice_id, key])).length) continue;
    const [t] = await sql<{ id: string }>(
      `INSERT INTO programs(practice_id, is_template, title, description, patient_instructions, status, module, red_flags, created_by, source_key, series_key, series_title, phase_no, phase_count, phase_name)
       VALUES ($1, true, $2, 'intern', 'Rek tot een lichte spanning, niet tot pijn.', 'active', 'mobiliteit', '[]', $3, $4, 'mb4_pancake', 'Pancake', $5, 4, $6) RETURNING id`,
      [emma.practice_id, title, owner.user_id, key, no, title.split('— ')[1]],
    );
    for (let i = 0; i < 4; i++) await sql(`INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, hold_s, days) VALUES ($1,$2,$3,$4,3,30,$5)`, [t.id, emma.practice_id, ex.id, i, [1, 2, 3, 4, 5]]);
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/mobiliteit');
  const start = page.locator('#mod-start');
  await expect(start).toBeVisible();
  if (await start.evaluate((e) => e.tagName === 'DETAILS' && !(e as HTMLDetailsElement).open)) await start.locator('summary').click();
  const menu = page.getByRole('region', { name: 'Kies je doel' });
  await menu.getByTestId('goal-pancake').click();

  // What holds you back: knees bent helps clearly → the muscles across the knee.
  await menu.getByTestId('limiter-start').click();
  const check = menu.getByTestId('limiter-check');
  const answer = async (label: string) => check.getByText(label, { exact: true }).click();
  await answer('Binnenkant bovenbenen');
  await answer('Ja'); // knees bent: further
  await answer('Ja'); // upright: yes
  await answer('Nee'); // head: no change
  await answer('Ja'); // active lift: yes
  await answer('Nee'); // no tingling
  await expect(check.getByTestId('limiter-binnen_tweegewricht')).toContainText('waarschijnlijk');
  await expect(check.getByTestId('limiter-result')).toContainText('geen diagnose');

  // The build-up: phase 1 is open, with exercises, a checklist and the criteria.
  const path = menu.getByTestId('flex-path-pancake');
  const phase1 = path.getByTestId('phase-1');
  await expect(phase1).toContainText('Rechtop in spreidzit');
  await expect(phase1.getByRole('button', { name: 'Start fase 1' })).toBeVisible();
  await phase1.getByRole('button', { name: 'Afvinklijst' }).first().click();
  const list = phase1.getByTestId('form-checklist').first();
  await list.getByRole('checkbox').first().check();
  await expect(list.getByRole('checkbox').first()).toBeChecked();

  const crit = phase1.getByTestId('criteria-1');
  const rechtop = crit.getByRole('checkbox', { name: /rechtop in spreidzit zonder handen/ });
  await rechtop.check();
  await expect(rechtop).toBeChecked();
  await expectAccessible(page, 'flexibility path');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await phase1.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'screenshots/modules/flexibility-path.png', fullPage: true });

  // Stored on the server: still ticked after a reload.
  await page.reload();
  if (await start.evaluate((e) => e.tagName === 'DETAILS' && !(e as HTMLDetailsElement).open)) await start.locator('summary').click();
  await menu.getByTestId('goal-pancake').click();
  await expect(menu.getByTestId('criteria-1').getByRole('checkbox', { name: /rechtop in spreidzit zonder handen/ })).toBeChecked();
  // Phase templates live in the goal menu, not in the plain list below.
  await expect(page.getByText('Pancake — Rechtop in spreidzit (wk 1-3)')).toHaveCount(0);
  await ctx.close();
});
