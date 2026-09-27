import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'web',
    environment: 'jsdom',
    css: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
