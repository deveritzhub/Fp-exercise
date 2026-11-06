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
