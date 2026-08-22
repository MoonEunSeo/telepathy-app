import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts', 'telepathy-front/src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
