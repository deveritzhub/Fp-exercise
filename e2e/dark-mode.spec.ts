import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers';

/** Contrast and other serious problems on a page, as short lines. */
async function problems(page: Page, label: string) {
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${label}: ${v.id} (${v.nodes.length}× e.g. ${v.nodes[0]?.target} ${v.nodes[0]?.any[0]?.message?.slice(0, 90) ?? ''})`);
}

const dark = async (page: Page) => {
  await page.evaluate(() => localStorage.setItem('fp.theme', 'dark'));
};

test('dark mode: the patient app is readable and the choice is in Settings', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/instellingen');
  await page.getByRole('radio', { name: 'Donker' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  const out: string[] = [];
  for (const path of ['/p', '/p/held', '/p/held/inventaris', '/p/wereld', '/p/voortgang', '/p/instellingen', '/p/kracht', '/p/berichten', '/p/spieren']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(400);
    out.push(...(await problems(page, path)));
  }
  for (const [path, file] of [['/p', 'patient-home'], ['/p/held', 'patient-hero']]) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `screenshots/dark/${file}.png` });
  }
  expect(out).toEqual([]);
  // Back to light.
  await page.goto('/p/instellingen');
  await page.getByRole('radio', { name: 'Licht' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await ctx.close();
});

test('dark mode: the therapist app is readable', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, 'therapeut@praktijk-a.test');
  await dark(page);
  const out: string[] = [];
  for (const path of ['/app', '/app/patienten', '/app/oefeningen', '/app/programmas', '/app/account']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(400);
    out.push(...(await problems(page, path)));
  }
  await page.goto('/app');
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/dark/therapist-dashboard.png' });
  expect(out).toEqual([]);
});
