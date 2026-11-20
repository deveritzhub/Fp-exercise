import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** The trial of exercises as a 3D demonstration: each of the five loads, moves and shows its instruction. */
test('exercises are shown in 3D by the hero', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/proef/oefeningen');
  const demo = page.getByTestId('exercise-demo');
  await expect(demo).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  await expectAccessible(page, 'exercise demo');

  for (const key of ['squat', 'split_squat', 'glute_bridge', 'calf_raise', 'shoulder_abduction']) {
    await page.getByTestId(`move-${key}`).click();
    await expect(demo).toHaveAttribute('data-move', key);
    await expect(page.getByTestId('exercise-part')).not.toBeEmpty();
    await expect(page.getByTestId('move-cues').locator('li')).toHaveCount(3);
    // It moves: the depth of the movement changes over time.
    const first = await demo.locator('[role="img"]').getAttribute('data-depth');
    await expect.poll(async () => demo.locator('[role="img"]').getAttribute('data-depth'), { timeout: 15_000 }).not.toBe(first);
    if (process.env.SHOTS) {
      await expect.poll(async () => Number(await demo.locator('[role="img"]').getAttribute('data-depth')), { timeout: 15_000 }).toBeGreaterThan(0.97);
      await page.evaluate(() => window.scrollTo(0, 0));
      await demo.screenshot({ path: `${process.env.SHOTS}/demo-${key}.png` });
    }
  }
  // The squat really lowers the pelvis; pausing stops it.
  await page.getByTestId('move-squat').click();
  const img = demo.locator('[role="img"]');
  await expect.poll(async () => Number(await img.getAttribute('data-pelvis')), { timeout: 15_000 }).toBeLessThan(0.7);
  await page.getByTestId('exercise-play').click();
  await expect(page.getByTestId('exercise-play')).toHaveAttribute('aria-pressed', 'false');
  const still = await img.getAttribute('data-depth');
  await page.waitForTimeout(1200);
  expect(await img.getAttribute('data-depth')).toBe(still);
  expect(errors).toEqual([]);
});

/** The trial page also opens for a therapist (who has no hero), at its own address outside the patient app. */
test('a therapist can open the 3D exercise trial', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/proef/oefeningen');
  await expect(page).toHaveURL(/\/proef\/oefeningen$/);
  await expect(page.getByTestId('exercise-demo')).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  await expect(page.getByRole('link', { name: 'Terug naar de app' })).toHaveAttribute('href', '/app');
});
