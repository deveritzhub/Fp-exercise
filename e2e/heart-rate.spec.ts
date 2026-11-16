import pg from 'pg';
import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/**
 * Live heart rate during a workout. The beats come through the app's bridge (window.FPHealth), the
 * same way the Android/iPhone app will pass them on; here a stand-in sends a made-up rhythm.
 */
test('heart rate shows live in the workout and its summary is saved with it', async ({ browser }) => {
  test.setTimeout(120_000);
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const [prog] = (await db.query(`SELECT p.id FROM programs p JOIN patients pt ON pt.id = p.patient_id WHERE pt.email = 'patient@praktijk-a.test' AND p.status = 'active' AND NOT p.is_template ORDER BY p.created_at LIMIT 1`)).rows;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    let timer = 0;
    // Time runs fast for the stand-in, so a short test still has enough measured seconds.
    const real = Date.now.bind(Date);
    const t0 = real();
    Date.now = () => t0 + (real() - t0) * 20;
    (window as unknown as { FPHealth: unknown }).FPHealth = {
      heartRate: {
        start: (cb: (bpm: number) => void) => { let n = 0; timer = window.setInterval(() => cb(110 + (n++ % 5) * 6), 150); return 'health_connect'; },
        stop: () => window.clearInterval(timer),
      },
    };
  });
  await login(page, 'patient@praktijk-a.test');
  await page.goto(`/p/sessie/${prog.id}`);
  await page.getByRole('button', { name: /Beginnen|Verder met training/ }).click();
  await page.getByTestId('hr-connect').click();
  const live = page.getByTestId('hr-live');
  await expect(live).toBeVisible();
  expect(Number(await live.getAttribute('data-bpm'))).toBeGreaterThanOrEqual(110);
  await expectAccessible(page, 'workout with heart rate');
  await page.screenshot({ path: 'screenshots/modules/heart-rate.png' });
  const finish = page.getByRole('button', { name: 'Training afronden' });
  const skip = page.getByRole('button', { name: 'Overslaan' });
  for (let i = 0; i < 40; i++) {
    await expect(finish.or(skip).first()).toBeVisible();
    if (await finish.isVisible()) break;
    await skip.click().catch(() => undefined);
    await page.waitForTimeout(300);
  }
  await finish.click();
  const summary = page.getByTestId('hr-summary');
  await expect(summary).toContainText(/Hartslag: gemiddeld 1\d\d, hoogste 134/);
  const row = (await db.query(`SELECT h.avg_bpm, h.max_bpm, h.source FROM session_heart_rates h JOIN workout_sessions s ON s.id = h.session_id WHERE s.program_id = $1 ORDER BY h.created_at DESC LIMIT 1`, [prog.id])).rows[0];
  await db.end();
  expect(row).toMatchObject({ max_bpm: 134, source: 'health_connect' });
  await context.close();
});
