import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** The painted gatehouse stands in the south gate and the hero still walks through it, out to the wolf wood. */
test('the hero walks out through the south gate', async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  await page.getByTestId('slot-places').click();
  await page.getByTestId('jump-home').click();
  await expect.poll(async () => Number((await village.getAttribute('data-pos'))?.split(',')[1]), { timeout: 20_000 }).toBeLessThan(26);
  // Walk to the wolf wood's sign, outside the wall (z beyond 30.5).
  await page.locator('[data-spot="zone:wolfwood"]').press('Enter');
  await expect.poll(async () => Number((await village.getAttribute('data-pos'))?.split(',')[1]), { timeout: 240_000, intervals: [2000] }).toBeGreaterThan(32);
});
