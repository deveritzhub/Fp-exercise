import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

/** The walkable 3D village: walk to the gym TV, see today's exercises, start there, come back with XP. */
test('patient walks to the TV in the village, starts the workout there and returns with XP', async ({ browser }) => {
  test.setTimeout(480_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.getByTestId('walk-village-link').click();
  await expect(page).toHaveURL(/\/p\/dorp$/);
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });

  // The village has people in it: the smith, the messenger and the librarian walk their rounds.
  await expect(village).toHaveAttribute('data-villagers', '3', { timeout: 30_000 });

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
  // The task list is folded until asked for.
  await page.getByTestId('toggle-tasks').click();
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
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-zone', 'village', { timeout: 90_000 });
  await expect(page.getByTestId('enter-practice')).toBeVisible();

  // The minimap is a map to walk by: a tap on it sends the hero there. The world map names every landmark.
  const mini = (await page.getByTestId('minimap').boundingBox())!;
  await page.mouse.click(mini.x + mini.width * 0.5, mini.y + mini.height * 0.8);
  await expect(village).toHaveAttribute('data-walking', '1');
  await page.getByTestId('open-world-map').click();
  await expect(page.getByTestId('world-map')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(village).not.toHaveAttribute('data-walking', '1', { timeout: 20_000 });

  // "Where do you want to go?": pick a place and the hero walks there; Stop ends the walk.
  await page.getByTestId('slot-places').click();
  const places = page.getByTestId('places');
  await expect(places.getByRole('button')).toHaveCount(10);
  // A far place, so there is time to stop on the way.
  await places.getByRole('button', { name: /Krachthonk/ }).click();
  await expect(village).toHaveAttribute('data-destination', 'in:kracht');
  await page.getByTestId('on-the-way').getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByTestId('on-the-way')).toHaveCount(0);
  await expect(village).not.toHaveAttribute('data-walking', '1', { timeout: 10_000 });
  await page.getByTestId('slot-places').click();
  await places.getByRole('button', { name: /Bibliotheek/ }).click();
  // A kept building: the hero walks in by itself and on to the counter; the keeper talks and shows the way on.
  await expect(village).toHaveAttribute('data-zone', 'library', { timeout: 90_000 });
  // No button to talk: the figure itself is tapped, and the talk offers what the app can do here.
  await expect(page.getByTestId('talk-hint')).toContainText('Tik op de bibliothecaris', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Praat met Bibliothecaris' }).press('Enter');
  await expect(page.getByTestId('keeper-talk')).toContainText('bibliotheek');
  await expect(page.getByTestId('enter-building')).toHaveAttribute('href', '/p/spieren');
  await page.getByRole('dialog').getByRole('button', { name: /Sluit/ }).first().click();
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 90_000 });

  // A house can be entered too: the strength house has its own room with the programme board.
  await page.getByRole('button', { name: 'Loop naar Krachthonk' }).press('Enter');
  await page.getByTestId('enter-house').click({ timeout: 60_000 });
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-zone', 'kracht', { timeout: 30_000 });
  // The coach is tapped from across the room: the hero walks up and the talk opens, with the 1RM among the choices.
  await page.getByRole('button', { name: 'Praat met Coach' }).press('Enter');
  const talk = page.getByTestId('keeper-talk');
  await expect(talk).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('enter-building')).toHaveAttribute('href', '/p/kracht');
  await expect(talk.getByRole('link', { name: /1RM/ })).toHaveAttribute('href', '/p/krachtlog');
  await page.getByRole('dialog').getByRole('button', { name: /Sluit/ }).first().click();
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(page.getByTestId('walk-village')).toHaveAttribute('data-zone', 'village', { timeout: 90_000 });
  await context.close();
});
