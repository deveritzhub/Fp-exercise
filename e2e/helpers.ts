import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const PASSWORD = 'Demo-wachtwoord-1';

export async function login(page: Page, email: string, password = PASSWORD, opts: { welcomeTour?: boolean } = {}) {
  // The first-use welcome tour (patient app) is marked as seen, unless a test is about it.
  if (!opts.welcomeTour) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('fp.tour.v1', 'done');
      } catch {
        /* ignore */
      }
    });
  }
  await page.goto('/login');
  await page.getByLabel('E-mailadres').fill(email);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await page.waitForURL(/\/(app|p|admin)(\/|$)/);
}

/** Fails on serious/critical WCAG 2.x A/AA violations. */
export async function expectAccessible(page: Page, label: string) {
  // Let fade-ins (toasts, dialogs) finish: a half-transparent element is not a real contrast problem.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), undefined, { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(250);
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${label}: ${v.id} — ${v.help} (${v.nodes.length}× e.g. ${v.nodes[0]?.target})`)).toEqual([]);
}

/** Open every folded section on the page (sections start folded to keep pages short). */
export async function expandFolds(page: Page) {
  await page.locator('[data-fold]').first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  const closed = page.locator('button[data-fold][aria-expanded="false"]');
  for (let i = 0; i < 20 && (await closed.count()) > 0; i++) await closed.first().click();
}
