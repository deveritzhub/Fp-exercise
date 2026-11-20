import { test, expect, type Locator } from '@playwright/test';
import { login } from './helpers';

/** A phone held sideways: the village takes the whole screen by itself and every control stays in reach. */
test('the village plays in landscape: full screen by itself, controls do not overlap', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({ viewport: { width: 780, height: 360 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // Sideways: full screen without a tap.
  await expect(page.locator('section[data-full="1"]')).toBeVisible();
  const box = (await village.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(778);
  expect(box.height).toBeGreaterThanOrEqual(358);

  // On a touch screen the joystick is on from the start.
  const parts: [string, Locator][] = [
    ['hero frame', page.getByRole('link', { name: /^Naar je held/ })],
    ['supplies', page.getByTestId('world-states')],
    ['minimap', page.getByTestId('minimap')],
    ['tasks', page.getByTestId('toggle-tasks')],
    ['zoom', page.getByTestId('zoom-in')],
    ['zoom out', page.getByTestId('zoom-out')],
    ['joystick', page.getByTestId('joystick')],
    ['places', page.getByTestId('slot-places')],
    ['meters', page.getByTestId('toggle-meters')],
  ];
  const boxes: [string, { x: number; y: number; width: number; height: number }][] = [];
  for (const [name, loc] of parts) {
    await expect(loc, name).toBeVisible();
    const b = (await loc.boundingBox())!;
    // Inside the screen.
    expect(b.x, name).toBeGreaterThanOrEqual(0);
    expect(b.y, name).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, name).toBeLessThanOrEqual(780.5);
    expect(b.y + b.height, name).toBeLessThanOrEqual(360.5);
    boxes.push([name, b]);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [an, a] = boxes[i];
      const [bn, b] = boxes[j];
      const apart = a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1 || a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1;
      expect(apart, `${an} overlaps ${bn}`).toBe(true);
    }
  }
  await page.screenshot({ path: 'screenshots/hero/village-landscape.png' });

  // Upright again: the page comes back.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('section[data-full="1"]')).toHaveCount(0);
  await expect(page.getByTestId('play-full')).toBeVisible();
  await context.close();
});
