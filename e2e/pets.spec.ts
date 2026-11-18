import pg from 'pg';
import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

async function sql(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows;
  } finally {
    await db.end();
  }
}

/** From adventure level 2 a pet is chosen in the backpack; in the world it walks along with the hero. */
test('a greyhound chosen in the backpack follows the hero through the village', async ({ page }) => {
  test.setTimeout(300_000);
  const [emma] = await sql(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`);
  await sql('INSERT INTO hero_adventure(patient_id, xp) VALUES ($1, 500) ON CONFLICT (patient_id) DO UPDATE SET xp = GREATEST(hero_adventure.xp, 500), pet = NULL', [emma.id]);
  try {
    await page.addInitScript(() => { localStorage.setItem('fp.village.tip', '1'); });
    await login(page, 'patient@praktijk-a.test');
    await page.goto('/p/dorp');
    const village = page.getByTestId('walk-village');
    await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
    await expect(village).not.toHaveAttribute('data-pet', /./);

    // The backpack: choose a greyhound, brindle, and give it a name.
    await page.getByTestId('slot-backpack').click();
    await expect(page.getByTestId('pet-card')).toHaveAttribute('data-state', 'open');
    await page.getByTestId('pet-card').click();
    const dialog = page.getByTestId('pet-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('pet-greyhound').click();
    await dialog.getByTestId('pet-coat-1').click();
    await dialog.getByTestId('pet-name').fill('Storm');
    await page.waitForTimeout(1500);
    if (process.env.SHOTS) await page.getByRole('dialog').last().screenshot({ path: process.env.SHOTS + '/pet-dialog.png' });
    await expectAccessible(page, 'pet dialog');
    await page.getByTestId('pet-save').click();
    await expect(page.getByTestId('pet-card')).toHaveAttribute('data-state', 'chosen');
    await expect(page.getByTestId('pet-card')).toContainText('Storm');
    await page.keyboard.press('Escape');

    // In the world it walks along: after a walk it is close behind the hero.
    await expect(village).toHaveAttribute('data-pet', 'greyhound:1', { timeout: 20_000 });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(3500);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(2500);
    const [hx, hz] = ((await village.getAttribute('data-pos')) ?? '0,0').split(',').map(Number);
    const [px, pz] = ((await village.getAttribute('data-pet-pos')) ?? '99,99').split(',').map(Number);
    expect(Math.hypot(hx - px, hz - pz)).toBeLessThan(2.5);
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/pet-world.png' });

    // Back to no pet.
    expect((await page.request.put('/api/patient/hero/adventure/pet', { data: { key: null }, headers: { 'x-requested-with': 'fp' } })).status()).toBe(200);
  } finally {
    await sql('UPDATE hero_adventure SET pet = NULL, pet_name = NULL, pet_coat = 0 WHERE patient_id = $1', [emma.id]);
  }
});
