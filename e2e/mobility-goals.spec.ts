import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/**
 * "Kies je doel" on the mobility page: a menu of goals; each shows the whole chain behind it and the
 * programme that fits. Synthetic e2e data: start templates carrying the ids of the FP library programmes.
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

test('the patient picks a mobility goal and sees the whole chain and the programme for it', async ({ browser }) => {
  test.setTimeout(90_000);
  const [emma] = await sql<{ practice_id: string }>(`SELECT practice_id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  const [owner] = await sql<{ user_id: string }>(`SELECT user_id FROM practice_members WHERE practice_id = $1 ORDER BY created_at LIMIT 1`, [emma.practice_id]);
  const [ex] = await sql<{ id: string }>(`SELECT id FROM exercises WHERE practice_id IS NULL ORDER BY name_nl LIMIT 1`);
  const progs: [string, string][] = [
    ['mb3_tenen', 'Tenen aantikken: de hele achterkant'],
    ['mb2_heup_onderrug', 'Heupen en onderrug los'],
    ['mb3_spagaat_zij', 'Spagaat zijwaarts'],
  ];
  for (const [key, title] of progs) {
    if ((await sql(`SELECT 1 FROM programs WHERE practice_id = $1 AND is_template AND source_key = $2`, [emma.practice_id, key])).length) continue;
    const [t] = await sql<{ id: string }>(
      `INSERT INTO programs(practice_id, is_template, title, description, patient_instructions, status, module, red_flags, created_by, source_key)
       VALUES ($1, true, $2, 'intern', 'Rek tot een lichte spanning, niet tot pijn.', 'active', 'mobiliteit', '[]', $3, $4) RETURNING id`,
      [emma.practice_id, title, owner.user_id, key],
    );
    for (let i = 0; i < 4; i++) await sql(`INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, hold_s, days) VALUES ($1,$2,$3,$4,2,30,$5)`, [t.id, emma.practice_id, ex.id, i, [1, 3, 5]]);
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/mobiliteit');
  const start = page.locator('#mod-start');
  await expect(start).toBeVisible();
  if (await start.evaluate((e) => e.tagName === 'DETAILS' && !(e as HTMLDetailsElement).open)) await start.locator('summary').click();

  const menu = page.getByRole('region', { name: 'Kies je doel' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('radio', { name: 'Lenigheid' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByTestId('goal-tenen').click();
  // The whole back line, not only the hamstrings.
  await expect(menu.getByTestId('goal-chain')).toHaveText(/Kuit.*Hamstrings.*Bil.*Rugstrekkers/);
  await expect(menu.getByTestId('goal-detail')).toContainText('Voelt het als stijve hamstrings?');
  const programs = menu.getByTestId('goal-programs').getByRole('listitem');
  await expect(programs).toHaveCount(2);
  await expect(programs.first()).toContainText('Tenen aantikken: de hele achterkant');
  await expect(menu.getByRole('link', { name: /Meet je vooruitgang/ })).toBeVisible();
  await expectAccessible(page, 'mobility goals');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await menu.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'screenshots/modules/mobility-goals.png', fullPage: true });

  // The side split: its own chain; a goal without a programme here is not offered.
  await menu.getByTestId('goal-spagaat_zij').click();
  await expect(menu.getByTestId('goal-chain')).toHaveText(/Binnenkant bovenbeen.*Hamstrings.*Heupgewricht/);
  await menu.getByRole('radio', { name: 'Dagelijks leven' }).click();
  await expect(menu.getByTestId('goal-nek')).toHaveCount(0);
  await menu.getByRole('radio', { name: 'Lenigheid' }).click();
  await menu.getByTestId('goal-spagaat_zij').click();

  await programs.first().getByRole('button', { name: 'Bekijken en starten' }).click();
  const dlg = page.getByRole('dialog', { name: 'Spagaat zijwaarts' });
  await expect(dlg).toBeVisible();
  await dlg.getByRole('button', { name: 'Annuleren' }).click();
  await ctx.close();
});
