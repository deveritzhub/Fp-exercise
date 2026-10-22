import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const PASSWORD = 'Demo-wachtwoord-1';

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('E-mailadres').fill(email);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.waitForURL(/\/(app|p|admin)(\/|$)/);
}

/** Fails on serious/critical WCAG 2.x A/AA violations. */
export async function expectAccessible(page: Page, label: string) {
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${label}: ${v.id} — ${v.help} (${v.nodes.length}× e.g. ${v.nodes[0]?.target})`)).toEqual([]);
}
