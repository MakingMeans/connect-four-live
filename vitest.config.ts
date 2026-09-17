import path from 'node:path';

import { defineConfig } from 'vitest/config';

const clientAlias = { '@': path.resolve(import.meta.dirname, 'client/src') };

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: ['{shared,server}/src/**/*.test.ts'],
        },
      },
      {
        resolve: { alias: clientAlias },
        test: {
          name: 'client',
          globals: true,
          environment: 'jsdom',
          include: ['client/src/**/*.test.{ts,tsx}'],
          setupFiles: ['./client/src/test-setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['{shared,server,client}/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.*', '**/test-setup.ts', 'client/src/main.tsx', 'server/src/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
