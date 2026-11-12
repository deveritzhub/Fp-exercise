import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** The walkable 3D village: walk to the gym TV, see today's exercises, start there, come back with XP. */
test('patient walks to the TV in the village, starts the workout there and returns with XP', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.getByTestId('walk-village-link').click();
  await expect(page).toHaveURL(/\/p\/dorp$/);
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });

  // A tap on the ground makes the hero walk.
  const box = (await village.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await expect(village).toHaveAttribute('data-walking', '1');
  await expect(village).not.toHaveAttribute('data-walking', '1', { timeout: 20_000 });

  // The joystick is an option: on, push the knob and the hero walks; let go and the hero stands.
  await page.getByTestId('slot-joystick').click();
  const stick = (await page.getByTestId('joystick').boundingBox())!;
  await page.mouse.move(stick.x + stick.width / 2, stick.y + stick.height / 2);
  await page.mouse.down();
  await page.mouse.move(stick.x + stick.width / 2 + 30, stick.y + stick.height / 2, { steps: 4 });
  await expect(village).toHaveAttribute('data-walking', '1');
  await page.mouse.up();
  await expect(village).not.toHaveAttribute('data-walking', '1', { timeout: 10_000 });
  await page.getByTestId('slot-joystick').click();
  await expect(page.getByTestId('joystick')).toHaveCount(0);

  // The daily quest sends the hero through the practice door to the TV in the exercise room.
  await expect(village).toHaveAttribute('data-zone', 'village');
  await page.getByTestId('quest-tracker').click();
  // While the hero walks by itself, the screen says where to and offers a way to stop.
  await expect(page.getByTestId('on-the-way')).toContainText('Onderweg naar de tv in de praktijk');
  const tv = page.getByTestId('tv-panel');
  await expect(tv).toBeVisible({ timeout: 60_000 });
  await expect(village).toHaveAttribute('data-zone', 'practice');
  await expect(village).toHaveAttribute('data-near', 'tv');
  await expect(tv.getByRole('button', { name: /Spaanse squat/ })).toBeVisible();
  await expectAccessible(page, 'village TV');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  // Starting there tells the workout to end back in the village.
  await tv.getByRole('button', { name: /Start training|Training hervatten/ }).click();
  await expect(page).toHaveURL(/\/p\/sessie\//);
  expect(await page.evaluate(() => history.state?.usr?.from)).toBe('dorp');

  // Back from the workout: the village says what the hero earned, once.
  await page.evaluate(() => history.replaceState({ usr: { fromWorkout: { xp: 45 } }, key: 'e2e', idx: 0 }, '', '/p/dorp'));
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: '+45 XP' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-near', 'tv', { timeout: 30_000 });
  expect(await page.evaluate(() => history.state?.usr ?? null)).toBeNull();

  // Out through the door: back in the village, in front of the practice.
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-zone', 'practice');
  // The exit is out of view here; its button is still there for the keyboard.
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-zone', 'village', { timeout: 30_000 });
  await expect(page.getByTestId('enter-practice')).toBeVisible();

  // "Where do you want to go?": pick a place and the hero walks there; Stop ends the walk.
  await page.getByTestId('slot-places').click();
  const places = page.getByTestId('places');
  await expect(places.getByRole('button')).toHaveCount(8);
  await places.getByRole('button', { name: /Bibliotheek/ }).click();
  await expect(village).toHaveAttribute('data-destination', 'library');
  await page.getByTestId('on-the-way').getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByTestId('on-the-way')).toHaveCount(0);
  await expect(village).not.toHaveAttribute('data-walking', '1', { timeout: 10_000 });
  await page.getByTestId('slot-places').click();
  await places.getByRole('button', { name: /Bibliotheek/ }).click();
  await expect(page.getByTestId('enter-building')).toHaveAttribute('href', '/p/spieren', { timeout: 60_000 });

  // A house can be entered too: the strength house has its own room with the programme board.
  await page.getByRole('button', { name: 'Loop naar Krachthonk' }).press('Enter');
  await page.getByTestId('enter-house').click({ timeout: 60_000 });
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-zone', 'kracht', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Loop naar het programmabord van Krachthonk' }).press('Enter');
  await expect(page.getByTestId('open-programme')).toHaveAttribute('href', '/p/kracht', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-zone', 'village', { timeout: 30_000 });
  await context.close();
});
