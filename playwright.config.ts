import { defineConfig } from '@playwright/test';

/**
 * E2E: echte Oberfläche im Browser. Lokal mit dem vorhandenen Edge, in der CI mit Chrome;
 * Browser werden nicht heruntergeladen. Eigener Port, damit ein laufender Dev-Server nicht stört.
 */
const channel = process.env.PW_CHANNEL ?? (process.env.CI ? 'chrome' : 'msedge');

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:5191',
    channel,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npx vite --port 5191 --strictPort',
    url: 'http://localhost:5191',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
