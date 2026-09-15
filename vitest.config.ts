import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['validator/test/**/*.test.ts', 'tools/**/*.test.ts'],
  },
});
