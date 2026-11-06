import { test, expect } from '@playwright/test';
import { expectAccessible } from './helpers';

test('public mobility check: instant left/right result, nothing sent', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (r) => { if (r.method() !== 'GET') posts.push(r.url()); });
  await page.goto('/mobiliteitstest');
  await expect(page.getByRole('heading', { name: 'Hoe soepel ben jij?', level: 1 })).toBeVisible();
  const ankle = page.getByRole('region', { name: /Knie-tot-muur-test/ });
  await ankle.getByLabel('Links (cm)').fill('8');
  await ankle.getByLabel('Rechts (cm)').fill('12');
  await expect(ankle.getByText(/4 cm verschil tussen links en rechts: links is stijver/)).toBeVisible();
  await ankle.getByLabel('Links (cm)').fill('11,5');
  await expect(ankle.getByText(/binnen de meetfout/)).toBeVisible();
  // Overlap / gap choice for the shoulder test.
  const shoulder = page.getByRole('region', { name: /Back scratch|achter de rug|schouder/i }).first();
  await expect(shoulder).toBeVisible();
  await expectAccessible(page, 'mobility check');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  // Nothing was posted anywhere, and nothing stored in the browser.
  expect(posts.filter((u) => u.includes('/api/') && !u.includes('/client-error'))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith('fp.locale')))).toEqual([]);
});
