import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** "Bekijken" on a message goes to what the message is about, never just to the home page. */
test('a message about a programme opens that programme', async ({ page }) => {
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/berichten');
  const view = page.getByRole('link', { name: 'Bekijken' }).first();
  await expect(view).toHaveAttribute('href', /^\/p\/programma\/[0-9a-f-]{36}$/);
  await view.click();
  await expect(page).toHaveURL(/\/p\/programma\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: /Knie — patellapees belastingsopbouw/ })).toBeVisible();

  // No message offers "Bekijken" for the home page itself.
  await page.goto('/p/berichten');
  for (const href of await page.getByRole('link', { name: 'Bekijken' }).evaluateAll((els) => els.map((e) => e.getAttribute('href')))) expect(href).not.toBe('/p');
});
