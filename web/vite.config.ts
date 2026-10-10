import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// base 默认 './'（本地 dev / 根路径部署都可用）；
// GitHub Pages 子路径构建时用 VITE_BASE=/muse-hub/ 指定绝对基路径
export default defineConfig({
  base: process.env.VITE_BASE || './',
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
