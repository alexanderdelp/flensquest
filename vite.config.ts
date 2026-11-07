import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: {
    // Drei Ebenen für Vitest; die E2E-Tests in tests/e2e laufen mit Playwright.
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      { extends: true, test: { name: 'integration', include: ['tests/integration/**/*.test.ts'] } },
      { extends: true, test: { name: 'balance', include: ['tests/balance/**/*.test.ts'], testTimeout: 300_000 } },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'html'],
      // Mindestabdeckung für Regeln und Sprache; die Oberfläche sichern die E2E-Tests.
      thresholds: {
        'src/core/**': { lines: 95, branches: 80, functions: 90 },
        'src/kladde/**': { lines: 90, branches: 75, functions: 95 },
        'src/campaigns/**': { lines: 95 },
      },
    },
  },
});
