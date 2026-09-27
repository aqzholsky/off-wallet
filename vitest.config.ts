import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/crypto/vitest.config.ts', 'apps/web/vitest.config.ts'],
  },
});
