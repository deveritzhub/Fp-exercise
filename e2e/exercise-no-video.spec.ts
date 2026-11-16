import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/** An exercise without video or photo shows no empty video box, but its full description at once. */
test('without a video the exercise opens with how to do it and what to watch out for', async ({ browser }) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const [row] = (
    await db.query(
      `SELECT i.id AS item, p.id AS program, e.name_nl FROM program_items i JOIN programs p ON p.id = i.program_id JOIN exercises e ON e.id = i.exercise_id
        JOIN patients pt ON pt.id = p.patient_id
        WHERE pt.email = 'patient@praktijk-a.test' AND NOT p.is_template AND p.status = 'active'
          AND e.video_media_id IS NULL AND e.thumbnail_media_id IS NULL AND coalesce(e.movement_nl, '') <> ''
        ORDER BY i.position LIMIT 1`,
    )
  ).rows;
  await db.end();
  test.skip(!row, 'every exercise of the demo programme has a video');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL', hasTouch: true });
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  await page.goto(`/p/programma/${row.program}/oefening/${row.item}`);
  const text = page.getByTestId('exercise-text-only');
  await expect(text).toBeVisible();
  await expect(text.getByRole('heading', { name: 'Uitvoering' })).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByText(/nog geen video/)).toHaveCount(0);
  await expectAccessible(page, 'exercise without video');
  await page.screenshot({ path: 'screenshots/modules/exercise-no-video.png' });
  await ctx.close();
});
