import { test, expect } from '@playwright/test';
import pg from 'pg';
import { login, expectAccessible, PASSWORD } from './helpers';
import { timeStep, totp } from '../server/src/auth/totp';

test.describe.configure({ mode: 'serial' });

const OWNER = 'eigenaar@praktijk-b.test';
const THERAPIST = 'therapeut@praktijk-b.test';
let secret = '';

// Leave practice B as the other specs expect it: no MFA requirement, no MFA set up.
test.afterAll(async () => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  await db.query(`UPDATE practices SET settings = settings - 'requireMfa'`);
  await db.query(`UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_last_step = NULL WHERE email = ANY($1)`, [[OWNER, THERAPIST]]);
  await db.end();
});

test('owner sets up two-factor authentication and requires it for the team', async ({ page }) => {
  await login(page, OWNER);
  await page.goto('/app/account');
  await page.getByRole('button', { name: 'Instellen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Start met instellen' }).click();
  await expect(dialog.getByRole('img', { name: /QR-code/ })).toBeVisible();
  await expectAccessible(page, 'mfa setup');
  await dialog.getByText(/Lukt scannen niet/).click();
  secret = (await dialog.locator('code').innerText()).replace(/\s/g, '');
  await dialog.getByLabel('Code uit de app').fill(totp(secret, timeStep()));
  await dialog.getByRole('button', { name: 'Bevestigen en aanzetten' }).click();
  await expect(dialog.getByRole('list', { name: 'Herstelcodes' }).locator('li')).toHaveCount(10);
  await expect(dialog.getByRole('button', { name: 'Klaar' })).toBeDisabled();
  await dialog.getByLabel(/veilige plek/).check();
  await dialog.getByRole('button', { name: 'Klaar' }).click();
  await expect(page.getByText(/Je account is beschermd/)).toBeVisible();

  await page.goto('/app/praktijk');
  await page.getByRole('tab', { name: 'Instellingen' }).click();
  await page.getByRole('button', { name: 'Verplicht maken voor iedereen' }).click();
  await expect(page.getByText('Verplicht', { exact: true })).toBeVisible();
});

test('a team member without 2FA is sent to setup first', async ({ page }) => {
  await login(page, THERAPIST);
  await page.waitForURL(/\/tweestapsverificatie/);
  await expect(page.getByRole('heading', { name: 'Beveilig je account' })).toBeVisible();
  await expectAccessible(page, 'mfa required');
  await page.goto('/app/patienten');
  await page.waitForURL(/\/tweestapsverificatie\?next=/);
});

test('signing in asks for the code from the app', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mailadres').fill(OWNER);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByRole('heading', { name: 'Bevestig dat jij het bent' })).toBeVisible();
  await expectAccessible(page, 'mfa login');
  await page.getByLabel('Verificatiecode').fill('000000');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await expect(page.getByText(/Deze code klopt niet/)).toBeVisible();
  // The setup code used the current step; the next step is accepted thanks to the ±30 s drift window.
  await page.getByLabel('Verificatiecode').fill(totp(secret, timeStep() + 1));
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await page.waitForURL(/\/app(\/|$)/);
});
