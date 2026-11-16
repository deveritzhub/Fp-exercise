import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** Logging a workout in plain words: read in the app, checked by the patient, then saved. */
test('the patient types a workout in own words, checks it and saves it', async ({ browser }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  const count = async () => ((await (await page.request.get('/api/patient/gym')).json()).sets as unknown[]).length;
  const before = await count();
  await page.goto('/p/logboek');
  const card = page.getByTestId('quick-workout');
  await card.getByLabel('Wat heb je gedaan?').fill("Vandaag heb ik 5'min gefietst 3 sets chest press 3x row biceps curl");
  await card.getByTestId('read-workout').click();
  const preview = card.getByTestId('workout-preview');
  await expect(preview.locator('[data-row="cardio"]')).toHaveCount(1);
  await expect(preview.locator('[data-row="strength"]')).toHaveCount(3);
  await expect(preview.locator('[data-row="cardio"]').getByLabel('Minuten')).toHaveValue('5');
  // Known from the library or kept as an exercise of your own: nothing is lost.
  await expect(preview.locator('[data-row="strength"]').first()).toContainText(/chest press/i);
  await expect(preview.locator('[data-row="strength"]').nth(2)).toContainText(/curl/i);
  await expectAccessible(page, 'quick workout preview');
  await page.screenshot({ path: 'screenshots/modules/quick-workout.png', fullPage: true });
  await card.getByTestId('save-workout').click();
  await expect(page.getByText(/Opgeslagen: 1 cardio en \d+ sets\./)).toBeVisible();
  await expect(preview).toHaveCount(0);
  // 3 + 3 sets, and the curl with the sets of last time (or 3).
  expect(await count()).toBeGreaterThanOrEqual(before + 7);

  // D: repeat a workout of an earlier day from the strength log, with one tap.
  await page.goto('/p/krachtlog');
  const quick = page.getByTestId('quick-workout');
  await expect(quick).toBeVisible();
  await expectAccessible(page, 'strength log with quick entry');
  await context.close();
});
