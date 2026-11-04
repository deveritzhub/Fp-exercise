import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test.setTimeout(120_000);

test('patient measures mobility with a published test and sees the trend; staff only see it when shared', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const pid = (await db.query(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`)).rows[0].id as string;
  await db.query('DELETE FROM mobility_tests WHERE patient_id = $1', [pid]);
  // A first measurement two weeks ago, so there is a trend.
  await db.query(
    `INSERT INTO mobility_tests(patient_id, practice_id, test, side, day, cm)
     SELECT $1, practice_id, 'knee_to_wall', s, now()::date - 14, v FROM patients, (VALUES ('left', 7.0), ('right', 9.0)) x(s, v) WHERE id = $1`,
    [pid],
  );
  // Remember the mobility sharing state, then switch it off.
  const consents = (await db.query(`SELECT id FROM patient_module_consents WHERE patient_id = $1 AND module = 'mobiliteit' AND revoked_at IS NULL`, [pid])).rows.map((r) => r.id as string);
  await db.query(`UPDATE patient_module_consents SET revoked_at = now(), revoked_by = granted_by WHERE id = ANY($1::uuid[])`, [consents]);

  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, locale: 'nl-NL' });
    const page = await ctx.newPage();
    await login(page, 'patient@praktijk-a.test');
    await page.goto('/p/mobiliteit');
    // The last measurement is two weeks old: time to measure again.
    await expect(page.getByRole('link', { name: /Mobiliteit meten.*Tijd om opnieuw te meten/ })).toBeVisible();
    await page.getByRole('link', { name: /Mobiliteit meten/ }).click();
    await expect(page.getByRole('status').filter({ hasText: /Tijd om opnieuw te meten: je laatste meting is 14 dagen oud/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mobiliteit meten', level: 1 })).toBeVisible();
    const card = page.locator('section', { has: page.getByRole('heading', { name: /Knie-tot-muur-test/ }) });
    await expect(card.locator('dl').getByText('7 cm')).toBeVisible();

    await card.getByRole('button', { name: 'Opnieuw meten' }).click();
    const dlg = page.getByRole('dialog', { name: /Knie-tot-muur-test/ });
    await expect(dlg.getByText(/hiel blijft op de grond/)).toBeVisible();
    await expect(dlg.getByText(/Stop bij pijn/)).toBeVisible();
    await expectAccessible(page, 'mobility measure dialog');
    await dlg.getByLabel('Links (cm)').fill('10,5');
    await dlg.getByLabel('Rechts (cm)').fill('9');
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    await expect(dlg).toBeHidden();
    // XP for measuring (not for the result), once per two weeks.
    await expect(page.getByText('Meting opgeslagen: +20 XP')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Vandaag gemeten. Over 2 weken weer.' })).toBeVisible();
    // Left: 3.5 cm more than the first, beyond the measurement error; right: no change.
    await expect(card.locator('dl').getByText('10,5 cm')).toBeVisible();
    await expect(card.getByText(/beweeglijker dan je eerste meting \(3,5 cm\)/)).toBeVisible();
    await expect(card.getByText('gelijk aan je eerste meting')).toBeVisible();
    await expect(card.getByText('Verschil links-rechts: 1,5 cm')).toBeVisible();
    await expect(card.getByRole('img', { name: /Verloop van je metingen/ })).toBeVisible();

    // A test that can come short: gap or overlap, entered as a choice.
    const scratch = page.locator('section', { has: page.getByRole('heading', { name: /Rugkrabtest/ }) });
    await scratch.getByRole('button', { name: 'Meten' }).click();
    const d2 = page.getByRole('dialog', { name: /Rugkrabtest/ });
    await d2.getByLabel('Links (cm)').fill('6');
    await d2.getByRole('radiogroup', { name: /Richting rechts/ }).getByRole('radio', { name: 'Overlap' }).click();
    await d2.getByLabel('Rechts (cm)').fill('2');
    await d2.getByRole('button', { name: 'Opslaan' }).click();
    await expect(page.getByText('Meting opgeslagen', { exact: true })).toBeVisible();
    await expect(scratch.locator('dl').getByText('-6 cm')).toBeVisible();
    await expect(scratch.locator('dl').getByText('2 cm', { exact: true })).toBeVisible();
    await expectAccessible(page, 'mobility tests page');
    await ctx.close();

    // Staff: private until the patient shares mobility.
    const sctx = await browser.newContext();
    const staff = await sctx.newPage();
    await login(staff, 'therapeut@praktijk-a.test');
    await staff.goto(`/app/patienten/${pid}?tab=mobiliteit`);
    await expect(staff.getByText(/deelt het onderdeel Mobiliteit niet/)).toBeVisible();
    const db2 = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db2.connect();
    await db2.query(
      `INSERT INTO patient_module_consents(patient_id, practice_id, module, granted_by) SELECT id, practice_id, 'mobiliteit', user_id FROM patients WHERE id = $1`,
      [pid],
    );
    await db2.end();
    await staff.reload();
    await expect(staff.getByRole('heading', { name: /Knie-tot-muur-test/ })).toBeVisible();
    await expect(staff.locator('dl').getByText('10,5 cm')).toBeVisible();
    await expect(staff.getByRole('button', { name: /Meten/ })).toHaveCount(0);
    await sctx.close();
  } finally {
    const db3 = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await db3.connect();
    await db3.query('DELETE FROM mobility_tests WHERE patient_id = $1', [pid]);
    await db3.query(`DELETE FROM patient_module_consents WHERE patient_id = $1 AND module = 'mobiliteit' AND NOT (id = ANY($2::uuid[]))`, [pid, consents]);
    await db3.query(`UPDATE patient_module_consents SET revoked_at = NULL, revoked_by = NULL WHERE id = ANY($1::uuid[])`, [consents]);
    await db3.end();
    await db.end();
  }
});
