import pg from 'pg';
import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** Self-signup (personal / coach), the non-medical patient app, and passkey login. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

const stamp = Date.now();

test('someone signs up to train for themselves: hero, fitness modes, self-check and safety advice', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByRole('link', { name: 'Account aanmaken' }).click();
  await expect(page.getByRole('heading', { name: 'Account aanmaken' })).toBeVisible();
  await expectAccessible(page, 'signup');
  await page.getByRole('radio', { name: /Ik train voor mezelf/ }).check();
  await page.getByLabel('Je naam').fill('Sam Sporter');
  await page.getByLabel('E-mailadres').fill(`sam.${stamp}@voorbeeld.test`);
  await page.getByLabel('Wachtwoord').fill('kort');
  await page.getByRole('button', { name: 'Account aanmaken' }).click();
  await expect(page.getByText('Ga akkoord om verder te gaan.')).toBeVisible();
  await page.getByRole('checkbox', { name: /Ik ga akkoord/ }).check();
  await page.getByRole('button', { name: 'Account aanmaken' }).click();
  await expect(page.getByText(/Minimaal 10 tekens|wachtwoord/i).first()).toBeVisible();
  await page.getByLabel('Wachtwoord').fill('Sterk-wachtwoord-1');
  await page.getByRole('button', { name: 'Account aanmaken' }).click();

  // Straight into making a hero.
  await expect(page).toHaveURL(/\/p\/held\/nieuw$/);
  await page.getByRole('link', { name: 'Later' }).click();
  await expect(page).toHaveURL(/\/p$/);
  await expect(page.getByText('Persoonlijk account')).toBeVisible();

  // Only strength and mobility; no sharing with a practice.
  const nav = page.getByRole('navigation', { name: 'Navigatie' });
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.getByRole('link', { name: /Revalidatie/ })).toHaveCount(0);
  await nav.getByRole('link', { name: /^Kracht/ }).click();
  await expect(page.getByText('Delen met mijn fysiotherapeut')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Eerst een korte check' })).toBeVisible();
  await expectAccessible(page, 'self-check');
  const questions = page.getByRole('group').filter({ has: page.getByRole('radio', { name: 'Nee' }) });
  const n = await questions.count();
  for (let i = 0; i < n; i++) await questions.nth(i).getByText('Nee', { exact: true }).click();
  await page.getByRole('button', { name: 'Check afronden' }).click();
  await expect(page.getByText('Klaar: je kunt krachttraining starten')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Eerst een korte check' })).toHaveCount(0);

  // Start a strength plan and open it: general safety advice instead of a report to a therapist.
  await page.getByRole('button', { name: 'Starten' }).first().click();
  await page.getByRole('button', { name: 'Programma starten' }).click();
  await expect(page).toHaveURL(/\/p\/programma\//);
  const advice = page.getByRole('button', { name: 'Voel je je niet goed?' });
  await advice.first().click();
  await expect(page.getByRole('dialog', { name: 'Stop met trainen' })).toContainText('112');
  await expectAccessible(page, 'safety advice');
  await page.getByRole('button', { name: 'Begrepen' }).click();
  await expect(page.getByRole('button', { name: 'Alarmsignaal melden' })).toHaveCount(0);
  await ctx.close();
});

test('a personal trainer signs up, sets up two-step verification and sees clients instead of patients', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/aanmelden');
  await page.getByRole('radio', { name: /Ik ben personal trainer/ }).check();
  await page.getByLabel('Je naam').fill('Kim Coach');
  await page.getByLabel(/Naam van je bedrijf/).fill('Kim Coaching');
  await page.getByLabel('E-mailadres').fill(`kim.${stamp}@voorbeeld.test`);
  await page.getByLabel('Wachtwoord').fill('Sterk-wachtwoord-1');
  await page.getByRole('checkbox', { name: /Ik ga akkoord/ }).check();
  await page.getByRole('button', { name: 'Account aanmaken' }).click();
  // Like every practice account: two-step verification first.
  await expect(page).toHaveURL(/tweestapsverificatie/);
  // (The MFA flow has its own tests; switch the requirement off for this studio to look around.)
  await sql(`UPDATE practices SET settings = '{}' WHERE name = 'Kim Coaching'`);
  await page.goto('/app');
  const nav = page.getByRole('navigation').first();
  await expect(nav.getByRole('link', { name: 'Klanten' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Patiënten' })).toHaveCount(0);
  await page.goto('/app/programmas');
  await expect(page.getByRole('button', { name: /Revalidatie/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Kracht/ }).first()).toBeVisible();
  await expectAccessible(page, 'coach programmes');
});

test('a patient adds a passkey and logs in with it', async ({ browser }) => {
  test.setTimeout(90_000);
  await sql(`DELETE FROM webauthn_credentials WHERE user_id = (SELECT id FROM users WHERE email = 'patient@praktijk-b.test')`);
  const ctx = await browser.newContext({ locale: 'nl-NL' });
  const page = await ctx.newPage();
  // A virtual authenticator with Face ID-like user verification.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  await login(page, 'patient@praktijk-b.test');
  await page.goto('/p/account');
  await expect(page.getByRole('heading', { name: 'Inlogmethoden' })).toBeVisible();
  await page.getByLabel('Naam van dit apparaat').fill('Testtelefoon');
  await page.getByRole('button', { name: 'Passkey toevoegen' }).click();
  await expect(page.getByText('Passkey toegevoegd')).toBeVisible();
  await expect(page.getByText('Testtelefoon')).toBeVisible();
  await expectAccessible(page, 'login methods');

  // Log out and back in without e-mail or password.
  await ctx.clearCookies();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Inloggen met passkey' }).click();
  await page.waitForURL(/\/p(\/|$)/);
  await expect(page.getByRole('link', { name: 'Account' })).toBeVisible();
  const used = await sql(`SELECT last_used_at FROM webauthn_credentials WHERE name = 'Testtelefoon'`);
  expect(used[0].last_used_at).not.toBeNull();
  await sql(`DELETE FROM webauthn_credentials WHERE name = 'Testtelefoon'`);
  await ctx.close();
});
