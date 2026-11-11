import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@shared': path.resolve(import.meta.dirname, 'shared'), '@': path.resolve(import.meta.dirname, 'web/src') } },
  test: {
    include: ['server/test/**/*.test.ts', 'shared/**/*.test.ts', 'web/src/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    globalSetup: ['server/test/globalSetup.ts'],
    env: {
      // Separate database so tests never touch development data.
      DATABASE_OWNER_URL: 'postgres://fp_owner:fp_owner_dev@localhost:5432/fp_exercise_test',
      DATABASE_URL: 'postgres://fp_app:fp_app_dev@localhost:5432/fp_exercise_test',
      DATABASE_AUTH_URL: 'postgres://fp_auth:fp_auth_dev@localhost:5432/fp_exercise_test',
      STORAGE_DIR: './storage-test',
      APP_ORIGIN: 'http://localhost:5173',
      MAIL_TRANSPORT: 'outbox',
    },
  },
});
