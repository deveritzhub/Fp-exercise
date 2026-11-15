import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/**
 * Nutrition: from Today to logging what you ate in your own words, a recipe for your goal in the week
 * plan, and the shopping list that comes out of it. The 3D village is one tap away on Today.
 */
test('the patient logs food, plans a recipe and ticks off the shopping list', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p');
  await expect(page.getByTestId('open-3d-village')).toHaveAttribute('href', '/p/dorp');
  await page.getByTestId('nutrition-card').getByRole('link', { name: 'Voeding' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Voeding' })).toBeVisible();

  // Today: in own words, checked, saved.
  await page.getByLabel('Maaltijd', { exact: true }).selectOption('ontbijt');
  await page.getByLabel('Wat heb je gegeten?').fill('2 boterhammen met kaas, een appel en 250 g kwark');
  await page.getByTestId('read-food').click();
  const preview = page.getByTestId('food-preview');
  await expect(preview.locator('[data-food]')).toHaveCount(4);
  await expect(preview.locator('[data-food="kwark"]')).toContainText('25 g eiwit');
  await expectAccessible(page, 'nutrition today');
  await page.screenshot({ path: 'screenshots/modules/nutrition-today.png', fullPage: true });
  await page.getByTestId('save-food').click();
  await expect(preview).toHaveCount(0);
  await expect(page.locator('[data-meal="ontbijt"]')).toContainText('Magere kwark');
  expect(Number(await page.getByTestId('kcal-today').innerText())).toBeGreaterThan(400);

  // Recipes for muscle growth, one in the week plan with three servings.
  await page.getByRole('tab', { name: 'Recepten' }).click();
  await page.locator('[data-goal="spiergroei"]').click();
  const recipe = page.locator('[data-recipe="kip_rijst_broccoli"]');
  await recipe.getByRole('button', { name: /Kip met rijst en broccoli/ }).click();
  await recipe.getByRole('button', { name: 'Een portie meer' }).click();
  await recipe.getByTestId('add-to-plan').click();
  await expectAccessible(page, 'nutrition recipes');
  await page.screenshot({ path: 'screenshots/modules/nutrition-recipes.png', fullPage: true });

  await page.getByRole('tab', { name: 'Weekplan' }).click();
  await expect(page.getByTestId('week-plan')).toContainText('Kip met rijst en broccoli');
  await page.getByTestId('to-shopping').click();
  const list = page.getByTestId('shopping-list');
  // 4 servings × 150 g chicken.
  await expect(list.locator('li', { hasText: 'Kipfilet' })).toContainText('600 g');
  await list.locator('[data-shop="kipfilet"]').check();
  await expectAccessible(page, 'shopping list');
  await page.screenshot({ path: 'screenshots/modules/nutrition-shopping.png', fullPage: true });
  await page.reload();
  await expect(page.getByTestId('shopping-list').locator('[data-shop="kipfilet"]')).toBeChecked();
  await context.close();
});

/** Opening the app in the 3D village starts on Today instead. */
test('a new visit to the village address opens on Today', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  // A brand-new tab (as when the app starts) straight to the village: Today first.
  const fresh = await context.newPage();
  await fresh.goto('/p/dorp');
  await expect(fresh).toHaveURL(/\/p$/);
  await expect(fresh.getByTestId('open-3d-village')).toBeVisible();
  await context.close();
});

/** Goals, units, favourites, an own product, earlier days, the week, filling the plan and cooking mode. */
test('nutrition step two: goals, favourites, own product, fill my week and cooking mode', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-b.test');
  await page.goto('/p/voeding');

  // Goals: a personal guide, and calories can be hidden.
  await page.getByTestId('open-goals').click();
  const goals = page.getByTestId('goals-form');
  await goals.locator('[data-plan-goal="spiergroei"]').click();
  await goals.getByLabel('Geslacht (voor de berekening)').selectOption('m');
  await goals.getByLabel('Geboortejaar').fill('1985');
  await goals.getByLabel('Gewicht (kg)').fill('80');
  await goals.getByLabel('Lengte (cm)').fill('182');
  await goals.getByLabel('Wat eet je?').selectOption('veganistisch');
  await expectAccessible(page, 'nutrition goals');
  await page.getByTestId('save-goals').click();
  await expect(page.getByTestId('kcal-today')).toBeVisible();
  await expect(page.getByTestId('food-totals')).toContainText(/\/ \d{4} kcal/);
  await expect(page.getByTestId('protein-today')).toContainText('/ 144 g');

  // Two slices as portions: "2 × boterham".
  await page.getByLabel('Maaltijd', { exact: true }).selectOption('lunch');
  await page.getByLabel('Wat heb je gegeten?').fill('2 boterhammen met pindakaas');
  await page.getByTestId('read-food').click();
  const bread = page.locator('[data-food="brood_volkoren"]');
  await expect(bread.getByLabel('Eenheid Volkorenbrood')).toHaveValue('portie');
  await expect(bread.getByLabel('Hoeveelheid Volkorenbrood')).toHaveValue('2');
  await bread.getByLabel('Hoeveelheid Volkorenbrood').fill('3');
  await expect(bread).toContainText('105 g');
  await page.getByTestId('save-food').click();

  // Save lunch as a favourite; it comes back with one tap.
  await page.locator('[data-save-favorite="lunch"]').click();
  await page.getByTestId('save-favorite').click();
  await expect(page.locator('[data-favorite="Mijn lunch"]')).toBeVisible();

  // An own product from the packaging.
  await page.getByTestId('add-own-food').click();
  await page.getByLabel('Naam', { exact: true }).fill('Proteïnepudding');
  await page.getByLabel('kcal per 100 g').fill('70');
  await page.getByLabel('Eiwit per 100 g').fill('10');
  await page.getByLabel('Eén portie (gram)').fill('200');
  await page.getByTestId('save-own-food').click();
  await expect(page.locator('[data-food="mine"]')).toContainText('Proteïnepudding');
  await expect(page.locator('[data-food="mine"]')).toContainText('20 g eiwit');

  // Yesterday: a forgotten day can be filled in.
  await page.getByRole('button', { name: 'Dag eerder' }).click();
  await expect(page.getByTestId('day-label')).toHaveText('Gisteren');
  await page.getByRole('button', { name: 'Dag later' }).click();

  // Hide calories: only protein stays.
  await page.getByTestId('open-goals').click();
  await page.getByTestId('hide-kcal').check();
  await page.getByTestId('save-goals').click();
  await expect(page.getByTestId('kcal-today')).toHaveCount(0);
  await expect(page.getByTestId('week-overview')).toContainText('Balk: eiwit');
  await expectAccessible(page, 'nutrition today, step two');
  await page.screenshot({ path: 'screenshots/modules/nutrition-goals.png', fullPage: true });

  // Fill my week: vegan, muscle growth, with a snack every day.
  await page.getByRole('tab', { name: 'Weekplan' }).click();
  await page.getByTestId('fill-week-button').click();
  const week = page.getByTestId('week-plan');
  await expect(week.getByRole('region', { name: 'Maandag' }).locator('li')).toHaveCount(4);
  await expect(week).toContainText('Tussendoor');
  await expect(week).not.toContainText('Kipfilet');

  // Cooking mode: step by step.
  await page.getByRole('tab', { name: 'Recepten' }).click();
  const r = page.locator('[data-recipe="tempeh_noedels"]');
  await r.getByRole('button', { name: /Noedels met tempeh/ }).click();
  await r.getByTestId('cook-mode').click();
  const cook = page.getByRole('dialog', { name: 'Noedels met tempeh, broccoli en pindasaus' });
  await expect(cook.getByTestId('cook-step')).toContainText('Kook de noedels.');
  await cook.getByTestId('cook-next').click();
  await expect(cook.getByTestId('cook-step')).toContainText('Bak de tempeh');

  // Own items on the shopping list.
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Boodschappen' }).click();
  await page.getByLabel('Zelf iets toevoegen').fill('Koffie');
  await page.getByTestId('add-extra').click();
  await expect(page.getByTestId('shopping-extras')).toContainText('Koffie');
  await expectAccessible(page, 'shopping list with extras');
  await context.close();
});
