import { test, expect } from '@playwright/test';
import { expectAccessible, login } from './helpers';

test('marketing pages render with SEO basics and pass accessibility checks', async ({ page }) => {
  for (const [path, heading] of [
    ['/', /Oefentherapie die/],
    ['/functies', /Van voorschrijven tot bijsturen/],
    ['/hoe-het-werkt', /Drie minuten/],
    ['/prijzen', /Eenvoudige prijzen/],
    ['/demo', /Probeer het zelf/],
    ['/contact', /Laten we kennismaken/],
    ['/privacy', /Privacyverklaring/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page).toHaveTitle(/FP Exercise/);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    await expectAccessible(page, path);
  }
  await page.goto('/');
  expect(await page.locator('script[type="application/ld+json"]').count()).toBe(1);
});

test('pricing shows configurable plans without live payments', async ({ page }) => {
  await page.goto('/prijzen');
  await expect(page.getByRole('heading', { name: 'Praktijk' })).toBeVisible();
  await page.getByRole('radio', { name: /Jaarlijks/ }).click();
  await expect(page.getByText('Online betalen is nog niet beschikbaar', { exact: false })).toBeVisible();
});

test('contact form requires consent and accepts a valid message', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Naam').fill('Test Persoon');
  await page.getByLabel('E-mailadres').fill('test@voorbeeld.test');
  await page.getByLabel('Bericht', { exact: true }).fill('Graag een demo voor onze praktijk.');
  await page.getByRole('button', { name: 'Verstuur bericht' }).click();
  await expect(page.getByText(/Geef toestemming/)).toBeVisible();
  await page.getByLabel(/Ik ga akkoord/).check();
  await page.waitForTimeout(2600); // minimum fill time (anti-spam)
  await page.getByRole('button', { name: 'Verstuur bericht' }).click();
  await expect(page.getByText('Bedankt voor je bericht!')).toBeVisible();
});

test('interactive demo works without an account', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Kinintrekking/ }).click();
  await expect(page.getByRole('button', { name: /Kinintrekking/ })).toHaveCount(2);
});

test('language can be switched to English', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Taal wijzigen/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Exercise therapy your patients/ })).toBeVisible();
  await page.getByRole('button', { name: /Switch language/ }).click();
});

test('therapist workspace pages are accessible', async ({ page }) => {
  await login(page, 'eigenaar@praktijk-a.test');
  for (const path of ['/app', '/app/patienten', '/app/oefeningen', '/app/programmas', '/app/praktijk']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expectAccessible(page, path);
  }
});

test('library search and filters', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen');
  await page.getByLabel('Oefeningen zoeken').fill('kuit');
  await expect(page.getByRole('heading', { name: 'Hielheffen staand' })).toBeVisible();
  await page.getByLabel('Oefeningen zoeken').fill('');
  await page.getByLabel('Lichaamsregio').selectOption('shoulder');
  await expect(page.getByRole('heading', { name: 'Slingeroefening' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bekkenbrug' })).toHaveCount(0);
});

test('platform admin sees practices but no patient data', async ({ page }) => {
  await login(page, 'admin@fp-exercise.test');
  await expect(page.getByRole('heading', { name: 'Praktijken', exact: true })).toBeVisible();
  await expect(page.getByText('Functional Performance (demo)').first()).toBeVisible();
  const status = await page.evaluate(async () => (await fetch('/api/patients')).status);
  expect(status).toBe(403);
  await page.goto('/app/patienten');
  await expect(page).toHaveURL(/\/admin$/);
});

test('unauthenticated users are redirected to login', async ({ page }) => {
  await page.goto('/app/patienten');
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fpatienten/);
  await page.goto('/p');
  await expect(page).toHaveURL(/\/login/);
});

test('therapist adds a practice video to a library exercise', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await page.goto('/app/oefeningen');
  await page.getByLabel('Oefeningen zoeken').fill('muurglijder');
  await page.getByRole('heading', { name: 'Muurglijder' }).click();
  await expect(page.getByRole('heading', { name: 'Video van je praktijk' })).toBeVisible();
  // synthetic bytes with an MP4 signature (not a real recording)
  const bytes = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(4000, 7)]);
  await page.locator('input[type=file][accept^="video"]').setInputFiles({ name: 'muurglijder.mp4', mimeType: 'video/mp4', buffer: bytes });
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await expect(page.getByText('Video opgeslagen')).toBeVisible();
  await page.reload();
  await expect(page.locator('video').first()).toBeVisible();
});

test('therapist approves a library exercise for the practice', async ({ page }) => {
  await login(page, 'eigenaar@praktijk-a.test');
  await page.goto('/app/oefeningen');
  await page.getByLabel('Oefeningen zoeken').fill('kat-koe');
  await page.getByRole('heading', { name: 'Kat-koe' }).click();
  await expect(page.getByText('Nog niet klinisch gecontroleerd')).toBeVisible();
  await expectAccessible(page, 'exercise-detail');
  await page.getByRole('button', { name: 'Goedkeuren' }).click();
  await expect(page.getByText(/Goedgekeurd door Sanne Visser/)).toBeVisible();
  await page.goto('/app/oefeningen');
  await page.getByRole('tab', { name: 'Goedgekeurd' }).click();
  await expect(page.getByRole('heading', { name: 'Kat-koe' })).toBeVisible();
});

test('quick search (Ctrl+K) finds a patient and opens it', async ({ page }) => {
  await login(page, 'therapeut@praktijk-a.test');
  await expect(page.getByRole('heading', { name: /Joris/ })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('emma');
  await expect(page.getByRole('option', { name: /Emma de Jong/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/patienten\//);
  await expect(page.getByRole('heading', { name: 'Emma de Jong' })).toBeVisible();
});
