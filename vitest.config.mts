import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Sadece src/core (saf TypeScript, React yok) test edilir.
// UI görsel olarak doğrulanır, jsdom kurulumuna gerek yok.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/core/**/*.test.ts'],
    environment: 'node',
  },
});
