import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

test('the hero’s condition: drink water and log sleep from the + button', async ({ browser }) => {
  test.setTimeout(90_000);
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  await db.query('DELETE FROM water_logs; DELETE FROM sleep_logs');
  await db.end();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  await pp.goto('/p/held');
  const panel = pp.getByRole('region', { name: 'Conditie van je held' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('meter', { name: 'Water' })).toHaveAttribute('aria-valuenow', '0');
  await expect(panel.getByText('Nog niet ingevuld')).toBeVisible();
  await expectAccessible(pp, 'survival panel');
  // One tap per glass and per sleep cycle, straight from the meters.
  await panel.getByRole('button', { name: 'Eén glas water erbij' }).click();
  await expect(panel.getByText('1 glas van 250 ml')).toBeVisible();
  await panel.getByRole('button', { name: /Eén cyclus slaap erbij/ }).click();
  await expect(panel.getByText('1,5 uur')).toBeVisible();

  // "…" opens the + sheet on the water tab.
  await panel.getByRole('button', { name: 'Meer opties voor water' }).click();
  const sheet = pp.getByRole('dialog', { name: 'Snel loggen' });
  await expect(sheet.getByRole('tab', { name: 'Water' })).toHaveAttribute('aria-selected', 'true');
  await sheet.getByRole('button', { name: /500 ml/ }).click();
  await expect(pp.getByText('+500 ml')).toBeVisible();
  await sheet.getByRole('tab', { name: 'Slaap' }).click();
  await sheet.getByRole('button', { name: 'Half uur meer' }).click();
  await sheet.getByText('Top', { exact: true }).click();
  await sheet.getByRole('button', { name: 'Slaap opslaan' }).click();
  await expect(pp.getByText(/Slaap opgeslagen/)).toBeVisible();
  await expectAccessible(pp, 'sleep tab');
  await sheet.getByRole('button', { name: 'Sluiten' }).click().catch(() => pp.keyboard.press('Escape'));
  // The sheet starts from the 1,5 hour of the cycle tapped earlier: +0,5 = 2 hours, a short night.
  await expect(panel.getByText('2 uur')).toBeVisible();
  await expect(panel.getByText(/Korte nacht/)).toBeVisible();
  await expect.poll(async () => Number(await panel.getByRole('meter', { name: 'Water' }).getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  await panel.screenshot({ path: 'screenshots/hero/survival.png' });
  await ctx.close();
});
