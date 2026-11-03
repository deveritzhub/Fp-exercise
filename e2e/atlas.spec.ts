import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';
import { quizQuestions } from '../shared/muscleAtlas';

test.setTimeout(120_000);
test('spierenatlas: muscles with nerve and exercises, nerves with sliders, and a quiz that earns XP', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  await db.query(`DELETE FROM hero_quiz_answers`);
  // One nerve slider in the central library, just for this test (removed at the end).
  await db.query(`DELETE FROM exercises WHERE source_key = 'e2e_radial_slider'`);
  await db.query(
    `INSERT INTO exercises(practice_id, source_key, name_nl, name_en, body_region, training_categories, tags, movement_nl)
     VALUES (NULL, 'e2e_radial_slider', 'Radialis slider', 'Radial nerve slider', 'shoulder', '{neurodynamics}', '{neurodynamiek}', 'Rustig heen en weer.')`,
  );
  await db.end();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/kracht');
  await page.getByRole('link', { name: /Spierenatlas en quiz/ }).click();
  await expect(page).toHaveURL(/\/p\/spieren\?van=kracht$/);
  await expect(page.getByRole('heading', { name: 'Spierenatlas', level: 1 })).toBeVisible();

  // Find a muscle by its movement; it shows its functions, nerve and linked exercises.
  await page.getByPlaceholder(/Zoek spier of beweging/).fill('supinatie');
  const biceps = page.getByRole('button', { name: /Tweehoofdige armspier/ });
  await biceps.click();
  await expect(page.getByText('n. musculocutaneus').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Kracht/ }).first()).toBeVisible();
  await expectAccessible(page, 'atlas muscle open');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'screenshots/atlas/muscle.png', fullPage: true });

  // Nerves: the radial nerve has its own slider.
  await page.getByRole('tab', { name: 'Zenuwen' }).click();
  const radial = page.locator('li', { has: page.getByRole('heading', { name: 'n. radialis' }) });
  await expect(radial.getByText('Radialis slider')).toBeVisible();
  await expectAccessible(page, 'atlas nerves');

  // Quiz: a right answer earns XP and explains why.
  await page.getByRole('tab', { name: 'Quiz' }).click();
  const qText = await page.locator('#quiz-q').innerText();
  const q = quizQuestions().find((x) => x.q[0] === qText)!;
  const right = q.options.find((o) => o.id === q.answer)!.label[0];
  await page.getByRole('button', { name: right, exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /Goed! \+5 XP/ })).toBeVisible();
  await expect(page.getByText('1 van ')).toBeVisible();
  await expectAccessible(page, 'atlas quiz answered');
  await page.screenshot({ path: 'screenshots/atlas/quiz.png', fullPage: true });
  await page.getByRole('button', { name: 'Volgende vraag' }).click();
  await expect(page.locator('#quiz-q')).not.toHaveText(qText);
  await ctx.close();
  const done = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await done.connect();
  await done.query(`DELETE FROM exercises WHERE source_key = 'e2e_radial_slider'`);
  await done.end();
});
