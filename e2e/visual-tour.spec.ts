import fs from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { login } from './helpers';
import { importFpLibrary } from '../server/db/import-library';

/**
 * Visual tour for design reviews (before/after a redesign). Only runs with SHOT_DIR set:
 *   SHOT_DIR=screenshots/redesign/after npx playwright test e2e/visual-tour.spec.ts
 * Synthetic e2e data; imports the FP library so the phased programmes are visible.
 */
const DIR = process.env.SHOT_DIR;
test.skip(!DIR, 'set SHOT_DIR to take the tour');
test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

async function settle(page: Page) {
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  await expect(page.locator('.animate-spin, .skeleton')).toHaveCount(0, { timeout: 15_000 });
  await page.waitForTimeout(400);
}

async function ctx(browser: Browser, size: (typeof SIZES)[number]) {
  return browser.newContext({ viewport: { width: size.width, height: size.height }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', hasTouch: size.name === 'mobile', reducedMotion: 'reduce' });
}

test.beforeAll(async () => {
  fs.mkdirSync(DIR!, { recursive: true });
  await importFpLibrary(process.env.DATABASE_OWNER_URL!);
});

for (const size of SIZES) {
  test(`therapist screens (${size.name})`, async ({ browser }) => {
    const c = await ctx(browser, size);
    const page = await c.newPage();
    await login(page, 'therapeut@praktijk-a.test');
    const prog = (await (await page.request.get('/api/programs/overview?q=Patellapees&status=active&therapist=all')).json()).items[0];
    const patient = (await (await page.request.get('/api/patients?q=Emma')).json()).items[0];
    const squat = (await (await page.request.get('/api/exercises?q=squat naar stoel')).json()).items[0];
    const achilles = (await (await page.request.get('/api/programs/templates?q=Achilles')).json()).items.find((t: { series?: { phaseNo: number } }) => t.series?.phaseNo === 1) ??
      (await (await page.request.get('/api/programs/templates?q=Achilles')).json()).items[0];
    const shots: [string, string][] = [
      ['01-dashboard', '/app'],
      ['02-library', '/app/oefeningen'],
      ['03-exercise', `/app/oefeningen/${squat.id}`],
      ['04-builder', `/app/programmas/${prog.id}`],
      ['05-phase', `/app/programmas/nieuw?sjabloon=${achilles.id}`],
      ['06-programmes', '/app/programmas'],
      ['07-patient-record', `/app/patienten/${patient.id}`],
    ];
    for (const [name, url] of shots) {
      await page.goto(url);
      await settle(page);
      await page.screenshot({ path: `${DIR}/${name}-${size.name}.png`, fullPage: true });
    }
    await c.close();
  });

  test(`patient app (${size.name})`, async ({ browser }) => {
    const c = await ctx(browser, size);
    const page = await c.newPage();
    await login(page, 'patient@praktijk-a.test');
    await settle(page);
    await page.screenshot({ path: `${DIR}/08-patient-home-${size.name}.png`, fullPage: true });
    const home = await (await page.request.get('/api/patient/home')).json();
    const id = home.programs[0].id;
    await page.goto(`/p/programma/${id}`);
    await settle(page);
    await page.screenshot({ path: `${DIR}/09-patient-programme-${size.name}.png`, fullPage: true });
    await page.goto(`/p/sessie/${id}`);
    await page.getByRole('button', { name: /Beginnen|Verder met training/ }).click();
    await page.getByRole('button', { name: 'Oefening gedaan' }).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/10-patient-exercise-${size.name}.png`, fullPage: false });
    await page.goto('/p/voortgang');
    await settle(page);
    await page.screenshot({ path: `${DIR}/11-patient-progress-${size.name}.png`, fullPage: true });
    await c.close();
  });
}
