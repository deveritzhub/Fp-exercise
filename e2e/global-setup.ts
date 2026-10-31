import pg from 'pg';
import { setupDatabase } from '../server/db/setup';
import { migrate } from '../server/db/migrate';
import { seed } from '../server/db/seed';

export default async function () {
  await setupDatabase(true);
  await migrate(process.env.DATABASE_OWNER_URL);
  await seed(process.env.DATABASE_OWNER_URL, { quiet: true });
  // The seeded patients already have a sports hero, so the other specs land on the home screen;
  // e2e/hero.spec.ts removes Emma's hero to test the first visit.
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  await db.query(
    `INSERT INTO patient_heroes(patient_id, practice_id, hero_name, skin, hair, outfit, sport)
     SELECT id, practice_id, first_name, 's3', 'short', 'forest', 'running' FROM patients ON CONFLICT DO NOTHING`,
  );
  await db.end();
}
