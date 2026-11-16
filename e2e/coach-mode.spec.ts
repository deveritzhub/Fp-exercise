import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** A coach practice is deliberately non-medical: no complaint guide anywhere. Practice B is made a coach temporarily. */
test('coach practice: no complaint guide in menu, quick search, get started or by direct link', async ({ page }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const pid = (await db.query(`SELECT id FROM practices WHERE slug = 'fysio-noord-demo'`)).rows[0].id;
  await db.query(`ALTER TABLE practices DISABLE TRIGGER USER`);
  await db.query(`UPDATE practices SET kind = 'coach' WHERE id = $1`, [pid]);
  try {
    await login(page, 'therapeut@praktijk-b.test');
    await expect(page.getByRole('heading', { name: /Goede(morgen|middag|navond)/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Hoofdmenu' }).getByRole('link', { name: 'Klachtwijzer' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /klachtwijzer/i })).toHaveCount(0);
    // Quick search finds no complaints.
    await page.keyboard.press('Control+k');
    await page.keyboard.type('loperknie');
    await expect(page.getByRole('option', { name: /Loperknie/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    // A direct link goes back to the dashboard.
    await page.goto('/app/klachtwijzer?regio=knie&klacht=itbs');
    await expect(page).toHaveURL(/\/app$/);
    // "What's new" has no complaint-guide items.
    await page.getByRole('button', { name: /Wat is er nieuw\?/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Wat is er nieuw?' });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText(/klachtwijzer|klacht/i)).toHaveCount(0);
  } finally {
    await db.query(`UPDATE practices SET kind = 'physio' WHERE id = $1`, [pid]);
    await db.query(`ALTER TABLE practices ENABLE TRIGGER USER`);
    await db.end();
  }
});

test('coach client: pain rising gets a non-medical tip, and "What\'s new" has no complaint items', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const pt = (await db.query(`SELECT p.id, p.practice_id, p.user_id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-b.test'`)).rows[0];
  await db.query(`DELETE FROM programs WHERE title = 'Coach E2E'`);
  const prog = (await db.query(
    `INSERT INTO programs(practice_id, patient_id, title, status, module, created_by, version) VALUES ($1, $2, 'Coach E2E', 'active', 'kracht', $3, 1) RETURNING id`,
    [pt.practice_id, pt.id, pt.user_id],
  )).rows[0].id;
  for (const [d, pain] of [[1, 6], [2, 4], [3, 2]])
    await db.query(
      `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at, difficulty, pain)
       VALUES ($1, $2, $3, 1, now() - make_interval(days => $4), now() - make_interval(days => $4) + interval '20 minutes', 5, $5)`,
      [pt.practice_id, pt.id, prog, d, pain],
    );
  await db.query(`ALTER TABLE practices DISABLE TRIGGER USER`);
  await db.query(`UPDATE practices SET kind = 'coach' WHERE id = $1`, [pt.practice_id]);
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page, 'patient@praktijk-b.test');
    await page.goto('/p/kracht');
    const tip = page.getByRole('status').filter({ hasText: 'Je lichaam voelt na het trainen steeds minder goed' });
    await expect(tip).toBeVisible();
    await expect(tip).not.toContainText('fysiotherapeut');
    await page.goto('/p/instellingen');
    await page.getByRole('button', { name: /Wat is er nieuw\?/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Wat is er nieuw?' });
    await expect(dlg.getByText(/Je dorp groeit mee/)).toBeVisible();
    await expect(dlg.getByText(/klacht/i)).toHaveCount(0);
    await ctx.close();
  } finally {
    await db.query(`UPDATE practices SET kind = 'physio' WHERE id = $1`, [pt.practice_id]);
    await db.query(`ALTER TABLE practices ENABLE TRIGGER USER`);
    await db.query(`DELETE FROM workout_sessions WHERE program_id = $1`, [prog]);
    await db.query(`DELETE FROM programs WHERE id = $1`, [prog]);
    await db.end();
  }
});
