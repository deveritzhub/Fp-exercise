import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a dedicated database (fp_exercise_e2e) seeded with synthetic data.
 * Only Chromium is available in this environment; mobile is emulated (viewport, touch, DPR).
 */
const DB = 'fp_exercise_e2e';
const env = {
  DATABASE_OWNER_URL: `postgres://fp_owner:fp_owner_dev@localhost:5432/${DB}`,
  DATABASE_URL: `postgres://fp_app:fp_app_dev@localhost:5432/${DB}`,
  DATABASE_AUTH_URL: `postgres://fp_auth:fp_auth_dev@localhost:5432/${DB}`,
  STORAGE_DIR: './storage-e2e',
  APP_ORIGIN: 'http://localhost:5174',
  PORT: '8788',
  API_PORT: '8788',
  DISABLE_RATE_LIMIT: '1',
};
Object.assign(process.env, env);

const executablePath = process.env.PW_CHROMIUM_PATH ?? (process.env.CI ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec/ },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/ },
  ],
  webServer: [
    { command: 'npx tsx server/src/index.ts', url: 'http://localhost:8788/api/health', env, reuseExistingServer: false, timeout: 60_000 },
    { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174', env, reuseExistingServer: false, timeout: 60_000 },
  ],
});
