import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from config.json
 * @type {{ baseUrl: string; headless: boolean; credentials: { username: string; password: string }; timeouts: { navigation: number; element: number } }}
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const configJson = require('./config/config.json');

/**
 * Resolve headless mode:
 * - Respect the PLAYWRIGHT_HEADLESS environment variable if set (CI override)
 * - Otherwise fall back to the headless property in config.json
 * - Default to true if neither is provided (safe headless default)
 */
const headless = process.env.PLAYWRIGHT_HEADLESS !== undefined
  ? process.env.PLAYWRIGHT_HEADLESS === 'true'
  : configJson.headless !== undefined
    ? configJson.headless
    : true;

export default defineConfig({
  /* Test configuration */
  testDir: './tests',
  fullyParallel: false, // Run tests serially to avoid auth conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: process.env.CI ? 'never' : 'on-failure' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  /* Global timeout settings */
  timeout: 60_000,
  expect: {
    timeout: configJson.timeouts?.element ?? 10_000,
  },

  /* Shared settings for all projects */
  use: {
    /* Base URL from config */
    baseURL: configJson.baseUrl,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot only on failure */
    screenshot: 'only-on-failure',

    /* Video recording only on failure */
    video: 'retain-on-failure',

    /* Navigation timeout */
    navigationTimeout: configJson.timeouts?.navigation ?? 30_000,

    /* Ignore HTTPS errors for staging with self-signed certs */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],

        /* Launch options — headless/headed controlled by config.json */
        launchOptions: {
          headless,
        },

        /* Use a fixed viewport for consistency */
        viewport: { width: 1366, height: 768 },
        /* Set locale to Saudi Arabia for date/time formatting */
        locale: 'ar-SA',
        /* Set timezone */
        timezoneId: 'Asia/Riyadh',
      },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Folder for test artifacts like screenshots and videos */
  outputDir: 'test-results/artifacts',

  /* Run local dev server before tests (uncomment if needed) */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
