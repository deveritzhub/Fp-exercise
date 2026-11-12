import { expect, test } from '@playwright/test';
import { DEFAULT_LOOK } from '../shared/hero';
import { COLLECTION_GEAR, GEAR_COLLECTIONS } from '../shared/gearCollections';

test('all five collections fit on the actual 2D hero and show in the shop on mobile', async ({ page }) => {
  test.setTimeout(100_000);
  const state = {
    hero: { ...DEFAULT_LOOK, heroName: 'Fictieve testheld', createdAt: '2026-01-01', sports: [], frame: 'm', build: 'athletic' },
    gear: { owned: COLLECTION_GEAR.map(g => g.key), equipped: [] as string[], coins: 10000, score: 0 },
    showcase: [], trophies: [], skills: [], badges: [], wallBadges: [],
    level: { level: 1, xp: 0 }, totalLevel: 1, metrics: null,
    logs: { protein: {}, weight: {}, survival: { water: {} }, steps: {}, trainings: [] }, checkin: {},
  };
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/me') return route.fulfill({ json: { user: {
      id: 'synthetic', fullName: 'Testheld', locale: 'nl', emailVerified: true,
      memberships: [], patient: { id: 'synthetic', kind: 'personal', practiceName: 'Test' },
    } } });
    if (pathname === '/api/patient/hero') return route.fulfill({ json: state });
    return route.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('fp.inventory.illustrated', 'true');
    sessionStorage.removeItem('fp.inventory.3d');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const stage = page.getByRole('img', { name: 'Je geïllustreerde held met je gedragen uitrusting' });

  for (const c of GEAR_COLLECTIONS) {
    state.gear.equipped = c.items.map(g => g.key);
    await page.goto('/p/held/inventaris');
    await expect(stage).toBeVisible();
    const button = page.locator('[data-collection="' + c.key + '"]');
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.gear-tile[data-item]')).toHaveCount(c.items.length);

    for (const gear of c.items) {
      const rendered = stage.locator('[data-rpg-item="' + gear.key + '"]');
      await expect(rendered, c.key + ': ' + gear.key).toHaveCount(1);
      const rect = await rendered.evaluate(el => {
        const b = (el as SVGGraphicsElement).getBBox();
        return { w: b.width, h: b.height, x: b.x, y: b.y };
      });
      expect(rect.w, gear.key).toBeGreaterThan(3);
      expect(rect.h, gear.key).toBeGreaterThan(3);
      expect(rect.x, gear.key).toBeGreaterThanOrEqual(-2);
      expect(rect.x + rect.w, gear.key).toBeLessThanOrEqual(202);
      expect(rect.y, gear.key).toBeGreaterThanOrEqual(-14);
      expect(rect.y + rect.h, gear.key).toBeLessThanOrEqual(425);
    }

    if (['kyokushin_fighter','astral_champion'].includes(c.key)) {
      const jpg = await page.locator('.rpg-stage').screenshot({ type: 'jpeg', quality: 38, animations: 'disabled' });
      console.log('FP_COLLECTION_PREVIEW_' + c.key + ':' + jpg.toString('base64'));
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'mobile overflow in ' + c.key).toBeLessThanOrEqual(1);
  }
  await page.getByRole('button', { name: 'Fotoweergave' }).click();
  await expect(page.getByRole('img', { name: 'Je fotorealistische held met je gedragen uitrusting' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bekijk 2D-pasvorm' })).toBeVisible();
});
