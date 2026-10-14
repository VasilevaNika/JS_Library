import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
    // Как в сборке: для Node берутся варианты *.node.ts (база на node:sqlite, хэш на node:crypto).
    extensions: ['.node.ts', '.ts', '.js', '.mjs', '.json'],
  },
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
  },
});
