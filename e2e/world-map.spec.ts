import { mkdirSync } from 'node:fs';
import pg from 'pg';
import { expect, test } from '@playwright/test';
import { expectAccessible, login } from './helpers';

const SHOTS = 'screenshots/world-map';

test('world map and guild raid fit a 360 px phone and do not unlock phases', async ({ browser }) => {
  test.setTimeout(90_000);
  mkdirSync(SHOTS, { recursive: true });
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const emma = (await db.query(`SELECT p.id, p.practice_id, pr.id AS program_id FROM patients p JOIN users u ON u.id = p.user_id JOIN programs pr ON pr.patient_id = p.id AND pr.status = 'active' WHERE u.email = 'patient@praktijk-a.test' LIMIT 1`)).rows[0];
  const phaseProgram = (await db.query(
    `INSERT INTO programs(practice_id, patient_id, title, status, module, series_key, phase_no, phase_count, phase_name, phase_goal)
     VALUES ($1, $2, 'Zone basis', 'completed', 'revalidatie', 'e2e-world', 1, 3, 'Basis', 'Bewegen') RETURNING id`,
    [emma.practice_id, emma.id],
  )).rows[0].id as string;
  await db.query(
    `UPDATE programs SET series_key = 'e2e-world', series_title = 'Knie', phase_no = 2, phase_count = 3, phase_name = 'Kracht', phase_weeks = '5-8', phase_goal = 'Controle' WHERE id = $1`,
    [emma.program_id],
  );
  for (const [no, name] of [[1, 'Basis'], [2, 'Kracht'], [3, 'Sport']] as const) {
    await db.query(
      `INSERT INTO programs(practice_id, is_template, title, status, module, series_key, series_title, phase_no, phase_count, phase_name, phase_weeks, phase_goal)
       VALUES ($1, true, $2, 'active', 'revalidatie', 'e2e-world', 'Knie', $3, 3, $2, '1-4', 'Doel')`,
      [emma.practice_id, name, no],
    );
  }
  await db.query(
    `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at)
     SELECT $1, $2, $3, 1, now() - interval '3 days', now() - interval '3 days' FROM generate_series(1, 3)`,
    [emma.practice_id, emma.id, phaseProgram],
  );
  const extra = (await db.query(`INSERT INTO patients(practice_id, first_name, last_name) VALUES ($1, 'Kaart', 'Test') RETURNING id`, [emma.practice_id])).rows[0].id as string;
  await db.query(
    `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at)
     VALUES ($1, $2, $3, 1, now(), now())`,
    [emma.practice_id, extra, emma.program_id],
  );
  await db.query(
    `INSERT INTO daily_checkins(patient_id, practice_id, day, area, score)
     VALUES ($1, $2, (now() AT TIME ZONE 'Europe/Amsterdam')::date, 'knee_r', 3)
     ON CONFLICT (patient_id, day) DO UPDATE SET score = 3`,
    [emma.id, emma.practice_id],
  );

  const patientCtx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const patient = await patientCtx.newPage();
  const posts: string[] = [];
  patient.on('request', (req) => {
    if (req.method() === 'POST') posts.push(req.url());
  });
  try {
    await login(patient, 'patient@praktijk-a.test');
    await patient.goto('/p/wereld');
    await expect(patient.getByRole('heading', { name: 'Wereldkaart' })).toBeVisible();
    await expect(patient.getByText('Knievallei').first()).toBeVisible();
    await expect(patient.getByText('Rustbuff:')).toBeVisible();
    const current = patient.locator('button[data-zone-status="current"]');
    await expect(current).toHaveAttribute('aria-current', 'step');
    await expect(current).toContainText('Je held staat in deze zone');
    const locked = patient.locator('button[data-zone-status="next"]');
    await locked.focus();
    await patient.keyboard.press('Enter');
    await expect(locked).toHaveAttribute('aria-pressed', 'true');
    await expect(patient.getByRole('region', { name: 'Gekozen zone' })).toContainText('Nog in de mist');
    await expect(current).toHaveAttribute('aria-current', 'step');
    await expect(patient.getByRole('button', { name: /vrijgeven|goedkeuren/i })).toHaveCount(0);
    await expect(patient.getByRole('heading', { name: 'Gilderaid' })).toBeVisible();
    await expect(patient.getByText(/levenspunten|verslagen|verborgen/i)).toBeVisible();
    expect(posts.filter((u) => u.includes('/world') || u.includes('/guild'))).toEqual([]);
    const overflow = await patient.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expectAccessible(patient, 'world map');
    await patient.screenshot({ path: `${SHOTS}/patient-360.png`, fullPage: true, animations: 'disabled' });

    const staffCtx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
    const staff = await staffCtx.newPage();
    await login(staff, 'therapeut@praktijk-a.test');
    const raid = staff.getByRole('region', { name: 'Gilderaid' });
    await raid.scrollIntoViewIfNeeded();
    await expect(raid).toBeVisible();
    await expect(raid).not.toContainText(/Emma|Lucas|Sophie|Daan|Kaart/);
    const staffOverflow = await staff.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(staffOverflow).toBeLessThanOrEqual(1);
    await staff.screenshot({ path: `${SHOTS}/therapist-360.png`, fullPage: true, animations: 'disabled' });
    await staffCtx.close();
  } finally {
    await patientCtx.close();
    await db.query(`DELETE FROM daily_checkins WHERE patient_id = $1 AND area = 'knee_r'`, [emma.id]);
    await db.query(`DELETE FROM workout_sessions WHERE patient_id = $1`, [extra]);
    await db.query(`DELETE FROM patients WHERE id = $1`, [extra]);
    await db.query(`DELETE FROM workout_sessions WHERE program_id = $1`, [phaseProgram]);
    await db.query(`DELETE FROM programs WHERE id = $1`, [phaseProgram]);
    await db.query(`DELETE FROM programs WHERE is_template AND series_key = 'e2e-world'`);
    await db.query(
      `UPDATE programs SET series_key = NULL, series_title = NULL, phase_no = NULL, phase_count = NULL, phase_name = NULL, phase_weeks = NULL, phase_goal = NULL WHERE id = $1`,
      [emma.program_id],
    );
    await db.end();
  }
});
