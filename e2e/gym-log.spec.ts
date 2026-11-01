import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('krachtlog: the patient logs sets with a live 1RM meter; the therapist logs in the practice', async ({ browser }) => {
  test.setTimeout(120_000);
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  await db.query('DELETE FROM gym_sets');
  const pid = (await db.query(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-b.test'`)).rows[0].id;
  // An earlier gym day, so today's heavier set is a new record.
  await db.query(
    `INSERT INTO gym_sets(patient_id, practice_id, day, exercise_name, set_no, weight_kg, reps, place, logged_by)
     SELECT p.id, p.practice_id, current_date - 7, 'Squat', 1, 80, 5, 'gym', p.user_id FROM patients p WHERE p.id = $1`,
    [pid],
  );
  await db.end();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  // Reachable from the logbook.
  await pp.goto('/p/logboek');
  await pp.getByRole('link', { name: /Krachtlog en 1RM-meter/ }).click();
  await expect(pp).toHaveURL(/\/p\/kracht$/);
  await expect(pp.getByRole('heading', { name: 'Krachtlog', level: 1 })).toBeVisible();

  // Picking a recent exercise fills in the last weight and reps; the meter shows the estimate.
  await pp.getByRole('button', { name: 'Squat' }).first().click();
  await expect(pp.getByRole('combobox', { name: 'Oefening' })).toHaveValue('Squat');
  await expect(pp.getByText('91,5 kg').first()).toBeVisible();
  await expect(pp.getByText('100% van je beste 91,5 kg')).toBeVisible();
  // Heavier: the meter says it will be a record.
  await pp.getByRole('button', { name: '2,5 kg meer' }).click();
  await pp.getByRole('button', { name: '2,5 kg meer' }).click();
  await expect(pp.getByText(/Dit wordt een nieuw record/)).toBeVisible();
  await expectAccessible(pp, 'gym log');
  await pp.getByRole('button', { name: 'Set opslaan' }).click();
  await expect(pp.getByText(/Nieuw record! Geschat 1RM 97,5 kg/)).toBeVisible();
  await expect(pp.getByRole('heading', { name: 'Vandaag' })).toBeVisible();
  await expect(pp.getByText('Squat · set 1')).toBeVisible();
  await expect(pp.getByText('Record', { exact: true })).toBeVisible();

  // More than 10 reps: no estimate, still saved as volume.
  await pp.getByRole('combobox', { name: 'Oefening' }).fill('Leg press');
  for (let i = 0; i < 7; i++) await pp.getByRole('button', { name: '1 herhaling meer' }).click();
  await expect(pp.getByText(/Boven 10 herhalingen/)).toBeVisible();
  await pp.getByRole('button', { name: 'Set opslaan' }).click();
  await expect(pp.getByText('Set 1 opgeslagen')).toBeVisible();

  // Percentage calculator from the best 1RM.
  await pp.getByRole('button', { name: 'Squat' }).first().click();
  await pp.getByRole('button', { name: /Rekenhulp/ }).click();
  await expect(pp.getByRole('cell', { name: '80%' })).toBeVisible();
  expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await pp.screenshot({ path: 'screenshots/gym/patient.png', fullPage: true });
  await ctx.close();

  // The therapist logs a set in the practice, from the patient's record.
  const tctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const tp = await tctx.newPage();
  await login(tp, 'therapeut@praktijk-b.test');
  await tp.goto(`/app/patienten/${pid}?tab=kracht`);
  await expect(tp.getByText(/Je ziet alleen wat in de praktijk is gelogd/)).toBeVisible();
  await tp.getByRole('combobox', { name: 'Oefening' }).fill('Leg extension');
  await tp.getByRole('button', { name: 'Set opslaan' }).click();
  await expect(tp.getByText('Set 1 opgeslagen')).toBeVisible();
  await expect(tp.getByText(/Leg extension · set 1/)).toBeVisible();
  // Without consent the gym sets stay private.
  await expect(tp.getByText('Leg press')).toHaveCount(0);
  await expectAccessible(tp, 'gym log therapist');
  await tctx.close();
});
