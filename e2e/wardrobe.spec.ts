import { expect, test } from '@playwright/test';
import { DEFAULT_LOOK, GEAR, onePerSlot } from '../shared/hero';
import AxeBuilder from '@axe-core/playwright';

test('three MMORPG wardrobe looks persist in the private account and equip only owned gear', async ({ page }) => {
  const gear = { owned: ['cap', 'gloves', 'crown'], equipped: ['cap'], coins: 1000, score: 10 };
  const presets: { slot: number; gear: string[]; updatedAt: string }[] = [];
  let equipWrites = 0;
  let presetWrites = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: {
      user: { id: 'synthetic-wardrobe-user', fullName: 'Testheld', locale: 'nl', emailVerified: true,
        memberships: [], patient: { id: 'synthetic-wardrobe-patient', kind: 'personal', practiceName: 'Test' } },
    } });
    if (path === '/api/patient/hero/loadouts' && route.request().method() === 'GET') return route.fulfill({ json: { presets } });
    if (path.startsWith('/api/patient/hero/loadouts/') && route.request().method() === 'PUT') {
      presetWrites++;
      const slot = Number(path.split('/').at(-1));
      const next = onePerSlot(route.request().postDataJSON().equipped);
      const index = presets.findIndex(p => p.slot === slot);
      const saved = { slot, gear: next, updatedAt: '2026-11-07T07:00:00Z' };
      if (index === -1) presets.push(saved); else presets[index] = saved;
      return route.fulfill({ json: { preset: saved } });
    }
    if (path === '/api/patient/hero/gear' && route.request().method() === 'PUT') {
      equipWrites++;
      const items = route.request().postDataJSON().equipped as string[];
      if (items.some(x => !gear.owned.includes(x))) return route.fulfill({ status: 400, json: { error: 'gear_not_owned' } });
      gear.equipped = onePerSlot(items);
      return route.fulfill({ json: { ok: true } });
    }
    if (path === '/api/patient/hero') return route.fulfill({ json: {
      hero: { ...DEFAULT_LOOK, heroName: 'Testheld', sports: [], createdAt: '2026-01-01' },
      gear, showcase: [], wallBadges: [], trophies: [], skills: [], badges: [], level: { level: 1, xp: 0 },
      totalLevel: 1, metrics: null,
      logs: { protein: {}, weight: {}, survival: { water: {} }, steps: {}, trainings: [] }, checkin: {},
    } });
    if (path.startsWith('/api/hero-assets/')) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ json: {} });
  });
  await page.goto('/p/held/inventaris');
  const wardrobe = page.getByRole('region', { name: 'Mijn uitrustingssets' });
  // Section is labelled by its heading; role region is available through aria-labelledby.
  await expect(wardrobe).toBeVisible();
  await expect(wardrobe.getByText('Nog niet bewaard')).toHaveCount(3);
  await wardrobe.getByRole('button', { name: 'Huidige look opslaan' }).first().click();
  await expect(wardrobe.getByRole('button', { name: 'Deze look draag je' })).toHaveCount(1);
  expect(presetWrites).toBe(1);
  expect(equipWrites).toBe(0);

  // Change the current look through the existing authenticated gear endpoint.
  await page.getByRole('button', { name: /Handschoenen.*Aandoen/ }).first().click();
  await expect(wardrobe.getByRole('button', { name: 'Trek deze look aan' })).toBeEnabled();
  await wardrobe.getByRole('button', { name: 'Trek deze look aan' }).click();
  await expect(wardrobe.getByRole('button', { name: 'Deze look draag je' })).toHaveCount(1);
  expect(gear.equipped).toEqual(['cap']);

  await page.reload();
  await expect(wardrobe.getByRole('button', { name: 'Deze look draag je' })).toHaveCount(1);
  expect(presetWrites).toBe(1);

  await page.setViewportSize({ width: 300, height: 820 });
  await page.reload();
  await expect(wardrobe).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const audit = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] })
    .include('[aria-labelledby="wardrobe-title"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(audit.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([]);
  expect(GEAR.some(x => x.key === gear.equipped[0])).toBe(true);
});
