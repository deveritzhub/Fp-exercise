import { setupDatabase } from '../server/db/setup';
import { migrate } from '../server/db/migrate';
import { seed } from '../server/db/seed';

export default async function () {
  await setupDatabase(true);
  await migrate(process.env.DATABASE_OWNER_URL);
  await seed(process.env.DATABASE_OWNER_URL, { quiet: true });
}
