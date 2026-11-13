
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  outputDir: './test-results',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile-chromium-360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001/register',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
