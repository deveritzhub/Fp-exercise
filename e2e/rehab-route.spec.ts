import { expect, test } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/**
 * A synthetic three-phase plan is injected into this page response.
 * The database and real programme/criteria permissions remain untouched.
 */
test('patient can preview chapters but cannot unlock or approve a clinical transition', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 820 });
  await login(page, 'patient@praktijk-a.test');

  await page.route('**/api/patient/hero', async (route) => {
    const response = await route.fetch();
    const state = await response.json();
    await route.fulfill({
      response,
      json: {
        ...state,
        quest: {
          title: 'Synthetic knee rehabilitation',
          goal: 'Return to sport',
          phaseNo: 2,
          phaseCount: 3,
          phaseGoal: 'Movement control',
          timeline: null,
          phases: [
            { no: 1, name: 'Foundation', weeks: '1–4', goal: 'Comfortable movement', status: 'done' },
            { no: 2, name: 'Strength', weeks: '5–12', goal: 'Movement control', status: 'current' },
            { no: 3, name: 'Return to sport', weeks: '13–24', goal: 'Sport readiness', status: 'next' },
          ],
        },
      },
    });
  });

  await page.goto('/p/held');
  await page.locator('button[data-fold="hero-quest"]').click();
  await expect(page.getByRole('heading', { name: 'Jouw revalidatieroute' })).toBeVisible();

  const current = page.getByRole('button', { name: /Hoofdstuk 2/ });
  await expect(current).toHaveAttribute('aria-current', 'step');
  await expect(current).toHaveAttribute('aria-pressed', 'true');

  const future = page.getByRole('button', { name: /Hoofdstuk 3/ });
  await future.click();
  await expect(future).toHaveAttribute('aria-pressed', 'true');
  const detail = page.getByRole('region', { name: 'Geselecteerd hoofdstuk' });
  await expect(detail).toContainText('Sport readiness');
  await expect(detail).toContainText('alleen een vooruitblik');
  await expect(current).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: /Fase vrijgeven|Overgang goedkeuren/ })).toHaveCount(0);

  const past = page.getByRole('button', { name: /Hoofdstuk 1/ });
  await past.click();
  await expect(detail).toContainText('Comfortable movement');
  await expect(current).toHaveAttribute('aria-current', 'step');

  await expectAccessible(page, 'synthetic rehab route');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
