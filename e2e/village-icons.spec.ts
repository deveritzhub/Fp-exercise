import { test, expect } from '@playwright/test';

test('premium village illustrations render on mobile with working links and no horizontal overflow', async ({ browser }) => {
  for (const width of [300, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL',
    });
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('E-mailadres').fill('patient@praktijk-a.test');
    await page.getByLabel('Wachtwoord', { exact: true }).fill('Demo-wachtwoord-1');
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    await page.waitForURL(/\/p(\/|$)/);
    const village = page.getByRole('navigation', { name: 'Dorp' });
    await expect(village).toBeVisible();
    const names = ['Prikbord', 'Smederij', 'Arena', 'Bibliotheek', 'Gildehal', 'Wereldkaart'];
    const positions = ['0% 0%', '50% 0%', '100% 0%', '0% 100%', '50% 100%', '100% 100%'];
    const routePaths = [
      '/p/held#weekly-title', '/p/held/inventaris', '/p/held#boss',
      '/p/spieren?tab=quiz', '/p/held/vrienden', '/p/wereld',
    ];
    const image = await page.request.get('/village/fp-flow-village.webp');
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/webp');
    expect((await image.body()).length).toBeGreaterThan(10_000);
    for (const [index, name] of names.entries()) {
      const card = village.locator('[data-village-tile]').nth(index);
      await expect(card).toContainText(name);
      await expect(card).toHaveAttribute('href', routePaths[index]);
      const illustration = card.locator('[data-village-art]');
      await expect(illustration).toBeVisible();
      await expect(illustration).toHaveCSS('background-position', positions[index]);
      await expect(illustration).toHaveCSS('background-size', '300% 200%');
      const bounds = await illustration.boundingBox();
      expect(bounds?.width).toBeGreaterThan(55);
      expect(bounds?.height).toBeGreaterThan(55);
    }
    await expect(village.locator('[data-village-tile]')).toHaveCount(6);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    // Navigation is not a decorative mockup: each illustrated tile is a real, accessible link.
    await village.locator('[data-village-tile="smithy"]').click();
    await expect(page).toHaveURL(/\/p\/held\/inventaris/);
    await context.close();
  }
});
