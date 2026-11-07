import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('a released phase: the patient sees "Chapter 1 completed" once, and it stays under Messages', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const pt = (await db.query(`SELECT p.practice_id, p.user_id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-b.test'`)).rows[0];
  const n = (await db.query(
    `INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1, $2, 'phase_unlocked', 'Hoofdstuk 1 voltooid!', 'Je fysiotherapeut heeft fase 2: Kracht opbouwen vrijgegeven. Nieuw doel: Traplopen zonder pijn', '/p/revalidatie') RETURNING id`,
    [pt.user_id, pt.practice_id],
  )).rows[0].id;
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page, 'patient@praktijk-b.test');
    await page.goto('/p');
    const dlg = page.getByRole('dialog', { name: 'Hoofdstuk 1 voltooid!' });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText(/fase 2: Kracht opbouwen/)).toBeVisible();
    await expectAccessible(page, 'phase celebration');
    await dlg.getByRole('button', { name: 'Naar je nieuwe fase' }).click();
    await expect(page).toHaveURL(/\/p\/revalidatie/);
    await page.reload();
    await expect(page.getByRole('dialog', { name: 'Hoofdstuk 1 voltooid!' })).toHaveCount(0);
    await page.goto('/p/berichten');
    await expect(page.getByText('Hoofdstuk 1 voltooid!')).toBeVisible();
    await ctx.close();
  } finally {
    await db.query('DELETE FROM notifications WHERE id = $1', [n]);
    await db.end();
  }
});
