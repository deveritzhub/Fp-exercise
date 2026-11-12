import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'gear-collections.spec.ts',
  workers: 1,
  use: {
    baseURL: 'http://localhost:5175',
    locale: 'nl-NL',
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH ?? (process.env.CI ? undefined : '/usr/bin/chromium'),
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5175 --host 127.0.0.1',
    url: 'http://localhost:5175',
    reuseExistingServer: false,
  },
});
