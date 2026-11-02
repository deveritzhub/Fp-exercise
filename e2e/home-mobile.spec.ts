import { test, expect } from '@playwright/test';

/** The public pages must fit a phone screen: no sideways scrolling, no text cut off at the right. */
// 300 px with normal text ≈ a 412 px phone with large system text (Android text scaling 135%).
for (const width of [300, 360, 412]) {
  for (const path of ['/', '/prijzen', '/login', '/aanmelden']) {
    test(`${path} fits a ${width}px phone`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
      const page = await ctx.newPage();
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const wide = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const out: string[] = [];
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || getComputedStyle(el).position === 'fixed') continue;
          // Ignore content inside its own horizontal scroller (e.g. a table).
          let p = el.parentElement, scroller = false;
          while (p) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p !== document.body && p !== document.documentElement) { scroller = true; break; } p = p.parentElement; }
          if (!scroller && r.right > vw + 1) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)} (“${(el.textContent ?? '').trim().slice(0, 40)}”)`);
        }
        return { vw, scroll: document.documentElement.scrollWidth, out: out.slice(0, 8) };
      });
      expect(wide.out, `elements wider than ${wide.vw}px`).toEqual([]);
      expect(wide.scroll).toBeLessThanOrEqual(wide.vw);
      await ctx.close();
    });
  }
}

// The patient app with large system text (300 px ≈ 412 px phone at 135% text).
test('patient app fits a phone with large text', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 300, height: 800 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByLabel('E-mailadres').fill('patient@praktijk-a.test');
  await page.getByLabel('Wachtwoord', { exact: true }).fill('Demo-wachtwoord-1');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await page.waitForURL(/\/p(\/|$)/);
  const problems: string[] = [];
  for (const path of ['/p', '/p/voortgang', '/p/held', '/p/held/vrienden', '/p/instellingen', '/p/account']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('main *'))) {
        const b = el.getBoundingClientRect();
        if (!b.width || getComputedStyle(el).position === 'fixed') continue;
        let p = el.parentElement, scroller = false;
        while (p) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p !== document.body && p !== document.documentElement) { scroller = true; break; } p = p.parentElement; }
        if (!scroller && b.right > vw + 1) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} right=${Math.round(b.right)} “${(el.textContent ?? '').trim().slice(0, 30)}”`);
      }
      return out.slice(0, 4);
    });
    problems.push(...r.map((x) => `${path}: ${x}`));
  }
  expect(problems).toEqual([]);
  await ctx.close();
});
