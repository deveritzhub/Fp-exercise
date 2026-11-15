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
  await page.getByLabel('Maaltijd').selectOption('ontbijt');
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
