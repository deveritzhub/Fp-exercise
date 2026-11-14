import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** Game or plain: asked once on Vandaag, changed under Settings, and set by the therapist for a patient. */
test('patient picks the plain view, and the therapist can set it back', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-b.test');
  await page.goto('/p');
  const choice = page.getByTestId('view-choice');
  await expect(choice).toContainText('Hoe wil je de app gebruiken?');
  await expectAccessible(page, 'view choice');
  await choice.locator('[data-view="simple"]').click();
  // Plain: the day in words, no village, no hero tab, no quick-log button.
  await expect(choice).toHaveCount(0);
  await expect(page.getByTestId('simple-today')).toBeVisible();
  await expect(page.getByTestId('lobby-to-village')).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Navigatie' });
  await expect(nav.getByRole('link', { name: 'Held' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Voortgang' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Snel loggen/ })).toHaveCount(0);
  await expectAccessible(page, 'plain today');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/simple.png', fullPage: true });

  // Under Settings the choice can be changed; the game comes back.
  await page.goto('/p/instellingen');
  const card = page.getByTestId('view-card');
  await expect(card.locator('[data-view="simple"]')).toHaveAttribute('aria-pressed', 'true');
  await card.locator('[data-view="game"]').click();
  await page.goto('/p');
  await expect(nav.getByRole('link', { name: 'Held' })).toBeVisible();
  await expect(page.getByTestId('view-choice')).toHaveCount(0);
  await context.close();

  // The therapist sets the plain view for the patient from the record.
  const staff = await browser.newContext({ locale: 'nl-NL' });
  const sp = await staff.newPage();
  await login(sp, 'therapeut@praktijk-b.test');
  await sp.goto('/app/patienten');
  await sp.getByRole('link', { name: /Noah/ }).first().click();
  const view = sp.getByTestId('patient-view-card');
  await expect(view.locator('[data-view="game"]')).toHaveAttribute('aria-pressed', 'true', { timeout: 20_000 });
  await view.locator('[data-view="simple"]').click();
  await expect(view.locator('[data-view="simple"]')).toHaveAttribute('aria-pressed', 'true');
  await staff.close();
});
