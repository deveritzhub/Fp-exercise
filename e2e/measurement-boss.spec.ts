import { mkdirSync } from 'node:fs';
import pg from 'pg';
import { expect, test } from '@playwright/test';
import { expectAccessible, login } from './helpers';

const SHOTS = 'screenshots/world-map';

test('measurement boss, heirloom and therapist goal form', async ({ browser }) => {
  test.setTimeout(120_000);
  mkdirSync(SHOTS, { recursive: true });
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const emma = (await db.query(
    `SELECT p.id AS patient_id, pr.id AS program_id FROM patients p
      JOIN users u ON u.id = p.user_id
      JOIN programs pr ON pr.patient_id = p.id AND pr.status = 'active'
     WHERE u.email = 'patient@praktijk-a.test' LIMIT 1`,
  )).rows[0];

  const staffCtx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const staff = await staffCtx.newPage();
  try {
    await login(staff, 'therapeut@praktijk-a.test');
    await staff.goto(`/app/programmas/${emma.program_id}`);
    const form = staff.locator('form[aria-labelledby="boss-goal-title"]');
    await form.scrollIntoViewIfNeeded();
    await form.getByLabel('Naam van de meting').fill('Kniebuiging');
    await form.getByLabel('Streefwaarde').fill('120');
    await form.getByLabel('Naam voor de patiënt').fill('Knie buigen');
    await form.getByLabel('Engelse naam').fill('Bend the knee');
    await form.getByRole('button', { name: 'Doel opslaan' }).click();
    await expect(staff.getByText('Doel bijwerken')).toBeVisible();
    await form.screenshot({ path: `${SHOTS}/boss-form-360.png`, animations: 'disabled' });

    await staff.goto(`/app/patienten/${emma.patient_id}`);
    await staff.getByRole('button', { name: 'Meetmoment vastleggen' }).click();
    const record = async (value: string, day: string) => {
      await staff.getByLabel('Testnaam / schaal').fill('Kniebuiging');
      await staff.getByLabel('Gemeten waarde').fill(value);
      await staff.getByLabel('Meetdatum').fill(day);
      await staff.getByRole('button', { name: 'Meetmoment opslaan' }).click();
      await expect(staff.getByText('Kniebuiging').first()).toBeVisible();
    };
    await record('90', '2026-10-01');
    await staff.getByRole('button', { name: 'Meetmoment vastleggen' }).click();
    await record('105', '2026-10-15');

    const patientCtx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
    const patient = await patientCtx.newPage();
    await login(patient, 'patient@praktijk-a.test');
    await patient.goto('/p/held/inventaris');
    await expect(patient.getByRole('heading', { name: 'Kracht-erfstuk' })).toBeVisible();
    await patient.getByRole('button', { name: 'Schild' }).click();
    await expect(patient.getByText(/vorm [1-5] van 5/)).toBeVisible();
    await patient.locator('[aria-labelledby="heirloom-title"]').screenshot({ path: `${SHOTS}/heirloom-360.png`, animations: 'disabled' });

    await patient.goto('/p/wereld');
    await expect(patient.getByText('nog 15°')).toBeVisible();
    await patient.getByText('nog 15°').scrollIntoViewIfNeeded();
    await patient.screenshot({ path: `${SHOTS}/boss-360.png`, animations: 'disabled' });

    await staff.getByRole('button', { name: 'Meetmoment vastleggen' }).click();
    await record('120', '2026-11-01');
    await patient.reload();
    await expect(patient.getByText('Doel gehaald. Je therapeut beoordeelt de volgende stap.').first()).toBeVisible();
    await patient.getByText('Doel gehaald. Je therapeut beoordeelt de volgende stap.').first().scrollIntoViewIfNeeded();
    await patient.screenshot({ path: `${SHOTS}/boss-won-360.png`, animations: 'disabled' });
    await expectAccessible(patient, 'measurement boss');

    await staff.goto('/app');
    await expect(staff.getByText('Fasedoel gehaald').first()).toBeVisible();
    const phase = (await db.query('SELECT phase_no, status FROM programs WHERE id = $1', [emma.program_id])).rows[0];
    expect(phase.status).toBe('active');
    await patientCtx.close();
  } finally {
    await staffCtx.close();
    await db.query('DELETE FROM phase_boss_goals WHERE program_id = $1', [emma.program_id]);
    await db.query(`DELETE FROM patient_outcomes WHERE patient_id = $1 AND metric = 'Kniebuiging'`, [emma.patient_id]);
    await db.query('ALTER TABLE patient_heroes DISABLE TRIGGER heirloom_guard');
    await db.query('UPDATE patient_heroes SET heirloom = NULL, heirloom_best = 0 WHERE patient_id = $1', [emma.patient_id]);
    await db.query('ALTER TABLE patient_heroes ENABLE TRIGGER heirloom_guard');
    await db.query(`DELETE FROM notifications WHERE kind = 'boss_met' AND link LIKE $1`, [`%/patienten/${emma.patient_id}%`]);
    await db.end();
  }
});
