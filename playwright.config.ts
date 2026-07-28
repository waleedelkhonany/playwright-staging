import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read non-sensitive configuration from config.json.
 * Sensitive credentials (username, password) are read from environment variables
 * via the .env file (loaded by dotenv at the top of this file).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const configJson = require('./config/config.json');

/**
 * Resolve the base URL:
 * - Prefer the BASE_URL environment variable (from .env or CI)
 * - Fall back to config.json baseUrl
 */
const baseURL = process.env.BASE_URL || configJson.baseUrl;

/**
 * Resolve headless mode:
 * - Respect the HEADLESS environment variable if set (from .env or CI override)
 * - Otherwise fall back to the headless property in config.json
 * - Default to true if neither is provided (safe headless default)
 */
const headless = process.env.HEADLESS !== undefined
  ? process.env.HEADLESS === 'true'
  : configJson.headless !== undefined
    ? configJson.headless
    : true;

/**
 * Resolve navigation timeout:
 * - Prefer NAVIGATION_TIMEOUT env var
 * - Fall back to config.json -> default 30_000
 */
const navigationTimeout = Number(process.env.NAVIGATION_TIMEOUT) || configJson.timeouts?.navigation || 30_000;

/**
 * Resolve element timeout:
 * - Prefer ELEMENT_TIMEOUT env var
 * - Fall back to config.json -> default 10_000
 */
const elementTimeout = Number(process.env.ELEMENT_TIMEOUT) || configJson.timeouts?.element || 10_000;

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
    timeout: elementTimeout,
  },

  /* Shared settings for all projects */
  use: {
    /* Base URL from env var or config */
    baseURL,

    /* Collect trace when retrying the failed test */
    trace: (process.env.TRACE_MODE as 'on-first-retry' | 'on' | 'off' | 'retain-on-failure') || 'on-first-retry',

    /* Screenshot only on failure */
    screenshot: (process.env.SCREENSHOT_MODE as 'on' | 'off' | 'only-on-failure') || 'only-on-failure',

    /* Video recording only on failure */
    video: (process.env.VIDEO_MODE as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry') || 'retain-on-failure',

    /* Navigation timeout */
    navigationTimeout,

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
