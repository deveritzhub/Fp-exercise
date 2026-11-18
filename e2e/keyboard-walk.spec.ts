import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** On a computer the hero walks with W A S D and the arrow keys turn the view. */
test('WASD walks the hero and the arrow keys turn the camera', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(village).toHaveAttribute('data-pos', /,/, { timeout: 30_000 });
  const at = async () => (await village.getAttribute('data-pos'))!.split(',').map(Number);
  const cam = async () => Number(await village.getAttribute('data-cam'));

  // The arrow keys turn the view.
  const before = await cam();
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(2500);
  await page.keyboard.up('ArrowLeft');
  await expect.poll(cam, { timeout: 10_000 }).not.toBeCloseTo(before, 1);

  // W walks the hero.
  const [x0, z0] = await at();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(4000);
  await page.keyboard.up('KeyW');
  await expect.poll(async () => { const [x, z] = await at(); return Math.hypot(x - x0, z - z0); }, { timeout: 10_000 }).toBeGreaterThan(0.5);
  await expect(village).not.toHaveAttribute('data-walking', '1', { timeout: 10_000 });
});

/** A and D turn the hero with the camera (the camera stays behind); W runs forward by default. */
test('A and D turn the hero and the camera together', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(village).toHaveAttribute('data-pos', /,/, { timeout: 30_000 });
  await expect(page.getByTestId('village-keys')).toContainText('Shift');
  const cam = async () => Number(await village.getAttribute('data-cam'));
  const before = await cam();
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyA');
  await expect.poll(cam, { timeout: 10_000 }).toBeGreaterThan(before + 0.3);
});
