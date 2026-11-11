import { test, expect } from '@playwright/test';
import { DEFAULT_LOOK } from '../shared/hero';

test('photographic avatar stays default and an expired image never becomes a cartoon', async ({ page }) => {
  // A previous visit selected the illustrated paper doll. That old preference must be ignored.
  await page.addInitScript(() => sessionStorage.setItem('fp.inventory.illustrated', 'true'));
  const hero = {
    hero: { ...DEFAULT_LOOK, heroName: 'Synthetic test hero', createdAt: '2026-01-01', sports: [] },
    gear: { owned: [], equipped: [], coins: 0, score: 0 },
    showcase: [], wallBadges: [], trophies: [], skills: [], badges: [],
    level: { level: 1, xp: 0 }, totalLevel: 1, metrics: null,
    logs: { protein: {}, weight: {}, survival: { water: {} }, steps: {}, trainings: [] },
    checkin: {},
  };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user: {
      id: 'synthetic', fullName: 'Test', locale: 'nl', emailVerified: true,
      memberships: [], patient: { id: 'synthetic', kind: 'personal', practiceName: 'Test' },
    } } });
    if (path === '/api/patient/hero') return route.fulfill({ json: hero });
    if (path.startsWith('/api/hero-assets/')) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ json: {} });
  });
  await page.goto('/p/held/inventaris');
  const photo = page.getByRole('img', { name: 'Je fotorealistische held met je gedragen uitrusting' });
  const drawn = page.getByRole('img', { name: 'Je geïllustreerde held met je gedragen uitrusting' });
  await expect(photo).toBeVisible();
  await expect(drawn).toHaveCount(0);
  await expect(photo.locator('[data-photo-unavailable="true"]')).toBeVisible();
  await expect(photo.locator('svg')).toHaveCount(1); // neutral ImageOff icon only, no SVG person
  expect(await page.evaluate(() => sessionStorage.getItem('fp.inventory.illustrated'))).toBeNull();

  await page.getByRole('button', { name: 'RPG-weergave' }).click();
  await expect(drawn).toBeVisible();
  await page.reload();
  await expect(photo).toBeVisible();
  await expect(drawn).toHaveCount(0);
});
