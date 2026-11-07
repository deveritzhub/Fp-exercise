import { test, expect, devices, type Page } from '@playwright/test';
import { login } from './helpers';

/** Safari on iPhone zooms in on fields under 16 px (and stays zoomed after logging in). */
async function smallFields(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')]
      .filter((el) => {
        const type = (el as HTMLInputElement).type;
        const r = (el as HTMLElement).getBoundingClientRect();
        return !['checkbox', 'radio', 'range', 'hidden', 'file'].includes(type) && r.width > 0 && r.height > 0;
      })
      .map((el) => ({ name: (el as HTMLInputElement).name || el.getAttribute('aria-label') || el.id || el.tagName, size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((f) => f.size < 16),
  );
}

test('no text field is under 16 px on an iPhone (no zoom when typing)', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.goto('/login');
  await expect(page.getByLabel('E-mailadres')).toBeVisible();
  expect(await smallFields(page), 'login').toEqual([]);
  await login(page, 'therapeut@praktijk-a.test');
  for (const path of ['/app/oefeningen', '/app/spieren', '/app/patienten', '/app/programmas/nieuw']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await smallFields(page), path).toEqual([]);
  }
  await ctx.close();
  const pctx = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await pctx.newPage();
  await login(p, 'patient@praktijk-a.test');
  for (const path of ['/p/spieren', '/p/krachtlog', '/p/instellingen']) {
    await p.goto(path);
    await p.waitForLoadState('networkidle');
    expect(await smallFields(p), path).toEqual([]);
  }
  await pctx.close();
});
