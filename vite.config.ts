import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'web/src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 8787}` },
  },
  // Dependencies only loaded on demand (dynamic import) are prepared up front, so the dev server
  // does not reload the page the first time one is used.
  optimizeDeps: { include: ['qrcode'] },
  build: {
    outDir: '../dist/web', emptyOutDir: true,
    rollupOptions: { input: { app: path.resolve(__dirname, 'web/index.html'), heroStudy: path.resolve(__dirname, 'web/hero3d-study.html'), heroFaceStudy: path.resolve(__dirname, 'web/hero3d-face-study.html') } },
  },
});
