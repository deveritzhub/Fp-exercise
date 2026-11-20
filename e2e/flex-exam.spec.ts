import pg from 'pg';
import { test, expect } from '@playwright/test';
import { login, expectAccessible } from './helpers';

/**
 * The therapist's flexibility exam: differentiation tests with clinical names, a live result with how
 * to confirm it, and the proposed library exercises turned into a programme for the patient.
 * Synthetic e2e data: two practice exercises carry the FP library keys of the proposal.
 */
async function sql<T = Record<string, unknown>>(q: string, params: unknown[] = []) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return (await db.query(q, params)).rows as T[];
  } finally {
    await db.end();
  }
}

test('the therapist finds the nerve behind a stiff toe touch and makes a programme from it', async ({ page }) => {
  test.setTimeout(90_000);
  const [emma] = await sql<{ id: string; practice_id: string }>(`SELECT id, practice_id FROM patients WHERE email = 'patient@praktijk-a.test'`);
  const cols = (await sql<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name = 'exercises' AND is_generated = 'NEVER' AND column_name NOT IN ('id','practice_id','source_key','name_nl','name_en')`)).map((c) => c.column_name).join(', ');
  for (const [key, name] of [['nd_sciatic_slider', 'Ischiadicus slider zittend'], ['nd_slump_slider', 'Slump slider']]) {
    if ((await sql(`SELECT 1 FROM exercises WHERE practice_id = $1 AND source_key = $2`, [emma.practice_id, key])).length) continue;
    await sql(
      `INSERT INTO exercises (id, practice_id, source_key, name_nl, name_en, ${cols})
       SELECT gen_random_uuid(), $1, $2, $3, $3, ${cols} FROM exercises WHERE practice_id IS NULL ORDER BY name_nl LIMIT 1`,
      [emma.practice_id, key, name],
    );
  }

  await login(page, 'therapeut@praktijk-a.test');
  await page.goto(`/app/patienten/${emma.id}?tab=mobiliteit`);
  await page.getByTestId('open-flex-exam').click();
  await expect(page).toHaveURL(new RegExp(`/app/lenigheid\\?patient=${emma.id}`));
  await expect(page.getByRole('heading', { name: 'Lenigheidsonderzoek' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Tenen aantikken' })).toHaveAttribute('aria-checked', 'true');

  // Clinical names of the tests; the answers read in the third person.
  const head = page.getByTestId('exam-test-hoofd');
  await expect(head).toContainText('Structurele differentiatie: cervicale flexie en extensie');
  const choose = async (testKey: string, label: string) => page.getByTestId(`exam-test-${testKey}`).getByText(label, { exact: true }).click();
  await choose('waar', 'In de knieholte');
  await choose('knieen', 'Ja');
  await choose('hoofd', 'Ja');
  await choose('voet', 'Ja');

  const result = page.getByTestId('exam-result');
  await expect(result.getByTestId('exam-limiter-zenuw_ischiadicus')).toContainText('waarschijnlijk');
  await expect(result.getByTestId('exam-limiter-zenuw_ischiadicus')).toContainText('SLR met dorsaal');
  await expect(result).toContainText('Ischiadicus slider zittend');
  await expect(result).toContainText('niet in je bibliotheek');
  await expectAccessible(page, 'flexibility exam');
  await page.screenshot({ path: 'screenshots/modules/flex-exam.png', fullPage: true });

  // Tingling: stop and examine neurologically.
  await choose('tintel', 'Ja');
  await expect(result).toContainText('neurologisch onderzoek');

  await result.getByTestId('exam-make-program').click();
  await expect(page).toHaveURL(/\/app\/programmas\/nieuw\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get('oefeningen')!.split(',')).toHaveLength(2);
  expect(url.searchParams.get('patient')).toBe(emma.id);
  expect(url.searchParams.get('titel')).toContain('Tenen aantikken');
});
