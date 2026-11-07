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
  await expect(pp).toHaveURL(/\/p\/krachtlog$/);
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

test('own routine: build it, log it set by set with RIR, then delete it', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  await pp.goto('/p/krachtlog');
  await expect(pp.getByRole('heading', { name: 'Mijn schema’s' })).toBeVisible();

  // Build a routine with two exercises.
  await pp.getByRole('button', { name: 'Nieuw', exact: true }).click();
  const dlg = pp.getByRole('dialog', { name: 'Nieuw schema' });
  await dlg.getByLabel('Naam').fill('E2E benen');
  await dlg.getByRole('combobox', { name: 'Oefening toevoegen' }).fill('Squat');
  await dlg.getByRole('button', { name: 'Toevoegen' }).click();
  await dlg.getByRole('combobox', { name: 'Oefening toevoegen' }).fill('Hip thrust');
  await dlg.getByRole('button', { name: 'Toevoegen' }).click();
  await dlg.getByRole('button', { name: 'Sets Hip thrust: meer' }).click();
  await expectAccessible(pp, 'routine editor');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect(pp.getByText('E2E benen')).toBeVisible();

  // Advanced: track RIR. Start the routine: last time's squat weight is filled in.
  await pp.getByRole('checkbox', { name: /Geavanceerd: RIR bijhouden/ }).check();
  await pp.getByRole('button', { name: 'Start E2E benen' }).click();
  await expect(pp.getByRole('heading', { name: 'E2E benen' })).toBeVisible();
  await expect(pp.getByLabel('Gewicht set 1 Squat (kg)')).not.toHaveValue('');
  await pp.getByRole('radiogroup').first().getByRole('radio', { name: '2' }).click();
  await pp.getByRole('button', { name: 'Set 1 Squat opslaan' }).click();
  await expect(pp.getByRole('button', { name: 'Set 1 Squat opgeslagen' })).toBeVisible();
  await expect(pp.getByText(/RIR 2/).first()).toBeVisible();
  await expectAccessible(pp, 'routine session');
  await pp.screenshot({ path: 'screenshots/gym/routine.png', fullPage: true });
  await pp.getByRole('button', { name: 'Training afronden' }).click();
  await expect(pp.getByRole('heading', { name: 'Training gelogd!' })).toBeVisible();
  await pp.getByRole('button', { name: 'Klaar' }).click();

  // Clean up: delete the routine and today's squat set.
  await pp.getByRole('button', { name: 'E2E benen bewerken' }).click();
  await pp.getByRole('dialog', { name: 'Schema bewerken' }).getByRole('button', { name: 'Verwijderen' }).click();
  await expect(pp.getByText('Schema verwijderd')).toBeVisible();
  const gym = await (await pp.request.get('/api/patient/gym', { headers: { 'x-requested-with': 'fp' } })).json();
  for (const s of gym.sets.filter((x: { rir: number | null; mine: boolean }) => x.rir === 2 && x.mine)) await pp.request.delete(`/api/patient/gym/sets/${s.id}`, { headers: { 'x-requested-with': 'fp' } });
  await ctx.close();
});

test('next-time suggestion from RIR and the history chart per exercise', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  await db.query(`DELETE FROM gym_sets WHERE exercise_name = 'Bench press'`);
  const pid = (await db.query(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-b.test'`)).rows[0].id;
  // Two earlier sessions; the last one had 3 reps in reserve.
  for (const [ago, w, rir] of [[6, 55, 1], [2, 60, 3]] as const) {
    await db.query(
      `INSERT INTO gym_sets(patient_id, practice_id, day, exercise_name, set_no, weight_kg, reps, rir, place, logged_by)
       SELECT p.id, p.practice_id, current_date - $2::int, 'Bench press', 1, $3, 8, $4, 'gym', p.user_id FROM patients p WHERE p.id = $1`,
      [pid, ago, w, rir],
    );
  }
  await db.end();

  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  await pp.goto('/p/krachtlog');
  await pp.getByRole('button', { name: 'Bench press' }).first().click();
  const next = pp.getByRole('group', { name: /^Voorstel/ });
  await expect(next).toContainText('62,5 kg × 8');
  await expect(next).toContainText('nog 3 over');
  await next.getByRole('button', { name: 'Gebruik' }).click();
  await expect(pp.getByRole('textbox', { name: 'Gewicht' }).or(pp.locator('input[aria-labelledby="gym-w"]'))).toHaveValue('62,5');

  const card = pp.locator('li', { has: pp.getByRole('button', { name: /^Bench press/ }) }).last();
  await card.getByRole('button', { name: /Verloop \(2 trainingen\)/ }).click();
  await expect(card.getByText('RIR 3')).toBeVisible();
  await expectAccessible(pp, 'krachtlog suggestion and history');
  expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await pp.screenshot({ path: 'screenshots/gym/suggestion.png', fullPage: true });
  await ctx.close();
});
