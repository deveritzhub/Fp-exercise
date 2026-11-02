import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible, expandFolds } from './helpers';

/** Sports hero: first visit → character creator → body map → character sheet; therapist sees the map. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

// Put every seeded patient's hero back for the other specs.
test.afterAll(async () => {
  await sql(`INSERT INTO patient_heroes(patient_id, practice_id, hero_name, skin, hair, outfit, sport)
    SELECT id, practice_id, first_name, 's4', 'short', 'forest', 'running' FROM patients ON CONFLICT DO NOTHING`);
});

test('patient creates a sports hero on the first visit and marks where it hurts', async ({ browser, page }) => {
  test.setTimeout(120_000);
  const [emma] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  await sql('DELETE FROM patient_heroes WHERE patient_id = $1', [emma.id]);
  await sql('DELETE FROM pain_map_entries WHERE patient_id = $1', [emma.id]);

  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await expect(pp).toHaveURL(/\/p\/held\/nieuw$/);
  await expect(pp.getByRole('heading', { name: 'Maak je sportheld' })).toBeVisible();
  await expectAccessible(pp, 'hero step 1');
  await pp.getByLabel('Naam van je held').fill('Emma de Sprinter');
  // Several sports can be ticked; running (the default) stays the main one.
  await expect(pp.getByRole('checkbox', { name: 'Hardlopen' })).toBeChecked();
  await pp.getByRole('checkbox', { name: 'Fitness' }).click();
  await pp.getByRole('checkbox', { name: 'Wandelen' }).click();
  await expect(pp.getByRole('checkbox', { name: /Fitness/ })).toBeChecked();
  await pp.getByRole('button', { name: 'Volgende' }).click();

  // Body: figure, build, skin tone; the preview follows.
  await expect(pp.getByRole('heading', { name: 'Je lichaam' })).toBeVisible();
  await pp.getByRole('radio', { name: 'Vrouwelijk figuur' }).click();
  await pp.getByRole('radio', { name: 'Sportief' }).click();
  await pp.getByRole('radio', { name: 'Huidskleur 3 van 5' }).click();
  await expect(pp.getByRole('img', { name: 'Voorbeeld van Emma de Sprinter' })).toBeVisible();
  await expectAccessible(pp, 'hero body');
  await pp.screenshot({ path: 'screenshots/hero/body-step.png', fullPage: true });
  await pp.getByRole('button', { name: 'Volgende' }).click();

  // Hairstyle: four photo styles per figure.
  await expect(pp.getByRole('heading', { name: 'Je kapsel' })).toBeVisible();
  await expect(pp.getByText('Stap 3 van 4')).toBeVisible();
  await pp.getByRole('group', { name: 'Kapsel' }).getByRole('radio', { name: 'Krullen' }).click();
  await expectAccessible(pp, 'hero face');
  await pp.screenshot({ path: 'screenshots/hero/face-step.png', fullPage: true });
  await pp.getByRole('button', { name: 'Volgende' }).click();

  await expect(pp.getByRole('heading', { name: 'Waar heb je pijn?' })).toBeVisible();
  await pp.getByRole('button', { name: /^Linkerknie/ }).click();
  await pp.getByLabel(/Hoeveel pijn/).fill('7');
  await expect(pp.getByRole('button', { name: /^Linkerknie: 7\/10, veel/ })).toBeVisible();
  await pp.getByRole('radio', { name: 'Achterkant' }).click();
  await pp.getByRole('button', { name: /^Onderrug/ }).click();
  await pp.getByLabel(/Hoeveel pijn/).fill('4');
  await expectAccessible(pp, 'body map');
  expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await pp.screenshot({ path: 'screenshots/hero/body-map.png', fullPage: true });
  await pp.getByRole('button', { name: 'Klaar: start mijn avontuur' }).click();

  await expect(pp).toHaveURL(/\/p\/held$/);
  await expandFolds(pp);
  await expect(pp.getByRole('heading', { name: 'Emma de Sprinter' })).toBeVisible();
  await expect(pp.getByText(/Level \d+ · /).first()).toBeVisible();
  await expect(pp.getByRole('img', { name: /Linkerknie: 7\/10/ })).toBeVisible();
  // Daily check-in (5 seconds) and weekly quests.
  const checkin = pp.getByRole('region', { name: 'Dagcheck' }).or(pp.locator('section[aria-labelledby="checkin-title"]'));
  await expect(pp.getByRole('heading', { name: /Hoe voelt je linkerknie vandaag\?/ })).toBeVisible();
  await pp.getByLabel('0 = geen pijn, 10 = ergst denkbaar').fill('6');
  await checkin.getByRole('button', { name: 'Opslaan' }).click();
  await expect(pp.getByText(/Dagcheck gedaan: 6\/10/)).toBeVisible();
  await expect(pp.getByRole('heading', { name: 'Weekquests' })).toBeVisible();
  // The weekly boss: a health bar that training and check-ins wear down.
  await expect(pp.getByText('Baas van de week').first()).toBeVisible();
  await expect(pp.getByRole('progressbar', { name: /^Leven van / }).first()).toBeVisible();
  await expect(pp.getByText('Doe een dagcheck of werk je pijnkaart bij')).toBeVisible();
  await expect(pp.getByText(/Weekkist geopend|Haal alle drie voor de weekkist/)).toBeVisible();
  // Each quest leads to where it is done.
  await expect(pp.getByRole('link', { name: /Doe een dagcheck of werk je pijnkaart bij/ })).toHaveAttribute('href', '/p/held/pijn');
  await expect(pp.getByRole('link', { name: /Train .* dagen|Doe 1 training/ })).toHaveAttribute('href', '/p');
  // Gear: bought in the shop with private coins; every item shows its tier and tier score.
  // The inventory and shop have their own page, one tap from the hero.
  await pp.getByRole('link', { name: /^Inventaris & winkel · \d+$/ }).click();
  await expect(pp).toHaveURL(/\/p\/held\/inventaris$/);
  await expect(pp.getByRole('heading', { name: /Uitrusting \(\d+ van \d+\)/ })).toBeVisible();
  await expect(pp.getByText(/^\d+ muntjes/).first()).toBeVisible();
  await expect(pp.getByText(/^Gearscore \d+$/).first()).toBeVisible();
  await expect(pp.getByText(/Legendarisch · 100/).first()).toBeVisible();
  const buy = pp.getByRole('button', { name: /^Kopen 15 muntjes: / }).first();
  if (await buy.count()) {
    await buy.click();
    await expect(pp.getByText(/gekocht en aangedaan/)).toBeVisible();
    // Clear the stacked messages so they do not cover the + button during the next checks.
    const close = pp.getByRole('status').getByRole('button', { name: 'Sluiten / Close' });
    while (await close.count()) await close.first().click();
    await expect(pp.getByRole('button', { name: /Aan ✓/, pressed: true }).first()).toBeVisible();
  }
  await pp.getByRole('link', { name: 'Terug naar je held' }).click();
  await expandFolds(pp);
  // Main quest: goal, week of the schedule, expected time to the goal.
  await expect(pp.getByRole('heading', { name: 'Knie — patellapees belastingsopbouw' })).toBeVisible();
  await expect(pp.getByText(/Week \d+ van \d+/)).toBeVisible();
  await expect(pp.getByText(/bereik je je doel rond|aan het einde van het schema/)).toBeVisible();
  // Skills (RuneScape-style): 9 skills, details in a dialog.
  await expect(pp.getByRole('heading', { name: 'Skills' })).toBeVisible();
  await expect(pp.getByRole('button', { name: /^Discipline\s*level \d+\/99$/ })).toBeVisible();
  await pp.getByRole('button', { name: /^Kracht\s*level/ }).click();
  await expect(pp.getByRole('dialog', { name: /Kracht · level \d+/ })).toBeVisible();
  await expectAccessible(pp, 'skill dialog');
  await pp.getByRole('button', { name: 'Sluiten', exact: true }).last().click();
  await expectAccessible(pp, 'character sheet');
  await pp.screenshot({ path: 'screenshots/hero/character-sheet.png', fullPage: true });

  // Home shows the hero card; the Held tab is in the bottom bar.
  await pp.goto('/p');
  await expect(pp.getByRole('link', { name: /Emma de Sprinter/ })).toBeVisible();
  await expect(pp.getByRole('navigation', { name: 'Navigatie' }).getByRole('link', { name: 'Held' })).toBeVisible();
  await pp.screenshot({ path: 'screenshots/hero/home.png', fullPage: true });

  // Pain check-in: knee better.
  await pp.goto('/p/held/pijn');
  await pp.getByRole('button', { name: /^Linkerknie/ }).click();
  await pp.getByLabel(/Hoeveel pijn/).fill('3');
  await pp.getByRole('button', { name: 'Opslaan' }).click();
  await expect(pp).toHaveURL(/\/p\/held$/);
  await expandFolds(pp);
  await expect(pp.getByRole('img', { name: /Linkerknie: 3\/10, licht \(start 7\/10\)/ })).toBeVisible();

  // A workout: XP for the hero, and a level up when a skill goes up.
  const home = await (await pp.request.get('/api/patient/home')).json();
  const before = await (await pp.request.get('/api/patient/hero')).json();
  expect(before.hero.sports).toEqual(['running', 'fitness', 'walking']);
  expect(before.hero.sport).toBe('running');
  await pp.goto(`/p/sessie/${home.programs[0].id}`);
  await pp.getByRole('button', { name: /Beginnen|Verder met training/ }).click();
  for (let i = 0; i < 12; i++) {
    if (await pp.getByRole('button', { name: 'Training afronden' }).isVisible()) break;
    await pp.getByRole('button', { name: 'Oefening gedaan' }).click();
    await pp.getByRole('button', { name: 'Hoe zwaar was het?: 4', exact: true }).click();
    await pp.getByRole('button', { name: 'Pijn of ongemak tijdens de oefening: 1', exact: true }).click();
    await pp.getByRole('button', { name: 'Opslaan en verder' }).click();
    await pp.waitForTimeout(200);
  }
  await pp.getByRole('button', { name: 'Pijn of ongemak na de training: 2', exact: true }).click();
  await pp.getByRole('button', { name: 'Training afronden' }).click();
  await expect(pp.getByText('+60 XP voor je sportheld')).toBeVisible();
  const after = await (await pp.request.get('/api/patient/hero')).json();
  const up = after.skills.some((k: { key: string; level: number }) => k.level > before.skills.find((b: { key: string }) => b.key === k.key).level);
  if (up) await expect(pp.getByText('Level up!')).toBeVisible();
  else await expect(pp.getByText('Level up!')).toHaveCount(0);
  await pp.screenshot({ path: 'screenshots/hero/workout-done.png', fullPage: true });
  await ctx.close();

  // An earlier measurement two weeks ago, so there is a trend over time.
  await sql(`INSERT INTO pain_map_entries(patient_id, practice_id, batch, area, score, recorded_at)
             SELECT id, practice_id, gen_random_uuid(), 'knee_l', 8, now() - interval '14 days' FROM patients WHERE id = $1`, [emma.id]);

  // Therapist sees the body map in the record.
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto(`/app/patienten/${emma.id}`);
  await expect(page.getByRole('heading', { name: 'Pijnkaart (door patiënt ingevuld)' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Linkerknie' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '3 · licht' })).toBeVisible();
  // Pain trend per area next to adherence.
  await expect(page.getByRole('heading', { name: 'Pijnverloop per plek' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Therapietrouw per week' })).toBeVisible();
  await expectAccessible(page, 'therapist pain map');
  await page.screenshot({ path: 'screenshots/hero/therapist.png', fullPage: true });
});

test('"Later" postpones the character creator for this visit', async ({ browser }) => {
  const [p] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-b.test'`);
  await sql('DELETE FROM patient_heroes WHERE patient_id = $1', [p.id]);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  await expect(pp).toHaveURL(/\/p\/held\/nieuw$/);
  await pp.getByRole('link', { name: 'Later' }).click();
  await expect(pp).toHaveURL(/\/p$/);
  await expect(pp.getByRole('link', { name: /Maak je sportheld/ })).toBeVisible();
  await ctx.close();
});

test('no label in the hero creator is cut off on a 360 px phone', async ({ browser }) => {
  const [p] = await sql(`SELECT id FROM patients WHERE email = 'patient@praktijk-b.test'`);
  await sql('DELETE FROM patient_heroes WHERE patient_id = $1', [p.id]);
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-b.test');
  await pp.getByRole('button', { name: 'Volgende' }).click();
  for (let step = 2; step <= 3; step++) {
    const cut = await pp.evaluate(() =>
      [...document.querySelectorAll('fieldset label, fieldset label span:not(.sr-only):not([aria-hidden])')]
        .filter((el) => !el.closest('[aria-hidden]') && (el.textContent ?? '').trim() && el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent),
    );
    expect(cut, `step ${step}`).toEqual([]);
    expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await pp.getByRole('button', { name: 'Volgende' }).click();
  }
  await ctx.close();
});

test('tapping the hero photo opens look and body measurements', async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.goto('/p');
  // The photo itself, not only a text link buried on the character sheet.
  await pp.getByRole('link', { name: 'Uiterlijk en maten aanpassen' }).click();
  await expect(pp).toHaveURL(/\/p\/held\/uiterlijk$/);
  await expect(pp.getByRole('heading', { name: 'Uiterlijk en maten' })).toBeVisible();
  await expect(pp.getByRole('img', { name: /Voorbeeld van/ })).toBeVisible();
  await expect(pp.getByLabel('Gewicht (kg)')).toBeVisible();
  await expect(pp.getByLabel('Lichaamsvet (%)')).toBeVisible();
  await expect(pp.getByLabel('Lengte (cm)')).toBeVisible();
  // "Verzin een naam" suggests a playful nickname; a second tap gives another one.
  const nameField = pp.getByLabel('Naam van je held');
  const original = await nameField.inputValue();
  await pp.getByRole('button', { name: 'Verzin een naam' }).click();
  const first = await nameField.inputValue();
  expect(first).toMatch(/^\S+ \S+$/);
  await pp.getByRole('button', { name: 'Verzin een naam' }).click();
  await expect(nameField).not.toHaveValue(first);
  await nameField.fill(original);
  await pp.getByRole('group', { name: 'Kapsel' }).getByRole('radio', { name: 'Lang los haar' }).click();
  await pp.getByLabel('Gewicht (kg)').fill('72,5');
  await pp.getByLabel('Lichaamsvet (%)').fill('24');
  await pp.getByLabel('Lengte (cm)').fill('168');
  await expectAccessible(pp, 'hero profile');
  expect(await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await pp.screenshot({ path: 'screenshots/hero/profile.png', fullPage: true });
  await pp.getByRole('button', { name: 'Opslaan' }).click();
  await expect(pp).toHaveURL(/\/p\/held$/);
  // The confirmation is a short message: check it before unfolding the page.
  await expect(pp.getByText('Uiterlijk en maten opgeslagen')).toBeVisible();
  await expandFolds(pp);
  const hero = await (await pp.request.get('/api/patient/hero')).json();
  expect(hero.hero).toMatchObject({ hair: 'long', hairColor: 'darkbrown' });
  expect(hero.metrics).toMatchObject({ weightKg: 72.5, bodyFatPct: 24, heightCm: 168 });
  // Photo on the character sheet opens the same editor.
  await pp.getByRole('link', { name: 'Uiterlijk en maten aanpassen' }).click();
  await expect(pp.getByLabel('Gewicht (kg)')).toHaveValue('72,5');
  await ctx.close();
});

test('skill names are never cut off on a 360 px phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const pp = await ctx.newPage();
  await login(pp, 'patient@praktijk-a.test');
  await pp.goto('/p/held');
  await expandFolds(pp);
  await expect(pp.getByRole('heading', { name: 'Skills' })).toBeVisible();
  const cut = await pp.evaluate(() =>
    [...document.querySelectorAll('[aria-labelledby="skills-title"] li span:not(.sr-only)')].filter((el) => el.scrollWidth > el.clientWidth + 1 && (el.textContent ?? '').trim()).map((el) => el.textContent),
  );
  expect(cut).toEqual([]);
  await ctx.close();
});
