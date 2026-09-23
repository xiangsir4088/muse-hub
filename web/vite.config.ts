import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
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
