import { expect, test } from '@playwright/test';
import { login } from './helpers';

/** The existing inventory can show worn accessories directly on the vector avatar. */
test('RPG equipment preview switches without changing medical programmes', async ({ page }) => {
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/held/inventaris');
  await expect(page.getByRole('heading', { name: /Inventaris/ }).first()).toBeVisible();
  // RPG is now the default; the existing photo toggle remains available.
  await expect(page.getByRole('img', { name: 'Je geïllustreerde held met je gedragen uitrusting' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fotoweergave' })).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button', { name: 'Fotoweergave' }).click();
  await expect(page.getByRole('img', { name: 'Je geïllustreerde held met je gedragen uitrusting' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'RPG-weergave' })).toHaveAttribute('aria-pressed','false');
});
