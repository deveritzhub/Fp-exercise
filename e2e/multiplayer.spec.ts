import pg from 'pg';
import { test, expect, type Browser } from '@playwright/test';
import { login } from './helpers';

/** Playing together: two friends see each other walk in the village and say something to each other. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}
const reset = () =>
  sql(`DELETE FROM hero_cheers; DELETE FROM hero_friendships; UPDATE patient_heroes SET share_with_friends = false, friend_code = NULL, shared_stats = NULL, stats_updated_at = NULL`);
test.beforeAll(reset);
test.afterAll(reset);

async function player(browser: Browser, email: string) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, locale: 'nl-NL' });
  await ctx.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  const page = await ctx.newPage();
  await login(page, email);
  return page;
}
const H = { 'x-requested-with': 'fp' };

test('two friends see each other in the village and say hello', async ({ browser }) => {
  test.setTimeout(400_000);
  const emma = await player(browser, 'patient@praktijk-a.test');
  const noah = await player(browser, 'patient@praktijk-b.test');
  // Both have a hero and share; Noah asks, Emma accepts.
  const look = { frame: 'm', build: 'athletic', skin: 's3', hair: 'short', hairColor: 'brown', eyeColor: 'brown', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' };
  if (!(await (await noah.request.get('/api/patient/hero')).json()).hero) await noah.request.put('/api/patient/hero', { headers: H, data: { ...look, heroName: 'Keeper Noah' } });
  await sql(`UPDATE patient_heroes SET hero_name = 'Keeper Noah' FROM patients p WHERE p.id = patient_heroes.patient_id AND p.email = 'patient@praktijk-b.test'`);
  const code = (await (await emma.request.put('/api/patient/hero/sharing', { headers: H, data: { enabled: true } })).json()).sharing.code as string;
  await noah.request.put('/api/patient/hero/sharing', { headers: H, data: { enabled: true } });
  expect((await noah.request.post('/api/patient/hero/friends', { headers: H, data: { code } })).status()).toBe(201);
  const fid = (await (await emma.request.get('/api/patient/hero/friends')).json()).friends[0].id as string;
  await emma.request.post(`/api/patient/hero/friends/${fid}/accept`, { headers: H, data: {} });

  // Both in the village, by the well.
  for (const p of [emma, noah]) await p.goto('/p/dorp');
  for (const p of [emma, noah]) await expect(p.getByTestId('walk-village')).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  // Each sees the other: on the chip, and as a figure in the world.
  for (const p of [emma, noah]) await expect(p.getByTestId('friends-online')).toHaveAttribute('data-n', '1', { timeout: 30_000 });
  for (const p of [emma, noah]) {
    if ((await p.getByTestId('walk-village').getAttribute('data-zone')) !== 'village') {
      await p.getByRole('button', { name: 'Loop naar de uitgang' }).press('Enter');
      await expect(p.getByTestId('walk-village')).toHaveAttribute('data-zone', 'village', { timeout: 60_000 });
    }
  }
  await expect(emma.getByTestId('walk-village')).toHaveAttribute('data-friends', '1', { timeout: 60_000 });
  await expect(noah.getByTestId('walk-village')).toHaveAttribute('data-friends', '1', { timeout: 60_000 });
  if (process.env.SHOTS) await emma.screenshot({ path: process.env.SHOTS + '/multiplayer.png' });

  // Noah says hello; Emma reads it.
  await noah.getByTestId('friends-online').click();
  await expect(noah.getByTestId('friends-panel').locator('[data-friend]')).toHaveCount(1);
  await noah.getByTestId('sayings').getByRole('button', { name: 'Hoi! 👋' }).click();
  await expect(emma.getByText(/Keeper Noah: Hoi!/)).toBeVisible({ timeout: 15_000 });

  // Sharing off: Noah is gone from Emma's village.
  await noah.request.put('/api/patient/hero/sharing', { headers: H, data: { enabled: false } });
  await noah.close();
  await expect(emma.getByTestId('walk-village')).toHaveAttribute('data-friends', '0', { timeout: 60_000 });
});
