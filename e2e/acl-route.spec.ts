import { mkdirSync } from 'node:fs';
import pg from 'pg';
import { expect, test } from '@playwright/test';
import { expectAccessible, login } from './helpers';

const SHOTS = 'screenshots/world-map';

test('ACL route bosses, heirloom bar and clinical review fit a phone', async ({ browser }) => {
  test.setTimeout(120_000);
  mkdirSync(SHOTS, { recursive: true });
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const mila = (await db.query(`SELECT p.id FROM patients p WHERE p.email = 'vkb@praktijk-a.test'`)).rows[0];
  const phase = (await db.query(
    `SELECT id FROM programs WHERE patient_id = $1 AND series_key = 'acl_vkb_flagship' AND phase_no = 4`,
    [mila.id],
  )).rows[0];

  const patientCtx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const patient = await patientCtx.newPage();
  const staffCtx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const staff = await staffCtx.newPage();
  try {
    await login(patient, 'vkb@praktijk-a.test');
    await patient.goto('/p/wereld');
    await expect(patient.getByRole('button', { name: /De Poort/ })).toBeVisible();
    await expect(patient.getByRole('button', { name: /Het Veld/ })).toBeVisible();
    await expect(patient.getByText('De Terugkeer').first()).toBeVisible();
    await patient.screenshot({ path: `${SHOTS}/acl-map-360.png`, fullPage: true, animations: 'disabled' });

    const bar = patient.getByText('Kracht voorkant been 72% → doel 80%');
    await expect(bar).toBeVisible();
    await bar.scrollIntoViewIfNeeded();
    await patient.locator('[data-zone-status="current"]').screenshot({ path: `${SHOTS}/acl-boss-360.png`, animations: 'disabled' });

    const won = patient.getByText('Doel gehaald. Je therapeut beoordeelt de volgende stap.').first();
    await won.scrollIntoViewIfNeeded();
    await patient.locator('[data-zone-status="done"]').first().screenshot({ path: `${SHOTS}/acl-victory-360.png`, animations: 'disabled' });
    await expectAccessible(patient, 'acl world');

    const locked = patient.getByRole('button', { name: /Het Veld/ });
    await locked.click();
    const sheet = patient.getByRole('dialog');
    await expect(sheet).toContainText('Je therapeut geeft deze zone vrij');
    await expect(sheet).not.toContainText('ACL-RSI');
    await expect(sheet).not.toContainText('90%');
    await patient.keyboard.press('Escape');

    await login(staff, 'therapeut@praktijk-a.test');
    await staff.goto(`/app/programmas/${phase.id}`);
    const form = staff.locator('form[aria-labelledby="boss-goal-title"]');
    await form.scrollIntoViewIfNeeded();
    await expect(form).toContainText('Standaardwaarden');
    await expect(form.getByText('80').first()).toBeVisible();
    await form.screenshot({ path: `${SHOTS}/acl-form-360.png`, animations: 'disabled' });
    await expectAccessible(staff, 'acl boss form');

    await staff.goto('/app/klachtwijzer/controle');
    const review = staff.locator('section[aria-labelledby="rv-acl"]');
    await review.scrollIntoViewIfNeeded();
    await expect(review).toContainText('De Zwelling');
    await expect(review).toContainText('ACL-RSI');
    await expect(review).toContainText('Standaardwaarden');
    await review.screenshot({ path: `${SHOTS}/acl-review-360.png`, animations: 'disabled' });

    await staff.goto(`/app/patienten/${mila.id}?tab=vkb`);
    await expect(staff.getByRole('heading', { name: 'VKB-criteria' })).toBeVisible();
    await expect(staff.getByText('LSI').first()).toBeVisible();
    const phaseCard = staff.locator('#acl-phase-4').locator('xpath=ancestor::section[1]');
    await phaseCard.screenshot({ path: `${SHOTS}/acl-criteria-360.png`, animations: 'disabled' });
    await staff.getByRole('button', { name: 'Testsessie invoeren' }).click();
    const testDialog = staff.getByRole('dialog', { name: 'Testsessie' });
    await testDialog.getByRole('group', { name: 'Quadriceps' }).getByLabel('Links').fill('50');
    await testDialog.getByRole('group', { name: 'Quadriceps' }).getByLabel('Rechts').fill('36');
    await expect(testDialog.locator('[data-lsi="quad"]')).toContainText('72%');
    await testDialog.screenshot({ path: `${SHOTS}/acl-test-360.png`, animations: 'disabled' });
    await staff.keyboard.press('Escape');

    const lucas = (await db.query(`SELECT id FROM patients WHERE email = 'lucas.jansen@voorbeeld.test'`)).rows[0];
    await staff.goto(`/app/patienten/${lucas.id}?tab=vkb`);
    await staff.getByRole('button', { name: 'VKB-route toewijzen' }).click();
    const assign = staff.getByRole('dialog', { name: 'VKB-route toewijzen' });
    await expect(assign).toContainText('Standaardwaarden');
    await assign.screenshot({ path: `${SHOTS}/acl-assign-360.png`, animations: 'disabled' });
    await assign.getByRole('button', { name: 'Annuleren' }).click();

    await staff.goto('/app/patienten?filter=acl');
    await expect(staff.getByRole('button', { name: /VKB-route/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(staff.getByText('Mila de Vries')).toBeVisible();
    await staff.screenshot({ path: `${SHOTS}/acl-patients-360.png`, animations: 'disabled' });
  } finally {
    await patientCtx.close();
    await staffCtx.close();
    await db.end();
  }
});
