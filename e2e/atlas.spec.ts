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
  // The training tabs stay about training; the one entry is on the hero page.
  await page.goto('/p/kracht');
  await expect(page.getByRole('heading', { name: 'Kracht', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Spierenatlas/ })).toHaveCount(0);
  await page.goto('/p/held');
  const later = page.getByRole('button', { name: 'Later' });
  if (await later.count()) await later.first().click();
  await page.getByRole('link', { name: /Spierenatlas & quiz/ }).click();
  await expect(page).toHaveURL(/\/p\/spieren$/);
  await expect(page.getByRole('link', { name: 'Terug naar je held' })).toBeVisible();
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

  // The nerve is clickable and lists every muscle it drives; a muscle there leads back.
  await page.getByRole('button', { name: 'n. musculocutaneus' }).click();
  const mc = page.locator('#zenuw-musculocutaneus');
  await expect(mc).toBeVisible();
  await expect(mc.getByRole('button', { name: 'Opperarmspier' })).toBeVisible();
  await mc.getByRole('button', { name: 'Tweehoofdige armspier' }).click();
  await expect(page.getByRole('button', { name: /Tweehoofdige armspier/, expanded: true })).toBeVisible();
  // Antagonist: the triceps, one tap away.
  await page.locator('#spier-biceps').getByRole('button', { name: 'Driehoofdige armspier' }).click();
  await expect(page.getByRole('button', { name: /Driehoofdige armspier/, expanded: true })).toBeVisible();
  await expectAccessible(page, 'atlas antagonist');

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
  // Level 2 stays locked until most of level 1 is right.
  await page.getByRole('button', { name: /^Level 2/ }).click();
  await expect(page.getByText('Level 2 zit nog op slot')).toBeVisible();
  await expectAccessible(page, 'atlas quiz level 2 locked');
  // The gracilis has its own card now.
  await page.getByRole('tab', { name: 'Spieren' }).click();
  await page.getByPlaceholder(/Zoek spier of beweging/).fill('gracilis');
  await expect(page.getByRole('button', { name: /Slanke spier/ })).toBeVisible();
  // From an exercise in the programme: "Deze oefening traint: …" opens that muscle, and back.
  const prog = (await (await page.request.get('/api/patient/home')).json()).programs[0];
  const detail = await (await page.request.get(`/api/patient/programs/${prog.id}`)).json();
  const item = detail.items.find((i: { exercise: { targetMuscles: string[] } }) => i.exercise.targetMuscles.length > 0);
  await page.goto(`/p/programma/${prog.id}/oefening/${item.id}`);
  const trains = page.getByText(/Deze oefening (traint|rekt):/);
  await expect(trains).toBeVisible();
  await trains.locator('xpath=..').getByRole('link').first().click();
  await expect(page).toHaveURL(/\/p\/spieren\?tab=spieren&open=/);
  await expect(page.getByRole('button', { expanded: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Terug naar de oefening' }).click();
  await expect(page).toHaveURL(new RegExp(`/p/programma/${prog.id}/oefening/${item.id}$`));
  await ctx.close();
  const done = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await done.connect();
  await done.query(`DELETE FROM exercises WHERE source_key = 'e2e_radial_slider'`);
  await done.end();
});
