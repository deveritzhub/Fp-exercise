import { test, expect, devices } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test.describe.configure({ mode: 'serial' });

const patientEmail = `e2e.patient.${Date.now()}@voorbeeld.test`;
let patientUrl = '';
let programUrl = '';

test('therapist creates a patient and an exercise programme', async ({ page, request }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await expect(page.getByRole('heading', { name: /Joris/ })).toBeVisible();

  await page.getByRole('link', { name: 'Patiënten' }).click();
  await page.getByRole('button', { name: 'Nieuwe patiënt' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Voornaam').fill('Eva');
  await dialog.getByLabel('Achternaam').fill('Test');
  await dialog.getByLabel(/E-mailadres/).fill(patientEmail);
  await dialog.getByRole('button', { name: 'Toevoegen' }).click();
  await page.waitForURL(/\/app\/patienten\/[0-9a-f-]{36}$/);
  patientUrl = page.url();
  await expect(page.getByRole('heading', { name: 'Eva Test' })).toBeVisible();
  await expect(page.getByText(/Uitgenodigd/)).toBeVisible();

  await page.getByRole('link', { name: 'Nieuw programma' }).last().click();
  await page.waitForURL(/programmas\/nieuw\?patient=/);
  await page.getByLabel('Titel').fill('E2E — knie basis');
  const search = page.getByLabel('Oefeningen zoeken');
  await search.fill('bekkenbrug');
  await page.getByRole('button', { name: /^Toevoegen: Bekkenbrug Heup/ }).click();
  await search.fill('eenbeensstand');
  await page.getByRole('button', { name: /^Toevoegen: Eenbeensstand / }).click();
  await expect(page.getByText('Oefeningen (2)')).toBeVisible();
  // adjust dosage of the first exercise with the stepper (3 -> 4 sets)
  await page.getByRole('button', { name: 'Sets +' }).first().click();
  await expect(page.getByRole('textbox', { name: 'Sets', exact: true }).first()).toHaveValue('4');
  // keyboard-accessible reorder
  await page.getByRole('button', { name: 'Omlaag' }).first().click();
  await expect(page.locator('ol li').first()).toContainText('Eenbeensstand');
  await expectAccessible(page, 'builder');

  await page.getByRole('button', { name: 'Opslaan & toewijzen' }).click();
  await page.waitForURL(/\/app\/programmas\/[0-9a-f-]{36}$/);
  programUrl = page.url();
  await expect(page.getByText('Actief', { exact: true })).toBeVisible();

  const outbox = await request.get(`http://localhost:8788/api/dev/outbox?to=${encodeURIComponent(patientEmail)}`);
  const mail = (await outbox.json()).items[0];
  expect(mail.subject).toContain('Uitnodiging');
});

test('patient activates account on a phone and completes a session', async ({ browser, request }) => {
  const outbox = await request.get(`http://localhost:8788/api/dev/outbox?to=${encodeURIComponent(patientEmail)}`);
  const inviteUrl = /http\S+\/uitnodiging\/\S+/.exec((await outbox.json()).items[0].body)![0];
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'nl-NL' });
  const page = await ctx.newPage();
  await page.goto(inviteUrl.replace('http://localhost:5174', ''));
  await expect(page.getByRole('heading', { name: 'Welkom, Eva' })).toBeVisible();
  await page.getByLabel('Nieuw wachtwoord').fill('Eva-wachtwoord-2026');
  await page.getByLabel('Herhaal wachtwoord').fill('Eva-wachtwoord-2026');
  await page.getByRole('button', { name: 'Account activeren' }).click();
  await page.waitForURL(/\/p$/);
  await expect(page.getByRole('heading', { name: 'E2E — knie basis' })).toBeVisible();
  await expectAccessible(page, 'patient-home');

  await page.getByRole('link', { name: 'Start training' }).click();
  await page.getByRole('button', { name: 'Beginnen' }).click();
  // exercise 1
  await expect(page.getByRole('heading', { name: 'Eenbeensstand' })).toBeVisible();
  await expectAccessible(page, 'player');
  await page.getByRole('button', { name: 'Oefening gedaan' }).click();
  await page.getByRole('button', { name: 'Hoe zwaar was het?: 4', exact: true }).click();
  await page.getByRole('button', { name: 'Pijn of ongemak tijdens de oefening: 1', exact: true }).click();
  await page.getByRole('button', { name: 'Opslaan en verder' }).click();
  // exercise 2
  await expect(page.getByRole('heading', { name: 'Bekkenbrug' })).toBeVisible();
  await page.getByRole('button', { name: 'Oefening gedaan' }).click();
  await page.getByRole('button', { name: 'Hoe zwaar was het?: 6', exact: true }).click();
  await page.getByRole('button', { name: 'Pijn of ongemak tijdens de oefening: 7', exact: true }).click();
  await expect(page.getByText(/stop met deze oefening/)).toBeVisible();
  await page.getByRole('button', { name: 'Opmerking toevoegen' }).click();
  await page.getByLabel('Bericht voor je fysiotherapeut').fill('Pijn onderin de rug bij het omhoog komen');
  await page.getByRole('button', { name: 'Opslaan en verder' }).click();
  // summary
  await page.getByRole('button', { name: 'Hoe zwaar was de hele training?: 5', exact: true }).click();
  await page.getByLabel(/Bericht voor je fysiotherapeut/).fill('Ging redelijk');
  await page.getByRole('button', { name: 'Training afronden' }).click();
  await expect(page.getByRole('heading', { name: 'Training afgerond!' })).toBeVisible();
  await page.getByRole('button', { name: 'Terug naar overzicht' }).click();
  await expect(page.getByText('Klaar voor vandaag — goed gedaan!')).toBeVisible();
  await ctx.close();
});

test('therapist reviews progress and modifies the programme', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await expect(page.getByText('Eva Test').first()).toBeVisible(); // attention list (high pain + feedback)
  await page.goto(patientUrl + '?tab=sessies');
  await page.getByRole('button', { name: /E2E — knie basis/ }).click();
  await expect(page.getByText('“Ging redelijk”')).toBeVisible();
  await expect(page.getByText('“Pijn onderin de rug bij het omhoog komen”')).toBeVisible();
  await page.getByRole('button', { name: 'Markeer als gezien' }).click();
  await expect(page.getByText('Gezien').first()).toBeVisible();

  await page.goto(programUrl);
  await expect(page.getByText('Actief — de patiënt ziet versie 1.')).toBeVisible();
  await page.getByRole('button', { name: 'Herhalingen +' }).nth(1).click();
  await expect(page.getByText(/Je wijzigingen zijn nog niet gepubliceerd/)).toBeVisible();
  // Publishing an active programme first shows what changes and who is notified.
  await page.getByRole('button', { name: 'Wijzigingen publiceren…' }).click();
  const publish = page.getByRole('dialog', { name: 'Wijzigingen publiceren' });
  await expect(publish.getByText(/Gewijzigd:/).first()).toBeVisible();
  await expect(publish.getByText(/herhalingen \d+ → \d+/)).toBeVisible();
  await expect(publish.getByText(/Wie krijgt een melding/)).toBeVisible();
  await expectAccessible(page, 'publish dialog');
  await publish.getByLabel(/Wijzigingsnotitie/).fill('Herhalingen opgehoogd');
  await publish.getByRole('button', { name: 'Publiceren' }).click();
  await expect(page.getByText('Wijzigingen opgeslagen')).toBeVisible();
  await expect(page.getByText('v2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Meer', exact: true }).click();
  await page.getByRole('button', { name: 'Versiegeschiedenis' }).click();
  await expect(page.getByText(/Herhalingen opgehoogd/)).toBeVisible();
});

test('practice B cannot open practice A records, even by direct URL', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, 'therapeut@praktijk-b.test');
  await page.goto(patientUrl);
  await expect(page.getByText('Niet gevonden of geen toegang.')).toBeVisible();
  await page.goto(programUrl);
  await expect(page.getByText('Niet gevonden of geen toegang.')).toBeVisible();
  const id = patientUrl.split('/').pop();
  const api = await page.evaluate(async (pid) => (await fetch(`/api/patients/${pid}/progress`)).status, id);
  expect(api).toBe(404);
  await ctx.close();
});
