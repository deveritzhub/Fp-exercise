import fs from 'node:fs';
import pg from 'pg';
import { test, expect, type Browser } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/**
 * FP app update screens: red flag (W11), modes + consent + self-start (W01/W02), strength log and
 * progress (W04–W09), my data (W15). Synthetic e2e database only; module templates and red flags
 * are set up directly because they normally come from the library import.
 */
test.describe.configure({ mode: 'serial' });
const SHOTS = 'screenshots/modules';
fs.mkdirSync(SHOTS, { recursive: true });

async function sql<T = unknown>(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows as T[];
  } finally {
    await db.end();
  }
}

const phone = (browser: Browser) => browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', hasTouch: true });

let emmaProgram: string;
let emmaPatient: string;

test.beforeAll(async () => {
  const [p] = await sql<{ id: string; patient_id: string; practice_id: string; created_by: string }>(
    `SELECT id, patient_id, practice_id, created_by FROM programs WHERE title ILIKE 'Knie — patellapees%' AND NOT is_template AND status = 'active' LIMIT 1`,
  );
  emmaProgram = p.id;
  emmaPatient = p.patient_id;
  await sql(`UPDATE programs SET red_flags = '["Plotselinge knap of scheur in de knie","Toenemende zwelling of warmte"]' WHERE id = $1`, [p.id]);
  const [ex] = await sql<{ id: string }>(`SELECT id FROM exercises WHERE name_nl = 'Squat naar stoel' AND practice_id IS NULL LIMIT 1`);
  // A main lift (1RM-relevant), as in the FP strength module.
  await sql(`UPDATE exercises SET tags = array_append(tags, '1rm') WHERE id = $1 AND NOT ('1rm' = ANY(tags))`, [ex.id]);
  const [t] = await sql<{ id: string }>(
    `INSERT INTO programs(practice_id, is_template, title, description, patient_instructions, status, module, red_flags, created_by)
     VALUES ($1, true, 'Kracht basis — E2E', 'intern', 'Rustig opbouwen, techniek eerst.', 'active', 'kracht', '["Pijn op de borst","Duizeligheid"]', $2) RETURNING id`,
    [p.practice_id, p.created_by],
  );
  await sql(`INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, reps, rest_s, days, notes) VALUES ($1,$2,$3,0,3,8,90,'{1,2,3,4,5,6,7}','5-8 herhalingen')`, [t.id, p.practice_id, ex.id]);
});

test('patient reports a red flag; exercising stops until the therapist has handled it', async ({ browser, page }) => {
  const ctx = await phone(browser);
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.goto(`/p/programma/${emmaProgram}`);
  await pp.getByRole('button', { name: 'Alarmsignaal melden' }).click();
  const dlg = pp.getByRole('dialog', { name: 'Alarmsignaal melden' });
  await dlg.getByRole('button', { name: 'Melden' }).click();
  await expect(dlg.getByText('Kies wat je merkt of beschrijf het kort.')).toBeVisible();
  await dlg.getByLabel('Plotselinge knap of scheur in de knie').check();
  await expectAccessible(pp, 'red flag dialog');
  await pp.screenshot({ path: `${SHOTS}/patient-red-flag.png` });
  await dlg.getByRole('button', { name: 'Melden' }).click();
  await expect(pp.getByRole('dialog', { name: 'Stop met oefenen' })).toBeVisible();
  await expect(pp.getByText(/bij spoed 112/).first()).toBeVisible();
  await pp.getByRole('button', { name: 'Begrepen' }).click();
  await pp.goto('/p');
  await expect(pp.getByText('Je programma staat stil').first()).toBeVisible();
  await expect(pp.getByRole('link', { name: 'Start training' })).toHaveCount(0);
  await pp.screenshot({ path: `${SHOTS}/patient-paused.png`, fullPage: true });

  // Therapist: on top of the dashboard, then handled in the record.
  await login(page, 'therapeut@praktijk-a.test');
  await expect(page.getByText(/Alarmsignaal gemeld op/)).toBeVisible();
  await page.getByRole('link', { name: 'Melding afhandelen' }).first().click();
  await expect(page.getByRole('heading', { name: 'Alarmsignalen' })).toBeVisible();
  await expect(page.getByText('Plotselinge knap of scheur in de knie')).toBeVisible();
  const handle = page.getByRole('button', { name: 'Afgehandeld — patiënt mag weer oefenen' });
  await expect(handle).toBeDisabled();
  await page.getByLabel('Wat is er afgesproken?').fill('Gebeld; knie beoordeeld, oefenen mag weer met lagere dosering.');
  await expectAccessible(page, 'modules tab');
  await page.screenshot({ path: `${SHOTS}/therapist-red-flag.png`, fullPage: true });
  await handle.click();
  await expect(page.getByText('Afgehandeld', { exact: true })).toBeVisible();

  await pp.reload();
  await expect(pp.getByText('Je programma staat stil')).toHaveCount(0);
  await ctx.close();
});

test('strength: transition check by the therapist, consent and self-start by the patient, sets logged', async ({ browser, page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto(`/app/patienten/${emmaPatient}?tab=modules`);
  const confirm = page.getByRole('button', { name: 'Bevestigen: klaar voor krachttraining' });
  await expect(confirm).toBeDisabled();
  // The transition checklist is the only checklist on this tab.
  const boxes = page.getByRole('checkbox');
  await expect(boxes).toHaveCount(4);
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).check();
    await expect(boxes.nth(i)).toBeChecked();
  }
  await confirm.click();
  await expect(page.getByText(/Vrijgegeven door Joris Bakker/)).toBeVisible();

  const ctx = await phone(browser);
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.getByRole('radio', { name: 'Kracht' }).click();
  await expect(pp.getByText('Je krachttraining is alleen voor jou')).toBeVisible();
  await pp.getByRole('button', { name: 'Delen met mijn fysiotherapeut' }).click();
  await expect(pp.getByText('Je deelt krachttraining met je fysiotherapeut')).toBeVisible();
  await expectAccessible(pp, 'patient strength mode');
  await pp.screenshot({ path: `${SHOTS}/patient-mode-strength.png`, fullPage: true });
  await pp.getByRole('button', { name: 'Starten' }).first().click();
  await expect(pp.getByRole('dialog', { name: 'Kracht basis — E2E' }).getByText('Pijn op de borst')).toBeVisible();
  await pp.getByRole('button', { name: 'Programma starten' }).click();
  await expect(pp.getByRole('heading', { name: 'Kracht basis — E2E' })).toBeVisible();

  await pp.getByRole('link', { name: 'Start training' }).click();
  await pp.getByRole('button', { name: 'Beginnen' }).click();
  await expect(pp.getByText('Sets loggen')).toBeVisible();
  await pp.getByLabel('Gewicht set 1 (kg)').fill('40');
  await pp.getByLabel('Herhalingen set 1').fill('8');
  await expect(pp.getByText('Geschatte 1RM vandaag: 50 kg')).toBeVisible();
  // The weight is carried over to the next (empty) sets.
  await expect(pp.getByLabel('Gewicht set 3 (kg)')).toHaveValue('40');
  await pp.getByRole('button', { name: 'Set 1 opslaan' }).click();
  await expect(pp.getByRole('dialog', { name: 'Rustpauze' })).toBeVisible();
  await pp.getByRole('button', { name: 'Klaar' }).click();
  // "Last time" does not change because of the set just saved.
  await expect(pp.getByText(/Vorige keer/)).toHaveCount(0);
  await expectAccessible(pp, 'strength logger');
  await pp.screenshot({ path: `${SHOTS}/patient-strength-log.png`, fullPage: true });
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await pp.goto('/p/voortgang');
  await expect(pp.getByRole('heading', { name: 'Kracht' })).toBeVisible();
  await expect(pp.getByText(/Beste: 50 kg/)).toBeVisible();
  await expect(pp.getByText(/vanaf week 5/)).toBeVisible();

  // Therapist sees the shared strength progress.
  await page.reload();
  await expect(page.getByText(/beste 50 kg/)).toBeVisible();

  // Back to rehabilitation for the other specs.
  await pp.goto('/p');
  await pp.getByRole('radio', { name: 'Revalidatie' }).click();
  await expect(pp.getByRole('radio', { name: 'Revalidatie' })).toHaveAttribute('aria-checked', 'true');
  await ctx.close();
});

test('patient downloads their data and requests deletion; the owner declines with a reason', async ({ browser, page }) => {
  const ctx = await phone(browser);
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.goto('/p/account');
  const dl = pp.getByRole('link', { name: 'Download al mijn gegevens' });
  await expect(dl).toHaveAttribute('href', '/api/patient/export');
  const exp = await (await pp.request.get('/api/patient/export')).json();
  expect(exp.strengthSets.length).toBeGreaterThan(0);
  await pp.getByRole('button', { name: 'Vraag verwijdering aan' }).click();
  await pp.getByLabel('Reden (optioneel)').fill('E2E: wil stoppen');
  await pp.getByRole('button', { name: 'Versturen' }).click();
  await expect(pp.getByText(/gevraagd je gegevens te verwijderen/)).toBeVisible();
  await expectAccessible(pp, 'patient my data');
  await pp.screenshot({ path: `${SHOTS}/patient-my-data.png`, fullPage: true });

  await login(page, 'eigenaar@praktijk-a.test');
  await page.goto(`/app/patienten/${emmaPatient}?tab=modules`);
  await expect(page.getByText('E2E: wil stoppen', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Gegevens verwijderen' }).click();
  await expect(page.getByRole('button', { name: 'Verwijderen', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Annuleren' }).click();
  await page.getByRole('button', { name: 'Afwijzen met reden' }).click();
  await page.getByLabel(/Reden/).fill('Wettelijke bewaartermijn van het dossier');
  await page.getByRole('button', { name: 'Afwijzen', exact: true }).click();
  await expect(page.getByText(/Afgewezen ·/)).toBeVisible();
  await pp.reload();
  await expect(pp.getByText(/eerdere verzoek is op .* afgewezen/)).toBeVisible();
  await ctx.close();
});
