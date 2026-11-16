import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'node',include:[
  'web/src/components/patient/townScenery.test.ts',
  'web/src/components/patient/walk.test.ts',
]}});
