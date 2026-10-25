import { test, expect, type Page } from '@playwright/test';
import pg from 'pg';
import { login, expectAccessible } from './helpers';

/**
 * Accessibility sweep (axe, WCAG 2.2 AA serious/critical) over screens that no other spec checks,
 * on a phone and on a desktop. Synthetic e2e data only.
 */
const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function settle(page: Page) {
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  await expect(page.locator('.animate-spin, .skeleton')).toHaveCount(0, { timeout: 15_000 });
}

async function emmaId() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const { rows } = await db.query(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  await db.end();
  return rows[0].id as string;
}

for (const size of SIZES) {
  test(`public pages (${size.name})`, async ({ page }) => {
    await page.setViewportSize(size);
    for (const url of ['/', '/functies', '/hoe-het-werkt', '/prijzen', '/demo', '/contact', '/privacy', '/login', '/wachtwoord-vergeten']) {
      await page.goto(url);
      await settle(page);
      await expectAccessible(page, `${url} @${size.name}`);
    }
  });

  test(`therapist screens (${size.name})`, async ({ page }) => {
    await page.setViewportSize(size);
    const id = await emmaId();
    await login(page, 'eigenaar@praktijk-a.test');
    const urls = [
      '/app',
      '/app/patienten',
      `/app/patienten/${id}`,
      `/app/patienten/${id}?tab=programmas`,
      `/app/patienten/${id}?tab=sessies`,
      `/app/patienten/${id}?tab=modules`,
      `/app/patienten/${id}?tab=gegevens`,
      '/app/oefeningen/nieuw',
      '/app/programmas',
      '/app/programmas/nieuw',
      '/app/praktijk',
      '/app/praktijk?tab=team',
      '/app/praktijk?tab=beveiliging',
      '/app/account',
    ];
    for (const url of urls) {
      await page.goto(url);
      await settle(page);
      await expectAccessible(page, `${url} @${size.name}`);
    }
  });
}

test('mobile menu drawer is accessible and closes with its button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'therapeut@praktijk-a.test');
  await settle(page);
  await page.getByRole('button', { name: 'Menu openen' }).click();
  await expect(page.getByRole('navigation', { name: 'Hoofdmenu' }).getByRole('link', { name: 'Oefeningen' })).toBeVisible();
  await expectAccessible(page, 'mobile drawer');
  await page.getByRole('button', { name: 'Menu sluiten' }).click();
  await expect(page.getByRole('navigation', { name: 'Hoofdmenu' }).getByRole('link', { name: 'Oefeningen' })).toBeHidden();
});
