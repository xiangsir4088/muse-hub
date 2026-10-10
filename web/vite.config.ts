import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// base: './' 让资源路径相对化，GitHub Pages 子路径（/muse-hub/）下也能正常加载
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@museum/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/content': 'http://localhost:3001'
    }
  }
});
