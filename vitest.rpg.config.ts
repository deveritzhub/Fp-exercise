import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@shared':path.resolve(import.meta.dirname,'shared'),'@':path.resolve(import.meta.dirname,'web/src')}},test:{include:['shared/hero.test.ts','web/src/components/hero/*.test.ts'],environment:'node'}});
