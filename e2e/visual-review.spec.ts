import { expect, test } from '@playwright/test';
import { login } from './helpers';

/**
 * Isolated visual audit using ONLY the seeded CI database and synthetic API data.
 * No snapshots of real patients are taken. In a standard CI run, only layout
 * assertions execute; emitting a compact JPEG for a one-off review requires
 * FP_VISUAL_CAPTURE=1 on the GitHub Actions job.
 */
test('daily mission and rehabilitation route render safely at narrow and desktop widths', async ({ browser }) => {
  test.setTimeout(90_000);
  for (const width of [300, 412, 1280]) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 600,
      locale: 'nl-NL',
      timezoneId: 'Europe/Amsterdam',
    });
    const page = await ctx.newPage();
    await login(page, 'patient@praktijk-a.test');

    // Force a deterministic prescribed (synthetic) day without touching the database.
    await page.route('**/api/patient/home', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      expect(data.programs.length).toBeGreaterThan(0);
      const p = data.programs[0];
      await route.fulfill({
        response,
        json: {
          ...data,
          patient: { ...data.patient, firstName: 'Testpatiënt' },
          programs: [{
            ...p, title: 'Knieherstel — kracht en controle',
            paused: false,
            openSession: null,
            today: { ...p.today, scheduled: 3, done: false },
          }],
        },
      });
    });
    await page.goto('/p');
    const mission = page.locator('section[aria-labelledby="fp-daily-mission"]');
    await expect(mission).toBeVisible();
    await expect(mission.getByRole('heading', { name: 'Jouw volgende stap' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start mijn missie' })).toBeVisible();

    if (process.env.FP_VISUAL_CAPTURE === '1') {
      const jpg = await mission.screenshot({ type: 'jpeg', quality: 35, animations: 'disabled' });
      console.log('FP_VISUAL_JPEG:mission:' + width + ':' + jpg.toString('base64'));
    }

    let heroMockCalls = 0;
    await page.route('**/api/patient/hero', async (route) => {
      heroMockCalls++;
      const response = await route.fetch();
      const data = await response.json();
      await route.fulfill({
        response,
        json: {
          ...data,
          quest: {
            title: 'Knieherstel — van kracht naar sport',
            goal: 'Weer veilig sporten',
            phaseNo: 2,
            phaseCount: 3,
            phaseGoal: 'Kracht en controle',
            timeline: null,
            phases: [
              { no: 1, name: 'Herstel en mobiliteit', weeks: '1–4', goal: 'Normaal looppatroon', status: 'done' },
              { no: 2, name: 'Kracht en controle', weeks: '5–12', goal: 'Bewegingscontrole verbeteren', status: 'current' },
              { no: 3, name: 'Terug naar sport', weeks: '13–24', goal: 'Sportspecifieke belasting', status: 'next' },
            ],
          },
        },
      });
    });
    await page.goto('/p/held');
    const collapsed = page.locator('button[data-fold="hero-quest"]');
    if (await collapsed.count()) await collapsed.click();
    const rehab = page.locator('section[aria-labelledby="rehab-route-heading"]');
    if (!(await rehab.count())) {
      const diagnostic = {
        heroMockCalls,
        url: page.url(),
        headings: await page.getByRole('heading').allTextContents(),
        folds: await page.locator('[data-fold="hero-quest"]').allTextContents(),
        excerpt: (await page.locator('main').innerText()).slice(0,1300),
      };
      console.log('FP_VISUAL_DIAGNOSTIC:' + JSON.stringify(diagnostic));
    }
    await expect(rehab).toBeVisible();
    await expect(rehab.getByRole('button', { name: /Hoofdstuk 2/ })).toHaveAttribute('aria-current', 'step');
    await rehab.getByRole('button', { name: /Hoofdstuk 3/ }).click();
    await expect(rehab.getByRole('region', { name: 'Geselecteerd hoofdstuk' })).toContainText('Sportspecifieke belasting');
    if (process.env.FP_VISUAL_CAPTURE === '1') {
      const jpg = await rehab.screenshot({ type: 'jpeg', quality: 35, animations: 'disabled' });
      console.log('FP_VISUAL_JPEG:route:' + width + ':' + jpg.toString('base64'));
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    await ctx.close();
  }
});