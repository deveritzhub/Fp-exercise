import pg from 'pg';
import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

/** Screens added in November must fit a 360 px phone: no sideways scrolling. */
async function emmaId() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`)).rows[0].id as string;
  } finally {
    await db.end();
  }
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test('therapist screens fit a 360 px phone', async ({ browser }) => {
  const id = await emmaId();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'therapeut@praktijk-a.test');
  for (const path of ['/app', `/app/patienten/${id}`, `/app/klachtwijzer?regio=knie&klacht=pfps&patient=${id}`, '/app/klachtwijzer/controle', `/app/patienten/${id}/rapport`]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await overflow(page), path).toBeLessThanOrEqual(1);
  }
  await ctx.close();
});

test('patient screens fit a 360 px phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  for (const path of ['/p/revalidatie', '/p/berichten', '/p/uitleg?klacht=pfps', '/p/held/vrienden', '/p/instellingen', '/p/held', '/p/wereld']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await overflow(page), path).toBeLessThanOrEqual(1);
  }
  await ctx.close();
});
