import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** The story of the village: the book with the quest, walking there, and the moment it is done. */
async function sql(q: string, p: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, p)).rows;
  } finally {
    await db.end();
  }
}

test('the first quest of the story: to the Guild master, and done', async ({ browser }) => {
  test.setTimeout(400_000);
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 }, locale: 'nl-NL' });
  await ctx.addInitScript(() => localStorage.setItem('fp.village.tip', '1'));
  const page = await ctx.newPage();
  await login(page, 'patient@praktijk-a.test');
  const [me] = await sql(`SELECT p.id FROM patients p WHERE p.email = 'patient@praktijk-a.test'`);
  await sql('DELETE FROM hero_story WHERE patient_id = $1', [me.id]);
  await page.goto('/p/dorp');
  const village = page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });

  // The book: chapter 1 and the first quest.
  await page.getByTestId('open-story').click();
  const book = page.getByTestId('story-book');
  await expect(book).toContainText('De Kroniek van de Stille Bron');
  await expect(book).toContainText('Hoofdstuk 1 · De Stille Bron');
  await expect(book.getByTestId('story-quest')).toHaveAttribute('data-quest', 'call');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/story-book.png' });
  // The quest is first in the tasks too.
  // Take me there: to the Guild hall, in, and the talk with the Guild master finishes the quest.
  await book.getByTestId('story-go').click();
  const done = page.getByTestId('story-done');
  await expect(done).toBeVisible({ timeout: 200_000 });
  await expect(done).toContainText('Het gilde roept');
  await expect(done).toContainText('+30 avonturen-XP');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/story-done.png' });
  await done.getByTestId('story-next').click();
  await expect(page.getByTestId('story-book').getByTestId('story-quest')).toHaveAttribute('data-quest', 'water');
  await sql('DELETE FROM hero_story WHERE patient_id = $1', [me.id]);
  await ctx.close();
});
