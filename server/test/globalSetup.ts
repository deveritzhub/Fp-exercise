import { setupDatabase } from '../db/setup';
import { migrate } from '../db/migrate';

export default async function () {
  process.env.DATABASE_OWNER_URL = 'postgres://fp_owner:fp_owner_dev@localhost:5432/fp_exercise_test';
  process.env.DATABASE_URL = 'postgres://fp_app:fp_app_dev@localhost:5432/fp_exercise_test';
  process.env.DATABASE_AUTH_URL = 'postgres://fp_auth:fp_auth_dev@localhost:5432/fp_exercise_test';
  await setupDatabase(true);
  await migrate(process.env.DATABASE_OWNER_URL);
}
