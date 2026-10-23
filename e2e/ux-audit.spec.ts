import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/**
 * Acceptance checks of the UX audit, on the synthetic e2e database only.
 * Screenshots of the main screens at every checked width go to screenshots/ux-audit/.
 */
test.describe.configure({ mode: 'serial' });

const SHOTS = 'screenshots/ux-audit';
fs.mkdirSync(SHOTS, { recursive: true });

async function emmaProgram(page: Page) {
  // The seeded patellar tendon programme (other specs may give Emma more programmes).
  const r = await (await page.request.get('/api/programs/overview?q=Patellapees&status=active&therapist=all')).json();
  return r.items[0] as { id: string; title: string };
}

test('preview shows the same exercises for today as the patient app', async ({ page, browser }) => {
  await login(page, 'therapeut@praktijk-a.test');
  const prog = await emmaProgram(page);
  await page.goto(`/app/programmas/${prog.id}`);
  await page.getByRole('button', { name: 'Voorbeeld' }).click();
  const dialog = page.getByRole('dialog', { name: 'Voorbeeld voor de patiënt' });
  const line = await dialog.getByText(/van \d+ oefeningen gepland/).innerText();
  const [planned, total] = line.match(/(\d+) van (\d+) oefeningen gepland/)!.slice(1).map(Number);
  // The preview's count is the shared planning rule's count (checked against the patient app below).
  await expectAccessible(page, 'preview');
  await page.screenshot({ path: `${SHOTS}/preview-today.png` });
  // Another date shows that day's exercises; the programme view lists them all.
  await dialog.getByRole('tab', { name: 'Programma' }).click();
  await expect(dialog.locator('ol > li')).toHaveCount(total);
  await page.keyboard.press('Escape');

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const p = await ctx.newPage();
  await login(p, 'patient@praktijk-a.test');
  const card = p.locator('section', { has: p.getByRole('heading', { name: prog.title }) }).first();
  if (planned > 0) await expect(card.getByText(new RegExp(`^${planned} oefening(en)? ·`))).toBeVisible();
  else await expect(p.getByText('Vandaag een rustdag')).toBeVisible();
  await ctx.close();
});

test('a progression is never offered as the easier substitute', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  const prog = await emmaProgram(page);
  await page.goto(`/app/programmas/${prog.id}`);
  const row = page.locator('li.card', { hasText: 'Spaanse squat' }).first();
  await row.getByRole('button', { name: 'Meer opties' }).click();
  const select = row.getByRole('combobox', { name: /Vervangende oefening/ });
  await expect(select).toBeVisible();
  const options = await select.locator('option').allInnerTexts();
  expect(options.join('|')).not.toMatch(/decline/i); // the Spanish squat's progression
  await expect(row.getByText(/Voor deze oefening zijn geen regressies of alternatieven vastgelegd/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/editor-substitute.png`, fullPage: false });
});

test('search never shows a count or empty state from an earlier search', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen');
  await expect(page.getByText(/^\d+ oefeningen$/)).toBeVisible();
  // Hold the answer back to see the in-between state.
  await page.route(/\/api\/exercises\?.*q=pols/, async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.getByRole('searchbox', { name: 'Oefeningen zoeken' }).fill('pols');
  await expect(page.getByText('Zoeken naar “pols”…')).toBeVisible();
  await expect(page.getByText(/resultaten voor “pols”/)).toHaveCount(0);
  await expect(page.getByText(/Niets gevonden/)).toHaveCount(0);
  await expect(page.getByText(/\d+ resultaten voor “pols”/)).toBeVisible({ timeout: 5000 });
  const n = Number((await page.getByText(/\d+ resultaten voor “pols”/).innerText()).match(/\d+/)![0]);
  await expect(page.locator('article')).toHaveCount(n);
});

test('equipment filter and labels agree (required vs optional)', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen?region=knee&equipment=none');
  const card = page.locator('article', { has: page.getByRole('heading', { name: 'Split squat', exact: true }) });
  await expect(card.getByText('Geen materiaal nodig (optioneel: Dumbbell)')).toBeVisible();
  await expect(page.locator('article', { hasText: /Dumbbell$/ })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/library-knee-no-equipment.png` });
});

test('patient: hold timer, resume without duplicates, accessible interrupt', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-b.test');
  const home = await (await page.request.get('/api/patient/home')).json();
  const programId = home.programs[0].id;
  const before = (await (await page.request.get('/api/patient/history')).json()).sessions.length;

  // Look at an exercise without starting a workout.
  await page.goto(`/p/programma/${programId}`);
  await page.locator('ol a').first().click();
  await expect(page.getByText('Je bekijkt deze oefening alleen; er wordt geen training geregistreerd.')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/patient-exercise-view.png` });

  await page.goto(`/p/sessie/${programId}`);
  await page.getByRole('button', { name: /Beginnen|Verder met training/ }).click();
  // Fill in one exercise, then interrupt.
  await page.getByRole('button', { name: 'Oefening gedaan' }).click();
  await page.getByRole('button', { name: 'Opslaan en verder' }).click();
  await page.getByRole('button', { name: 'Training sluiten' }).click();
  const dlg = page.getByRole('dialog', { name: 'Training onderbreken?' });
  await expect(dlg.getByText(/Je hebt 1 van \d+ oefeningen ingevuld/)).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Doorgaan' })).toBeFocused();
  await expectAccessible(page, 'interrupt dialog');
  await page.screenshot({ path: `${SHOTS}/patient-interrupt.png` });
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await page.getByRole('button', { name: 'Training sluiten' }).click();
  await dlg.getByRole('button', { name: 'Onderbreken' }).click();

  // Home offers to resume with progress; resuming continues at the next exercise.
  await expect(page.getByRole('link', { name: 'Training hervatten' })).toBeVisible();
  await expect(page.getByText(/1 van \d+ oefeningen/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/patient-home-resume.png` });
  await page.reload();
  await page.getByRole('link', { name: 'Training hervatten' }).click();
  await page.getByRole('button', { name: 'Verder met training' }).click();
  await expect(page.getByText(/^2\/\d+$/)).toBeVisible();

  // One workout, however often it was resumed.
  const sessions = (await (await page.request.get('/api/patient/history')).json()).sessions.length;
  expect(sessions).toBe(before);
  await ctx.close();
});

test('hold timer pauses and resumes; it never ticks anything off by itself', async ({ browser }) => {
  // Synthetic setup: the therapist plans the hold exercise (Muurzit) on every day.
  const staff = await browser.newContext();
  const tp = await staff.newPage();
  await login(tp, 'therapeut@praktijk-a.test');
  const ep = await emmaProgram(tp);
  const cur = await (await tp.request.get(`/api/programs/${ep.id}`)).json();
  const items = cur.items.map((i: Record<string, unknown>) => ({ id: i.id, exerciseId: i.exerciseId, alternativeExerciseId: i.alternativeExerciseId, sets: i.sets, reps: i.reps, holdS: i.holdS, restS: i.restS, tempo: i.tempo, load: i.load, frequency: i.frequency, days: i.holdS ? [1, 2, 3, 4, 5, 6, 7] : i.days, notes: i.notes }));
  expect(items.some((i: { holdS: number | null }) => i.holdS)).toBe(true);
  expect((await tp.request.put(`/api/programs/${ep.id}`, { data: { title: cur.title, description: cur.description, patientInstructions: cur.patientInstructions, items, startDate: cur.startDate, endDate: cur.endDate, changeNote: 'E2E: vasthouden dagelijks' }, headers: { 'x-requested-with': 'fp' } })).status()).toBe(200);
  await staff.close();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  const prog = { id: ep.id };
  await page.goto(`/p/sessie/${prog.id}`);
  await page.getByRole('button', { name: /Beginnen|Verder met training/ }).click();
  const hold = page.getByRole('button', { name: /Start \d+ seconden/ });
  const finish = page.getByRole('button', { name: 'Training afronden' });
  for (let i = 0; i < 12; i++) {
    if ((await hold.isVisible()) || (await finish.isVisible())) break;
    await page.getByRole('button', { name: 'Overslaan' }).click();
  }
  await hold.click();
  await page.getByRole('button', { name: 'Pauzeren' }).click();
  await expect(page.getByRole('button', { name: 'Hervatten' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/patient-hold-timer.png` });
  await page.getByRole('button', { name: 'Hervatten' }).click();
  await expect(page.getByRole('button', { name: 'Pauzeren' })).toBeVisible();
  await page.getByRole('button', { name: 'Stoppen' }).click();
  // Nothing was ticked off: the exercise still waits for "Oefening gedaan".
  await expect(page.getByRole('button', { name: 'Oefening gedaan' })).toBeVisible();
  await expect(page.locator('[aria-pressed="true"][aria-label^="Set "]')).toHaveCount(0);
  await ctx.close();
});

test('clinical notes and internal texts never reach the patient', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  const home = await (await page.request.get('/api/patient/home')).json();
  const prog = await (await page.request.get(`/api/patient/programs/${home.programs[0].id}`)).json();
  const json = JSON.stringify(prog);
  expect(json).not.toMatch(/clinicalNotes|"description"|"criteria"|"evidence"|"warnings"/);
  await ctx.close();
});

const WIDTHS = [360, 390, 430, 768, 1440];

test('no horizontal overflow on the main screens at every width', async ({ browser }) => {
  test.setTimeout(300_000);
  const staff = await browser.newContext({ locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const t = await staff.newPage();
  await login(t, 'therapeut@praktijk-a.test');
  const prog = await emmaProgram(t);
  const pt = (await (await t.request.get('/api/patients?q=Emma')).json()).items[0];
  const split = (await (await t.request.get('/api/exercises?q=split squat')).json()).items.find((e: { nameNl: string }) => e.nameNl === 'Split squat');
  const staffRoutes: [string, string][] = [
    ['dashboard', '/app'],
    ['library', '/app/oefeningen'],
    ['exercise', `/app/oefeningen/${split.id}`],
    ['programmes', '/app/programmas'],
    ['editor', `/app/programmas/${prog.id}`],
    ['patient-record', `/app/patienten/${pt.id}`],
  ];
  const patient = await browser.newContext({ locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', hasTouch: true });
  const p = await patient.newPage();
  await login(p, 'patient@praktijk-a.test');
  const home = await (await p.request.get('/api/patient/home')).json();
  const pp = await (await p.request.get(`/api/patient/programs/${home.programs[0].id}`)).json();
  const patientRoutes: [string, string][] = [
    ['patient-home', '/p'],
    ['patient-programme', `/p/programma/${pp.id}`],
    ['patient-exercise', `/p/programma/${pp.id}/oefening/${pp.items[0].id}`],
    ['patient-progress', '/p/voortgang'],
  ];
  const problems: string[] = [];
  for (const w of WIDTHS) {
    for (const [page, routes] of [[t, staffRoutes], [p, patientRoutes]] as const) {
      await page.setViewportSize({ width: w, height: w < 768 ? 844 : 900 });
      for (const [name, url] of routes) {
        await page.goto(url);
        // Measure the rendered screen, not a loading state.
        await page.locator('h1').first().waitFor({ timeout: 15_000 });
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
        await expect(page.locator('.animate-spin, .skeleton')).toHaveCount(0, { timeout: 15_000 });
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) problems.push(`${name} @${w}px: ${overflow}px horizontal overflow`);
        // Nothing may hide under a fixed bar: the last element of the page must scroll clear of it.
        const covered = await page.evaluate(() => {
          const bars = [...document.querySelectorAll<HTMLElement>('body *')].filter((el) => getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().bottom >= window.innerHeight - 1 && el.getBoundingClientRect().height < window.innerHeight / 2);
          if (!bars.length) return 0;
          window.scrollTo(0, document.documentElement.scrollHeight);
          const top = Math.min(...bars.map((b) => b.getBoundingClientRect().top));
          const main = document.querySelector('main');
          const last = main ? [...main.querySelectorAll<HTMLElement>('button, a, input, p, li, h2')].filter((e) => e.getBoundingClientRect().height > 0 && !e.closest('[class*="fixed"]') && getComputedStyle(e).position !== 'fixed' && !e.closest('.sticky')).at(-1) : null;
          return last ? Math.max(0, Math.round(last.getBoundingClientRect().bottom - top)) : 0;
        });
        if (covered > 0) problems.push(`${name} @${w}px: last content ${covered}px under a fixed bar`);
        await page.evaluate(() => window.scrollTo(0, 0));
        if ([360, 390, 768, 1440].includes(w)) await page.screenshot({ path: `${SHOTS}/${name}-${w}.png`, fullPage: true });
      }
    }
  }
  expect(problems).toEqual([]);
  await staff.close();
  await patient.close();
});

test('patient app touch targets are at least 44×44', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  const home = await (await page.request.get('/api/patient/home')).json();
  const small: string[] = [];
  let measured = 0;
  for (const url of ['/p', `/p/programma/${home.programs[0].id}`, `/p/sessie/${home.programs[0].id}`, '/p/account']) {
    await page.goto(url);
    await page.locator('main button, main a').first().waitFor();
    await page.waitForTimeout(300);
    const r = await page.evaluate((u) => {
        const out: string[] = [];
        let n = 0;
        for (const el of document.querySelectorAll<HTMLElement>('main a, main button, main input, main select, header a, header button, nav a, nav button')) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
          if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue;
          n++;
          if (r.width < 44 || r.height < 44) {
            // Inline text links inside a sentence are exempt (WCAG 2.5.8).
            if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue;
            out.push(`${u}: ${el.tagName.toLowerCase()} “${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}” ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
        }
        return { out, n };
      }, url);
    small.push(...r.out);
    measured += r.n;
  }
  expect(measured).toBeGreaterThan(15);
  expect(small).toEqual([]);
  await ctx.close();
});

test('every body region filter is reachable at desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen');
  const group = page.getByRole('group', { name: 'Lichaamsregio' });
  const chips = group.getByRole('button');
  await expect(chips).toHaveCount(11);
  for (let i = 0; i < 11; i++) await expect(chips.nth(i)).toBeInViewport({ ratio: 1 });
  await group.getByRole('button', { name: 'Totale lichaam' }).click();
  await expect(page).toHaveURL(/region=full_body/);
});
