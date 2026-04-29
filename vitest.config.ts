import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['lib/**/__tests__/**/*.test.ts', 'lib/**/__tests__/**/*.test.tsx'],
    setupFiles: [],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
