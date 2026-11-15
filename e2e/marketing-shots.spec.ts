import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Pictures of the real app for the home page (web/public/marketing), with the synthetic demo patient.
 * Only when asked: MARKETING_SHOTS=1 npx playwright test e2e/marketing-shots.spec.ts
 */
const OUT = 'web/public/marketing';
test.skip(!process.env.MARKETING_SHOTS, 'only when making the pictures');
const H = { 'x-requested-with': 'fp' };

test('pictures of the patient app for the home page', async ({ browser }) => {
  test.setTimeout(300_000);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await phone.newPage();
  await page.addInitScript(() => { localStorage.setItem('fp.village.tip', '1'); localStorage.setItem('fp.whatsnew.v1', '2999-12-31'); });
  await login(page, 'patient@praktijk-a.test');

  // Today.
  await page.goto('/p');
  await expect(page.getByTestId('open-3d-village')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/today.png` });

  // Nutrition with a day that has food on it.
  await page.request.put('/api/patient/nutrition/profile', { headers: H, data: { sex: 'v', birthYear: 1990, activity: 'actief', goal: 'spiergroei', hideKcal: false, diet: 'alles', weightKg: 64, heightCm: 170 } });
  await page.request.post('/api/patient/food', { headers: H, data: { meal: 'ontbijt', items: [{ foodKey: 'havermout', name: 'Havermout', grams: 60 }, { foodKey: 'skyr', name: 'Skyr', grams: 200 }, { foodKey: 'blauwe_bessen', name: 'Blauwe bessen', grams: 75 }] } });
  await page.request.post('/api/patient/food', { headers: H, data: { meal: 'lunch', items: [{ foodKey: 'wrap', name: 'Volkoren wrap', grams: 120 }, { foodKey: 'kipfilet', name: 'Kipfilet', grams: 100 }, { foodKey: 'hummus', name: 'Hummus', grams: 30 }] } });
  await page.goto('/p/voeding');
  await expect(page.getByTestId('kcal-today')).toBeVisible();
  await page.getByTestId('food-totals').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, (document.querySelector('[data-testid="day-picker"]') as HTMLElement).getBoundingClientRect().top + window.scrollY - 70));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/nutrition.png` });

  // A workout with live heart rate (a stand-in for the strap).
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const [prog] = (await db.query(`SELECT p.id FROM programs p JOIN patients pt ON pt.id = p.patient_id WHERE pt.email = 'patient@praktijk-a.test' AND p.status = 'active' AND NOT p.is_template ORDER BY p.created_at LIMIT 1`)).rows;
  await db.end();
  const hr = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const w = await hr.newPage();
  await w.addInitScript(() => {
    (window as unknown as { FPHealth: unknown }).FPHealth = { heartRate: { start: (cb: (b: number) => void) => { let n = 0; window.setInterval(() => cb(118 + (n++ % 4) * 3), 400); return 'healthkit'; }, stop: () => undefined } };
    localStorage.setItem('fp.whatsnew.v1', '2999-12-31');
  });
  await login(w, 'patient@praktijk-a.test');
  await w.goto(`/p/sessie/${prog.id}`);
  await w.getByRole('button', { name: /Beginnen|Verder met training/ }).click();
  await w.getByTestId('hr-connect').click();
  await expect(w.getByTestId('hr-live')).toBeVisible();
  await w.waitForTimeout(1500);
  await w.screenshot({ path: `${OUT}/workout.png` });
  await hr.close();

  // The 3D village, sideways.
  const side = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const v = await side.newPage();
  await v.addInitScript(() => { localStorage.setItem('fp.village.tip', '1'); localStorage.setItem('fp.whatsnew.v1', '2999-12-31'); });
  await login(v, 'patient@praktijk-a.test');
  await v.goto('/p/dorp');
  await expect(v.getByTestId('walk-village')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await v.waitForTimeout(4000);
  await v.screenshot({ path: `${OUT}/village.png` });
  await side.close();
  await phone.close();
});

test('picture of the hero in the practice room', async ({ browser }) => {
  test.setTimeout(280_000);
  const side = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const v = await side.newPage();
  await v.addInitScript(() => { localStorage.setItem('fp.village.tip', '1'); localStorage.setItem('fp.whatsnew.v1', '2999-12-31'); });
  await login(v, 'patient@praktijk-a.test');
  await v.goto('/p/dorp');
  const village = v.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await v.waitForTimeout(1500);
  if ((await village.getAttribute('data-zone')) !== 'practice') {
    await v.getByTestId('toggle-tasks').click();
    await v.getByTestId('quest-tracker').click();
  }
  await expect(village).toHaveAttribute('data-zone', 'practice', { timeout: 150_000 });
  await v.waitForTimeout(6000);
  const dlg = v.getByRole('dialog');
  if (await dlg.count()) await dlg.getByRole('button', { name: /Sluiten|Close/ }).first().click();
  await expect(dlg).toHaveCount(0);
  await v.waitForTimeout(3000);
  await v.screenshot({ path: `${OUT}/practice.png` });
  await side.close();
});
