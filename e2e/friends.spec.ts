import pg from 'pg';
import { test, expect, type Browser } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/** Hero friends: opt-in sharing, friend code, request + accept, leaderboard with skills, switch off. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

const reset = () =>
  sql(`DELETE FROM hero_friendships; UPDATE patient_heroes SET share_with_friends = false, friend_code = NULL, shared_stats = NULL, stats_updated_at = NULL`);
test.beforeAll(reset);
test.afterAll(reset);

async function patientPage(browser: Browser, email: string) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await login(page, email);
  return page;
}

test('two patients from different practices become friends and compare levels', async ({ browser }) => {
  test.setTimeout(120_000);
  await sql(`UPDATE patient_heroes SET hero_name = 'Sprinter Emma' FROM patients p WHERE p.id = patient_heroes.patient_id AND p.email = 'patient@praktijk-a.test'`);
  await sql(`UPDATE patient_heroes SET hero_name = 'Keeper Noah' FROM patients p WHERE p.id = patient_heroes.patient_id AND p.email = 'patient@praktijk-b.test'`);

  const emma = await patientPage(browser, 'patient@praktijk-a.test');
  await emma.goto('/p/held');
  await emma.getByRole('link', { name: /Vrienden/ }).click();
  await expect(emma.getByRole('heading', { name: 'Vrienden', level: 1 })).toBeVisible();
  // Off by default, with a clear explanation of what is and is not shared.
  const toggle = emma.getByRole('switch', { name: 'Deel mijn held met vrienden' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(emma.getByText('Vrienden zien nooit')).toBeVisible();
  await expect(emma.getByText('je pijn, klachten of alarmsignalen')).toBeVisible();
  await expectAccessible(emma, 'friends off');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  const code = (await emma.getByTestId('friend-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await expect(emma.getByText('Nog geen vrienden.')).toBeVisible();
  await expectAccessible(emma, 'friends on');

  const noah = await patientPage(browser, 'patient@praktijk-b.test');
  await noah.goto('/p/held/vrienden');
  await noah.getByRole('switch', { name: 'Deel mijn held met vrienden' }).click();
  await noah.getByLabel('Code van je vriend').fill('ZZZZ-ZZZZ');
  await noah.getByRole('button', { name: 'Verzoek sturen' }).click();
  await expect(noah.getByText(/Geen held gevonden met deze vriendcode/)).toBeVisible();
  await noah.getByLabel('Code van je vriend').fill(code.toLowerCase());
  await noah.getByRole('button', { name: 'Verzoek sturen' }).click();
  await expect(noah.getByText('Verzoek verstuurd.', { exact: false })).toBeVisible();
  await expect(noah.getByRole('heading', { name: 'Wacht op antwoord' })).toBeVisible();
  await expect(noah.getByText('Sprinter Emma')).toBeVisible();

  // Emma sees the request and accepts it.
  await emma.reload();
  await expect(emma.getByRole('heading', { name: 'Verzoeken (1)' })).toBeVisible();
  await emma.getByRole('button', { name: 'Accepteren' }).click();
  await expect(emma.getByRole('heading', { name: /Ranglijst \(1 vriend\)/ })).toBeVisible();
  const board = emma.getByRole('list', { name: 'Ranglijst' });
  await expect(board.getByRole('listitem')).toHaveCount(2);
  await expect(board.getByText('Keeper Noah')).toBeVisible();
  await expect(board.getByText('Jij ·')).toBeVisible();
  // Tap a friend for the skills.
  await board.getByRole('button', { name: /Keeper Noah/ }).click();
  await expect(board.getByText('Kracht')).toBeVisible();
  await expect(board.getByText('Herstel')).toBeVisible();
  await expectAccessible(emma, 'friends leaderboard');
  await emma.screenshot({ path: 'screenshots/hero/friends.png', fullPage: true });

  // The character sheet links to the friends page with the count.
  await emma.goto('/p/held');
  await expect(emma.getByRole('link', { name: /Vrienden.*1 vriend/ })).toBeVisible();

  // Noah switches sharing off: the friendship disappears for both.
  await noah.reload();
  await noah.getByRole('switch', { name: 'Deel mijn held met vrienden' }).click();
  await expect(noah.getByRole('dialog', { name: 'Delen uitzetten?' })).toBeVisible();
  await noah.getByRole('button', { name: 'Uitzetten' }).click();
  await expect(noah.getByRole('switch', { name: 'Deel mijn held met vrienden' })).toHaveAttribute('aria-checked', 'false');
  await emma.goto('/p/held/vrienden');
  await expect(emma.getByText('Nog geen vrienden.')).toBeVisible();
  await expect(emma.getByText('Keeper Noah')).toHaveCount(0);
});
