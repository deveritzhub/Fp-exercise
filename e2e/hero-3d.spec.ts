import { test, expect } from '@playwright/test';
import { GEAR, DEFAULT_LOOK, onePerSlot } from '../shared/hero';
import { expectAccessible } from './helpers';

// Network fixture only (synthetic hero); the 3D model itself is served by the app.
test('character screen: 3D view shows the hero with worn gear, turns, and is remembered', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const state = {
    hero: { ...DEFAULT_LOOK, frame: 'm', hair: 'short', beard: 'beard', heroName: 'Testheld', sports: [], createdAt: '2026-01-01' },
    gear: { owned: GEAR.map((g) => g.key), equipped: ['crown', 'gold_shoes', 'champion'], coins: 9999, score: 0 },
    showcase: [], trophies: [], skills: [], badges: [], level: { level: 1, xp: 0 }, totalLevel: 1, metrics: null,
    logs: { protein: {}, weight: {}, survival: { water: {} }, steps: {}, trainings: [] }, checkin: {},
  };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user: { id: 'synthetic', fullName: 'Testheld', locale: 'nl', emailVerified: true, memberships: [], patient: { id: 'synthetic', kind: 'personal', practiceName: 'Test' } } } });
    if (path === '/api/patient/hero/gear') { state.gear.equipped = onePerSlot(route.request().postDataJSON().equipped); return route.fulfill({ json: { ok: true } }); }
    if (path === '/api/patient/hero') return route.fulfill({ json: state });
    return route.fulfill({ json: {} });
  });
  const model = page.waitForResponse((r) => r.url().includes('/hero3d/hero_m_average.glb'));
  await page.goto('/p/held/inventaris');
  await page.getByRole('button', { name: '3D-weergave', exact: true }).click();
  await expect(page.getByRole('button', { name: '3D-weergave', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await model).status()).toBe(200);
  const hero = page.getByTestId('hero-3d');
  await expect(hero).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await expect(page.getByRole('img', { name: /Je 3D-held met je gedragen uitrusting/ })).toBeVisible();
  // Something was drawn: the canvas is not one flat colour.
  const drawn = await page.locator('[data-testid="hero-3d"] canvas').evaluate((c: HTMLCanvasElement) => {
    const g = document.createElement('canvas');
    g.width = 64; g.height = 64;
    const x = g.getContext('2d')!;
    x.drawImage(c, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
    return seen.size;
  });
  expect(drawn).toBeGreaterThan(20);
  await page.getByRole('button', { name: 'Draai naar rechts' }).click();
  await page.getByRole('button', { name: 'Draai naar links' }).click();
  await expectAccessible(page, '3D hero');
  await page.locator('.rpg-stage').screenshot({ path: 'docs/rpg-screenshots/hero-3d.png' });
  // The choice stays for this visit.
  await page.reload();
  await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  await page.getByRole('button', { name: '3D-weergave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'RPG-weergave', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('all eight body models render with representative hair, colours and fitted equipment', async ({ page }) => {
  test.setTimeout(180000);
  const { mkdirSync } = await import('node:fs');
  mkdirSync('docs/hero3d-review', { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const state = {
    hero: { ...DEFAULT_LOOK, heroName: 'Synthetische modelcontrole', sports: [], createdAt: '2026-01-01' },
    gear: { owned: GEAR.map(g => g.key), equipped: ['watch', 'gloves', 'shin_guards', 'balance_shoes', 'belt'], coins: 9999, score: 0 },
    showcase: [], trophies: [], skills: [], badges: [], level: { level: 1, xp: 0 }, totalLevel: 1, metrics: null,
    logs: { protein: {}, weight: {}, survival: { water: {} }, steps: {}, trainings: [] }, checkin: {},
  };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user: { id: 'synthetic', fullName: 'Testheld', locale: 'nl', emailVerified: true, memberships: [], patient: { id: 'synthetic', kind: 'personal', practiceName: 'Test' } } } });
    return route.fulfill({ json: path === '/api/patient/hero' ? state : {} });
  });
  await page.addInitScript(() => sessionStorage.setItem('fp.inventory.3d', 'true'));
  let index = 0;
  for (const frame of ['m', 'f']) for (const build of ['slim', 'average', 'athletic', 'full']) {
    Object.assign(state.hero, { frame, build, hair: ['buzz', 'short', 'afro', 'curly', 'long', 'ponytail', 'bun', 'none'][index], skin: index % 2 ? 's7' : 's3', hairColor: index % 2 ? 'black' : 'brown', beard: 'none' });
    const response = page.waitForResponse(r => r.url().includes(`/hero3d/hero_${frame}_${build}.glb`));
    await page.goto('/p/held/inventaris');
    expect((await response).status()).toBe(200);
    await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
    // Wait for a rendered frame after the asynchronous model/tint update.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.getByTestId('hero-3d').screenshot({ path: `docs/hero3d-review/${frame}-${build}.png` });
    await page.getByRole('button', { name: 'Draai naar rechts' }).click();
    await page.getByRole('button', { name: 'Draai naar rechts' }).click();
    await page.getByTestId('hero-3d').screenshot({ path: `docs/hero3d-review/${frame}-${build}-side.png` });
    index++;
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByTestId('hero-3d').screenshot({ path: 'docs/hero3d-review/mobile.png' });
  expect(errors).toEqual([]);
});
