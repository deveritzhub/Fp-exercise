import { test, expect } from '@playwright/test';
import { GEAR, DEFAULT_LOOK } from '../shared/hero';

// 3D renderer remains in the repository for a future redesign, but is not user-facing.
// Synthetic data only; never reaches production or patient data.
test('3D hero is parked, even for a returning patient who previously enabled it', async ({ page }) => {
  const threeRequests: string[] = [];
  page.on('request', request => {
    if (/hero3d\/|Hero3D[.-]|three(?:[.-]|%2F)/i.test(request.url())) threeRequests.push(request.url());
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('fp.inventory.3d', 'true');
    sessionStorage.setItem('fp.inventory.illustrated', 'false');
  });

  const state = {
    hero: { ...DEFAULT_LOOK, heroName: 'Testheld', sports: [], createdAt: '2026-01-01' },
    gear: { owned: GEAR.map(g => g.key), equipped: ['crown', 'gold_shoes', 'champion'], coins: 9999, score: 0 },
    showcase: [], trophies: [], skills: [], badges: [],
    level: { level: 1, xp: 0 }, totalLevel: 1, metrics: null,
    logs: { protein: {}, weight: {}, survival: { water: {} }, steps: {}, trainings: [] },
    checkin: {},
  };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user: {
      id: 'synthetic', fullName: 'Testheld', locale: 'nl', emailVerified: true,
      memberships: [], patient: { id: 'synthetic', kind: 'personal', practiceName: 'Test' },
    } } });
    if (path === '/api/patient/hero') return route.fulfill({ json: state });
    return route.fulfill({ json: {} });
  });

  await page.goto('/p/held/inventaris');
  await expect(page.getByRole('button', { name: '3D-weergave' })).toHaveCount(0);
  await expect(page.getByTestId('hero-3d')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Je fotorealistische held met je gedragen uitrusting' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('fp.inventory.3d'))).toBeNull();

  await page.getByRole('button', { name: 'RPG-weergave' }).click();
  const illustrated = page.getByRole('img', { name: 'Je geïllustreerde held met je gedragen uitrusting' });
  await expect(illustrated).toBeVisible();
  await expect(illustrated.locator('[data-rpg-item="crown"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fotoweergave' })).toBeVisible();
  await page.getByRole('button', { name: 'Fotoweergave' }).click();
  await expect(page.getByRole('img', { name: 'Je fotorealistische held met je gedragen uitrusting' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '3D-weergave' })).toHaveCount(0);
  await expect(page.getByTestId('hero-3d')).toHaveCount(0);
  expect(threeRequests).toEqual([]);
});
