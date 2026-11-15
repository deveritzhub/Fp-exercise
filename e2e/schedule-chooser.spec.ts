import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/**
 * "Kies je schema" on the strength page: format, days per week and goal lead to the shipped schedules
 * that fit. Synthetic e2e data: three start templates carry the ids of the FP library schedules.
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

test('the patient picks format, days and goal and gets the schedule that fits', async ({ browser }) => {
  test.setTimeout(90_000);
  const [emma] = await sql<{ id: string; practice_id: string; strength_cleared_at: string | null }>(`SELECT id, practice_id, strength_cleared_at FROM patients WHERE email = 'patient@praktijk-a.test'`);
  const [owner] = await sql<{ user_id: string }>(`SELECT user_id FROM practice_members WHERE practice_id = $1 ORDER BY created_at LIMIT 1`, [emma.practice_id]);
  const [ex] = await sql<{ id: string }>(`SELECT id FROM exercises WHERE practice_id IS NULL ORDER BY name_nl LIMIT 1`);
  const schedules: [string, string, number[]][] = [
    ['kr5_hyp_upper_lower_4d', 'Spiergroei boven/onder, 4× per week', [1, 2, 4, 5]],
    ['kr5_hyp_fullbody_3d', 'Spiergroei full body, 3× per week', [1, 3, 5]],
    ['kr2_fullbody_2d', 'Full body voor beginners, 2× per week', [1, 4]],
  ];
  for (const [key, title, days] of schedules) {
    const exists = await sql(`SELECT 1 FROM programs WHERE practice_id = $1 AND is_template AND source_key = $2`, [emma.practice_id, key]);
    if (exists.length) continue;
    const [t] = await sql<{ id: string }>(
      `INSERT INTO programs(practice_id, is_template, title, description, patient_instructions, status, module, red_flags, created_by, source_key)
       VALUES ($1, true, $2, 'intern', 'Werk binnen de herhalingenrange.', 'active', 'kracht', '["Pijn op de borst"]', $3, $4) RETURNING id`,
      [emma.practice_id, title, owner.user_id, key],
    );
    for (const [i, d] of days.entries()) {
      await sql(`INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, reps, rest_s, days) VALUES ($1,$2,$3,$4,3,10,120,$5)`, [t.id, emma.practice_id, ex.id, i, [d]]);
    }
  }
  await sql(`UPDATE patients SET strength_cleared_at = coalesce(strength_cleared_at, now()) WHERE id = $1`, [emma.id]);
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
    const page = await ctx.newPage();
    await login(page, 'patient@praktijk-a.test');
    await page.goto('/p/kracht');
    // With a programme already running the start list is folded away under "Nog een programma starten".
    const start = page.locator('#mod-start');
    await expect(start).toBeVisible();
    if (await start.evaluate((e) => e.tagName === 'DETAILS' && !(e as HTMLDetailsElement).open)) await start.locator('summary').click();
    const chooser = page.getByRole('region', { name: 'Kies je schema' });
    // Options are labels around a visually hidden radio, as a user taps them.
    const choose = async (label: string) => {
      await chooser.getByText(label, { exact: true }).click();
      await expect(chooser.getByRole('radio', { name: new RegExp(`^${label.replace(/[/×]/g, '.')}`) })).toBeChecked();
    };
    await expect(chooser).toBeVisible();
    await choose('Boven/onder');
    await choose('4×');
    await choose('Spiergroei');
    const matches = chooser.getByTestId('schedule-matches').getByRole('listitem');
    await expect(matches.first()).toContainText('Spiergroei boven/onder, 4× per week');
    await expect(matches.first()).toContainText('Past precies');
    await expectAccessible(page, 'schedule chooser');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await chooser.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'screenshots/modules/schedule-chooser.png', fullPage: true });

    // "Weet ik niet" with 2× per week: full body is advised.
    await choose('Weet ik niet');
    await choose('2×');
    await choose('Beginnen');
    await expect(chooser.getByText('Bij 2× per week past full body het best.')).toBeVisible();
    await expect(matches.first()).toContainText('Full body voor beginners, 2× per week');

    await matches.first().getByRole('button', { name: 'Bekijken en starten' }).click();
    const dlg = page.getByRole('dialog', { name: 'Full body voor beginners, 2× per week' });
    await expect(dlg).toBeVisible();
    await dlg.getByRole('button', { name: 'Annuleren' }).click();
    await ctx.close();
  } finally {
    if (!emma.strength_cleared_at) await sql(`UPDATE patients SET strength_cleared_at = NULL WHERE id = $1`, [emma.id]);
  }
});
