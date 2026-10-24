import { test, expect, type Page } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/**
 * Visual regression for the design system (Deep Olive & Clinical Sage). Computed styles are checked
 * on every run (stable across machines); pixel snapshots of the navigation only with VISUAL=1,
 * because font rendering differs between this environment and CI.
 */
const style = (page: Page, sel: string, props: string[]) =>
  page.locator(sel).first().evaluate((el, ps) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);

test('therapist shell uses the design tokens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'therapeut@praktijk-a.test');
  await page.locator('h1').first().waitFor();
  expect(await style(page, 'body', ['background-color', 'color'])).toEqual({ 'background-color': 'rgb(247, 249, 247)', color: 'rgb(32, 43, 38)' });
  expect((await style(page, 'body', ['font-family']))['font-family']).toMatch(/^"Inter Variable"/);
  expect((await style(page, 'h1', ['font-family']))['font-family']).toMatch(/^"Manrope Variable"/);
  // Fonts are self-hosted: no request ever leaves for Google Fonts.
  const fonts = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /woff2|fonts\.g/.test(n)));
  const origin = new URL(page.url()).origin;
  expect(fonts.every((n) => n.startsWith(origin))).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Manrope Variable"') && document.fonts.check('400 16px "Inter Variable"'))).toBe(true);

  // Sidebar: light sage, active item white with a bold label and a green icon.
  expect((await style(page, 'aside', ['background-color']))['background-color']).toBe('rgb(238, 243, 239)');
  const active = page.locator('aside nav a[aria-current="page"]');
  await expect(active).toHaveText('Dashboard');
  expect(await active.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).fontWeight])).toEqual(['rgb(255, 255, 255)', '600']);
  expect(await active.locator('svg').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(41, 72, 60)');

  // Primary button: Deep Forest Green with white text; cards white with a soft sage border.
  const primary = page.getByRole('button', { name: 'Nieuw programma' }).first();
  expect(await primary.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color])).toEqual(['rgb(41, 72, 60)', 'rgb(255, 255, 255)']);
  expect(await style(page, '.card', ['background-color', 'border-top-color'])).toEqual({ 'background-color': 'rgb(255, 255, 255)', 'border-top-color': 'rgb(225, 232, 226)' });

  // Keyboard focus is clearly visible.
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow);
  expect(ring).not.toBe('none');

  if (process.env.VISUAL) await expect(page.locator('aside')).toHaveScreenshot('sidebar.png', { maxDiffPixelRatio: 0.01 });
});

test('a practice accent replaces the base green, darkened to stay readable', async ({ page }) => {
  await login(page, 'eigenaar@praktijk-a.test');
  const cur = await (await page.request.get('/api/practice')).json();
  const save = (branding: { accent?: string }) =>
    page.request.patch('/api/practice', { data: { name: cur.name, city: cur.city, defaultLocale: cur.defaultLocale, branding }, headers: { 'x-requested-with': 'fp' } });
  try {
    // Too light on purpose: must be darkened until white text on it passes AA.
    expect((await save({ accent: '#9fe0b0' })).ok()).toBe(true);
    await page.goto('/app');
    await page.locator('h1').first().waitFor();
    const rgb = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    expect(rgb).not.toBe('41 72 60');
    const ratio = await page.evaluate((v) => {
      const lum = (c: number[]) => c.map((x) => x / 255).map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)).reduce((a, s, i) => a + s * [0.2126, 0.7152, 0.0722][i], 0);
      return 1.05 / (lum(v.split(' ').map(Number)) + 0.05);
    }, rgb);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    await expectAccessible(page, 'dashboard with practice accent');
  } finally {
    await save(cur.branding ?? {});
  }
  await page.goto('/app');
  await page.locator('h1').first().waitFor();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe('41 72 60');
});

test('patient app: same identity, large tab bar with a clear active state', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.locator('h1').first().waitFor();
  const tab = page.getByRole('navigation', { name: 'Navigatie' }).getByRole('link', { name: 'Vandaag' });
  await expect(tab).toHaveAttribute('aria-current', 'page');
  const box = await tab.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(56);
  expect(await tab.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('600');
  // Practice name is shown in full next to the logo mark.
  const name = page.locator('header span', { hasText: 'Functional Performance' }).last();
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  if (process.env.VISUAL) await expect(page.getByRole('navigation', { name: 'Navigatie' })).toHaveScreenshot('patient-tabs.png', { maxDiffPixelRatio: 0.01 });
  await ctx.close();
});
