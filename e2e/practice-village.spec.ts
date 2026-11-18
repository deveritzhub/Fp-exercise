import { test, expect } from '@playwright/test';
import { LOOT_KEYS } from '../shared/adventure';
import { expectAccessible, login } from './helpers';

/** Staff: the practice as a village, one numbered home per patient, growing with the hero's level. */
test('therapist sees a home per patient without names and opens the record from it', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page, 'therapeut@praktijk-a.test');
  await page.getByRole('link', { name: 'Dorp' }).first().click();
  await expect(page).toHaveURL(/\/app\/dorp$/);
  await expect(page.getByTestId('practice-village')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });

  // One home per patient of this therapist, by number; no patient name anywhere on the page.
  const list = page.getByTestId('home-list').getByRole('button');
  await expect(list.first()).toContainText('Huisje 1');
  expect(await list.count()).toBeGreaterThan(1);
  const main = page.getByRole('main');
  for (const name of ['Emma', 'de Jong', 'Mila', 'de Vries', 'Daan', 'Lucas']) await expect(main).not.toContainText(name);

  // A home in the scene is a real button; picking it shows its level and the way to the record.
  await page.getByRole('button', { name: /^Huisje 1 · lv/ }).press('Enter');
  const panel = page.getByTestId('home-panel');
  await expect(panel).toContainText('Huisje 1');
  await expect(panel).toContainText(/level \d+/);
  await expect(panel.getByRole('link', { name: 'Open het dossier' })).toHaveAttribute('href', /\/app\/patienten\/[0-9a-f-]{36}$/);
  await expectAccessible(page, 'practice village');

  // Names are off until asked for; switched on, the home says whose it is.
  await expect(page.getByTestId('home-name')).toHaveCount(0);
  await page.getByTestId('toggle-names').click();
  await expect(page.getByTestId('home-name')).toHaveText(/\S+ \S+/);
  await expect(page.getByTestId('home-list')).toContainText('Emma de Jong');
  await expectAccessible(page, 'practice village with names');
  await page.getByTestId('toggle-names').click();
  await expect(page.getByTestId('home-name')).toHaveCount(0);
  await expect(main).not.toContainText('Emma');

  // The example shows every kind of home, is marked as made up and has no record behind it.
  await page.getByRole('button', { name: 'Voorbeeld: alle soorten huisjes' }).click();
  await expect(page.getByTestId('sample-notice')).toBeVisible();
  await page.getByTestId('home-list').getByRole('button').nth(11).click();
  await expect(panel).toContainText('Villa');
  await expect(panel.getByRole('link', { name: 'Open het dossier' })).toHaveCount(0);

  // The record itself still opens for this therapist.
  await page.getByRole('button', { name: 'Terug naar mijn patiënten' }).click();
  await list.first().click();
  await panel.getByRole('link', { name: 'Open het dossier' }).click();
  await expect(page).toHaveURL(/\/app\/patienten\/[0-9a-f-]{36}/);
});

/** Staff on foot: from the practice into the street of homes, the record at a door and a look inside. */
test('therapist walks from the practice to a patient home and looks inside', async ({ page }) => {
  test.setTimeout(300_000);
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/dorp');
  await page.getByTestId('toggle-walk').click();
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(village).toHaveAttribute('data-zone', 'practice');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/tw-0.png' });

  // Out of the practice: at the exit the door opens by itself.
  await page.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 60_000 });
  if (process.env.SHOTS) { await page.waitForTimeout(1500); await page.screenshot({ path: process.env.SHOTS + '/tw-1.png' }); }

  // To a home: numbered, no name; at the door the record and the way in.
  // Picked in the list beside the scene: the therapist walks there.
  await page.getByTestId('home-list').getByRole('button').first().click();
  const record = page.getByTestId('walk-record');
  await expect(record).toBeVisible({ timeout: 90_000 });
  await expect(record).toHaveAttribute('href', /\/app\/patienten\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId('home-panel')).toContainText('Huisje 1');
  for (const name of ['Emma', 'de Jong']) await expect(page.getByRole('main')).not.toContainText(name);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/tw-2.png' });

  await page.getByTestId('enter-home').click();
  await expect(village).toHaveAttribute('data-zone', 'home', { timeout: 30_000 });
  await expect(page.getByTestId('visit-note')).toContainText('Binnen bij Huisje 1');
  if (process.env.SHOTS) { await page.waitForTimeout(1500); await page.screenshot({ path: process.env.SHOTS + '/tw-3.png' }); }
  await page.getByTestId('leave-home').click();
  await expect(village).toHaveAttribute('data-zone', 'village', { timeout: 60_000 });
  await expect(page.getByTestId('visit-note')).toHaveCount(0);
});

/** The therapist makes an own figure; the patient finds that figure in the practice, and the day's meters in the world. */
test('therapist makes a figure and the patient meets it in the practice', async ({ browser }) => {
  test.setTimeout(560_000);
  const staffContext = await browser.newContext({ locale: 'nl-NL' });
  const staff = await staffContext.newPage();
  await login(staff, 'therapeut@praktijk-a.test');
  await staff.goto('/app/dorp');
  await staff.getByTestId('open-avatar').click();
  const editor = staff.getByRole('dialog', { name: 'Mijn poppetje' });
  await expect(editor.getByTestId('hero-3d')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await editor.getByLabel('Figuur').selectOption('m');
  await editor.getByLabel('Kleding').selectOption('ridder');
  await editor.getByLabel('Baard').selectOption('beard');
  await editor.getByRole('button', { name: 'Huidskleur 7' }).click();
  await expectAccessible(staff, 'staff avatar editor');
  if (process.env.SHOTS) await staff.screenshot({ path: process.env.SHOTS + '/av-0.png' });
  await staff.getByTestId('save-avatar').click();
  await expect(editor).toHaveCount(0);
  await staffContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'nl-NL' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  await login(page, 'patient@praktijk-a.test');
  // The village remembers where the hero stood (another test may have left it outside the wall):
  // start on the square.
  expect((await page.request.put('/api/patient/hero/adventure/position', { data: { x: 0, z: 7 }, headers: { 'x-requested-with': 'fp' } })).status()).toBe(200);
  const coach = page.waitForResponse((r) => r.url().endsWith('/api/patient/hero/coach'));
  await page.goto('/p/dorp');
  expect((await (await coach).json()).look).toMatchObject({ frame: 'm', outfit: 'ridder', beard: 'beard', skin: 's7' });
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  // The day's meters are in the world; a tap opens the quick log on that tab.
  const meters = page.getByTestId('world-meters');
  await page.getByTestId('toggle-meters').click();
  await expect(meters.locator('[data-meter]')).toHaveCount(3);
  await meters.locator('[data-meter="steps"]').click();
  await expect(page.getByRole('dialog', { name: 'Snel loggen' }).getByRole('tab', { name: 'Stappen' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  // The well on the square: walk there and drink; the glass is logged and the water meter rises.
  const water = meters.locator('[data-meter="water"]');
  const before = await water.getAttribute('aria-label');
  await page.getByRole('button', { name: 'Loop naar de waterput' }).press('Enter');
  await page.getByTestId('drink-well').click({ timeout: 60_000 });
  await expect(water).not.toHaveAttribute('aria-label', before!, { timeout: 15_000 });
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/well.png' });
  // An ailment as a creature: walk to it, strike until it is beaten; that gives adventure XP, apart from the hero's.
  const adv = page.getByTestId('adventure-level');
  // Other tests may have given adventure XP already: count from where it stands now.
  const advXp = async () => Number((await (await page.request.get('/api/patient/hero/adventure')).json()).xp);
  const xp0 = await advXp();
  await expect(adv).toContainText('Avonturier');
  await page.getByRole('button', { name: 'Loop naar Stijfheidsslijm' }).last().press('Enter');
  const strike = page.getByTestId('strike');
  // On the way the hero may pass pebbles or twigs (the strike button shows for them too): wait until it
  // stands by the slime itself.
  await expect(village).toHaveAttribute('data-near', 'mob:1', { timeout: 200_000 });
  await expect(strike).toBeVisible({ timeout: 30_000 });
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mob.png' });
  // A life bar above the creature: full at first, lower after a blow.
  const life = page.getByTestId('hp-mob:1');
  const full = Number(await life.getAttribute('data-hp'));
  expect(full).toBeGreaterThan(0);
  await strike.click();
  await expect.poll(async () => (await strike.count()) === 0 || Number(await life.getAttribute('data-hp')) < full).toBe(true);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mob-hit.png' });
  for (let i = 0; i < 4 && (await strike.count()); i++) await strike.click();
  // Twelve for the slime (and the task of the day's bonus on a day it is about slimes).
  await expect.poll(advXp, { timeout: 15_000 }).toBeGreaterThanOrEqual(xp0 + 12);
  await expect(strike).toHaveCount(0);
  // The boxing school: a round on the bag; hits give adventure XP.
  await page.getByRole('button', { name: 'Loop naar de boksschool' }).press('Enter');
  await page.getByTestId('open-boxing').click({ timeout: 200_000 });
  const round = page.getByTestId('boxing-round');
  await page.getByTestId('start-round').click();
  for (let i = 0; i < 40 && (await round.getAttribute('data-state')) === 'on'; i++) {
    const lit = round.locator('[data-lit="true"]');
    // The pad may go dark between looking and hitting: a miss, not a reason to wait.
    if (await lit.count()) await lit.first().dispatchEvent('pointerdown', undefined, { timeout: 400 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
  await expect(round).toHaveAttribute('data-state', 'done', { timeout: 20_000 });
  await expect.poll(advXp, { timeout: 15_000 }).toBeGreaterThan(xp0 + 12);
  await page.keyboard.press('Escape');
  // The flask holds what was really logged: the glass from the well is in it.
  await expect.poll(async () => Number(await page.getByTestId('flask').getAttribute('data-n')), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  if (process.env.SHOTS) {
    await page.getByRole('button', { name: /^Loop naar Oefenzaal/ }).press('Enter');
    await expect(village).toHaveAttribute('data-zone', 'practice', { timeout: 90_000 });
    await page.waitForTimeout(9000);
    await page.screenshot({ path: process.env.SHOTS + '/av-1.png' });
  }
  // The backpack holds only what the hero has: the flask with its glass, and the weapons; fists in hand.
  await page.goto('/p/held/inventaris');
  const pack = page.getByTestId('pack-weapons');
  await expect(pack.locator('[data-weapon="fists"]')).toHaveAttribute('data-state', 'on');
  await expect(page.getByTestId('pack-shops').locator('[data-shop]')).toHaveCount(5);
  await expect(page.getByTestId('backpack-flask')).toContainText(/Veldfles · \d+ glas/);
  await expect(page.getByTestId('backpack-rations')).toContainText('Rantsoenen');
  // The loot of the village: a square per kind, a question mark until it is found.
  await expect(page.getByTestId('loot').locator('[data-loot]')).toHaveCount(LOOT_KEYS.length);
  await expectAccessible(page, 'backpack');
  // Buying and making happen in the shops of the town: the hatchet at the tool shop, the chest at the workshop.
  await page.goto('/p/winkel/gereedschap');
  await expect(page.locator('[data-tool="hatchet"]')).toHaveAttribute('data-state', /shop|owned/);
  await page.goto('/p/winkel/werkplaats');
  await expect(page.locator('[data-recipe="chest"]')).toHaveAttribute('data-state', /short|ready|made/);
  await page.goto('/p/winkel/pantser');
  await expect(page.getByTestId('shop-pantser')).toBeVisible();
  // Enough adventure XP for the staff: the smith sells it, it goes on at once, and in the backpack it comes off again.
  await page.goto('/p/winkel/smid');
  const shopStaff = page.getByTestId('weapons').locator('[data-weapon="staff"]');
  const staffRow = pack.locator('[data-weapon="staff"]');
  if ((await shopStaff.count()) && (await shopStaff.getAttribute('data-state')) === 'shop' && await shopStaff.getByRole('button', { name: /Koop Wandelstaf/ }).isEnabled()) {
    await shopStaff.getByRole('button', { name: /Koop Wandelstaf/ }).click();
    await expect(shopStaff).toHaveCount(0);
    await page.goto('/p/held/inventaris');
    await expect(staffRow).toHaveAttribute('data-state', 'on');
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/pack.png', fullPage: true });
    await staffRow.getByRole('button', { name: 'Doe Wandelstaf uit' }).click();
    await expect(staffRow).toHaveAttribute('data-state', 'owned');
    await expect(pack.locator('[data-weapon="fists"]')).toHaveAttribute('data-state', 'on');
    await staffRow.getByRole('button', { name: 'Doe Wandelstaf aan' }).click();
    await expect(staffRow).toHaveAttribute('data-state', 'on');
  } else if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/pack.png', fullPage: true });
  await expectAccessible(page, 'shop');
  await context.close();
});
