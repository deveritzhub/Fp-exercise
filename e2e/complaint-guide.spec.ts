import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test.setTimeout(120_000);

test('complaint guide: search, chain, compensation with test, red flags, proposal, one tap to a programme', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.getByRole('link', { name: 'Klachtwijzer' }).first().click();
  await expect(page.getByRole('heading', { name: 'Klachtwijzer', level: 1 })).toBeVisible();
  await expectAccessible(page, 'complaint guide start');

  // Everyday word finds the complaint.
  await page.getByLabel('Klacht zoeken').fill('loperknie');
  await page.getByRole('button', { name: /Loperknie \(ITBS\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Loperknie (ITBS)', level: 2 })).toBeVisible();
  await expect(page.getByText('Laterale heupketen').first()).toBeVisible();

  // The main compensation is open, with a quick test; the TFL is to offload, the glute medius to train.
  const comp = page.locator('details', { hasText: 'TFL-overuse bij zwakke gluteus medius' });
  await expect(comp.getByText(/Trendelenburg/)).toBeVisible();
  await expect(comp.getByRole('link', { name: 'Middelste bilspier' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Rode vlaggen/ })).toBeVisible();

  // Proposal from the library, never the seated machine abduction; ticked items go to the builder.
  const proposal = page.getByRole('region', { name: /Oefenvoorstel/ });
  await expect(proposal.getByRole('checkbox').first()).toBeVisible();
  await expect(proposal.getByText(/machine/i)).toHaveCount(0);
  await expectAccessible(page, 'complaint card');
  // Phases: irritable leaves functional unticked and says how to dose; back to "building up".
  await proposal.getByRole('radio', { name: 'Prikkelbaar' }).click();
  await expect(proposal.getByText(/isometrie \(bijv\. 5× 30–45 s\)/)).toBeVisible();
  await proposal.getByRole('radio', { name: 'Opbouwen' }).click();
  const n = await proposal.getByRole('checkbox', { checked: true }).count();
  expect(n).toBeGreaterThan(0);
  await proposal.getByRole('button', { name: /Programma maken/ }).click();
  await page.waitForURL(/\/app\/programmas\/nieuw\?/);
  await expect(page.getByLabel('Titel')).toHaveValue('Loperknie (ITBS)');
  await expect(page.getByText(`Oefeningen (${n})`)).toBeVisible();
  // Each exercise comes with a plain "why" for the patient, as an editable note.
  await expect(page.getByText(/Notitie: “Deze oefening/).first()).toBeVisible();
});

test('from a patient record: "Op klacht" keeps the patient for the programme', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.getByRole('link', { name: 'Patiënten' }).first().click();
  await page.getByRole('link', { name: /Emma de Jong/ }).first().click();
  await page.getByRole('link', { name: 'Op klacht' }).click();
  await expect(page).toHaveURL(/klachtwijzer\?patient=/);
  await page.getByRole('button', { name: /^Knie/ }).click();
  await page.getByRole('button', { name: /Patellofemorale pijn/ }).click();
  await page.getByRole('region', { name: /Oefenvoorstel/ }).getByRole('button', { name: /Programma maken/ }).click();
  await expect(page).toHaveURL(/patient=/);
  await expect(page.getByLabel('Titel')).toHaveValue('Patellofemorale pijn');
});

test('atlas: chains and compensations per muscle, for therapist and (in plain words) patient', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/spieren?spier=gluteus_medius');
  const block = page.getByText('Ketens en compensaties').first();
  await expect(block).toBeVisible();
  await expect(page.locator('details', { hasText: 'TFL-overuse bij zwakke gluteus medius' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Loperknie (ITBS)' }).first().click();
  await expect(page.getByRole('heading', { name: 'Loperknie (ITBS)', level: 2 })).toBeVisible();
  await ctx.close();

  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await pctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.goto('/p/spieren?tab=spieren&open=gluteus_medius');
  await expect(pp.getByText('Is deze spier zwak, dan neemt vaak dit het over:')).toBeVisible();
  await expect(pp.getByRole('button', { name: 'spanner van de brede peesplaat' }).first()).toBeVisible();
  await expectAccessible(pp, 'patient atlas chain');
  await pctx.close();
});

test('clinical review: every guide text on one printable page', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/klachtwijzer');
  await page.getByRole('link', { name: /Alle teksten nalopen/ }).click();
  await expect(page.getByRole('heading', { name: 'Klachtwijzer: klinische controle', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TFL-overuse bij zwakke gluteus medius' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Knie-tot-muur-test (enkel)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Oefeningen met een nog niet getoetste dosering' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Duimoppositie met elastiekje' })).toBeVisible();
  await expectAccessible(page, 'clinical review');
});

test('exercise page shows the complaints it fits, linking to the guide', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen?q=schelp');
  await page.getByRole('link', { name: /Schelp/ }).first().click();
  const row = page.getByText('Past bij (klachtwijzer)');
  await expect(row).toBeVisible();
  await expect(page.getByRole('link', { name: /Loperknie \(ITBS\)\s*· versterken/ })).toBeVisible();
});

test('the proposal can also become a practice template', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/klachtwijzer?regio=knie&klacht=pfps');
  await page.getByRole('button', { name: 'Als sjabloon voor de praktijk' }).click();
  await expect(page).toHaveURL(/type=sjabloon/);
  await expect(page.getByLabel('Titel')).toHaveValue('Patellofemorale pijn');
  await expect(page.getByText(/Oefeningen \(\d+\)/)).toBeVisible();
});

test('an existing practice programme that fits the complaint is one tap away', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/klachtwijzer?regio=enkel_voet&klacht=achilles');
  const box = page.getByRole('region', { name: 'Bestaand programma in je praktijk' });
  await expect(box.getByText('Achillespees — belastingsopbouw')).toBeVisible();
  await box.getByRole('link', { name: 'Hiermee starten' }).first().click();
  await expect(page).toHaveURL(/programmas\/nieuw\?sjabloon=/);
  await expect(page.getByLabel('Titel')).toHaveValue(/Achillespees/);
});

test('a printable explanation for the patient, in plain words', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/klachtwijzer?regio=heup&klacht=gluteale_tendinopathie');
  await page.getByRole('link', { name: /Uitleg voor de patiënt/ }).click();
  await expect(page.getByRole('heading', { name: 'Pijn aan de buitenkant van de heup', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waarom deze oefeningen' })).toBeVisible();
  await expect(page.getByText(/Geen rek met het been over de middellijn/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Neem direct contact op/ })).toBeVisible();
  await expectAccessible(page, 'patient handout');
});

test('lateral hip pain: no stretch is a deliberate choice, not a library gap', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/klachtwijzer?regio=heup&klacht=gluteale_tendinopathie');
  const proposal = page.getByRole('region', { name: /Oefenvoorstel/ });
  await expect(proposal.getByText(/Bewust geen rek bij deze klacht/)).toBeVisible();
  await expect(proposal.getByText(/Nog geen passende oefening/)).toHaveCount(0);
});

test('the therapist sends the explanation; the patient reads it under Messages', async ({ browser }) => {
  const staff = await browser.newPage();
  await login(staff, 'therapeut@praktijk-a.test');
  await staff.getByRole('link', { name: 'Patiënten' }).first().click();
  await staff.getByRole('link', { name: /Emma de Jong/ }).first().click();
  await staff.getByRole('link', { name: 'Op klacht' }).click();
  await staff.getByRole('button', { name: /^Knie/ }).click();
  await staff.getByRole('button', { name: /Loperknie \(ITBS\)/ }).click();
  await staff.getByRole('button', { name: 'Stuur naar de patiënt' }).click();
  await expect(staff.getByText('Uitleg verstuurd')).toBeVisible();
  await staff.close();

  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/berichten');
  const msg = page.getByRole('listitem').filter({ hasText: 'Uitleg: Loperknie (ITBS)' }).first();
  await msg.getByRole('link', { name: 'Bekijken' }).click();
  await expect(page).toHaveURL(/\/p\/uitleg\?klacht=itbs/);
  await expect(page.getByRole('heading', { name: 'Loperknie (ITBS)', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Neem direct contact op/ })).toBeVisible();
  await expectAccessible(page, 'complaint explanation (patient)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  // Read or not, it stays one tap away on Revalidatie.
  await page.goto('/p/revalidatie');
  await page.getByRole('link', { name: /Uitleg over je klacht.*Loperknie/ }).click();
  await expect(page).toHaveURL(/\/p\/uitleg\?klacht=itbs/);
  await ctx.close();
});

test('without a linked patient: pick one in a dialog to send the explanation', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/klachtwijzer?regio=knie&klacht=pfps');
  await page.getByRole('button', { name: 'Stuur naar een patiënt' }).click();
  const dlg = page.getByRole('dialog', { name: 'Uitleg naar een patiënt sturen' });
  await expect(dlg.getByRole('button', { name: 'Versturen' })).toBeDisabled();
  await dlg.getByLabel('Patiënt').selectOption({ label: 'Emma de Jong' });
  await expectAccessible(page, 'send explanation dialog');
  await dlg.getByRole('button', { name: 'Versturen' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.getByText('Verstuurd: de patiënt vindt de uitleg onder Berichten')).toBeVisible();
});
