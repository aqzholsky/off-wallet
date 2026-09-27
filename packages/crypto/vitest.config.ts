import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'crypto',
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
