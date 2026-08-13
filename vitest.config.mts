import { defineConfig } from 'vitest/config';
import path from 'node:path';

const root = import.meta.dirname;

// Sadece src/core (saf TypeScript, React yok) test edilir.
// UI görsel olarak doğrulanır, jsdom kurulumuna gerek yok.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  test: {
    // Yalnızca saf TypeScript katmanları: motor ve metin işleme
    include: [
      'src/core/**/*.test.ts',
      'src/ingest/**/*.test.ts',
      'src/train/**/*.test.ts',
      // AI katmanı: bağdaştırıcılar `react-native` içe aktarmıyor, testler ağa çıkmıyor
      'src/ai/**/*.test.ts',
    ],
    environment: 'node',
  },
});
