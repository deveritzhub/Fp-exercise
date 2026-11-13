import { defineConfig } from '@playwright/test';
import rpg from './playwright.rpg.config';

// These two suites mock all API requests with synthetic fixtures and need no database.
export default defineConfig({
  ...rpg,
  testMatch: ['hero-3d.spec.ts', 'premium-rpg.spec.ts'],
  use: {
    ...rpg.use,
    reducedMotion: 'reduce',
    launchOptions: {
      ...rpg.use?.launchOptions,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
});
