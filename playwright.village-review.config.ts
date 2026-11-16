import { defineConfig } from '@playwright/test';
import rpg from './playwright.rpg.config';
export default defineConfig({
  ...rpg,
  testMatch:'village-scenery.spec.ts',
  use:{...rpg.use,locale:'nl-NL',reducedMotion:'reduce',launchOptions:{...rpg.use?.launchOptions,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
});
