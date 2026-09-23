import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@museum/shared': fileURLToPath(new URL('./shared/src/index.ts', import.meta.url))
    }
  },
  test: {
    include: ['shared/test/**/*.test.ts', 'server/test/**/*.test.ts', 'web/test/**/*.test.ts']
  }
});
