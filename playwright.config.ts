import './src/helpers/load-env';
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read non-sensitive configuration from config.json.
 * Sensitive credentials (username, password) are read from environment variables
 * via the .env file (loaded by dotenv at the top of this file).
 *
 * NOTE: baseUrl is NOT read from config.json — it MUST be set via the BASE_URL
 * environment variable in your .env file. This ensures the target environment
 * is always explicit and never accidentally overridden.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const configJson = require('./config/config.json');

/**
 * Resolve the base URL — ALWAYS from the .env file.
 * A descriptive error is thrown if BASE_URL is not set.
 */
const baseURL = (() => {
  const url = process.env.BASE_URL;
  if (!url) {
    throw new Error(
      'BASE_URL is not set. You MUST define it in your .env file.\n' +
      '  Copy .env.example to .env and set BASE_URL to your staging instance.\n' +
      '  Example: BASE_URL=https://staging.careconnectksa.com',
    );
  }
  return url;
})();

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

/**
 * Resolve trace recording mode:
 * - Prefer TRACE_MODE env var
 * - Fall back to config.json trace.mode
 * - Default to 'on-first-retry' (collect trace when retrying a failed test)
 */
const traceMode = (process.env.TRACE_MODE as 'off' | 'on' | 'retain-on-failure' | 'on-first-retry' | 'on-all-retries' | 'retain-on-first-failure' | 'retain-on-failure-and-retries')
  || configJson.trace?.mode
  || 'on-first-retry';

/**
 * Resolve video recording mode:
 * - Prefer VIDEO_MODE env var
 * - Fall back to config.json video.mode
 * - Default to 'on' (record and keep a video after EVERY test)
 */
const videoMode = (process.env.VIDEO_MODE as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry' | 'on-all-retries' | 'retain-on-first-failure' | 'retain-on-failure-and-retries')
  || configJson.video?.mode
  || 'on';

/**
 * Video quality presets — map to the recorded video resolution.
 * Higher resolution = better quality (the recording can never exceed
 * the page viewport of 1366x768, so 'high' is the sharpest option).
 */
const VIDEO_QUALITY_PRESETS: Record<string, { width: number; height: number }> = {
  low: { width: 800, height: 450 },
  medium: { width: 1280, height: 720 },
  high: { width: 1366, height: 768 }, // matches the test viewport
};

/**
 * Resolve video quality:
 * - Prefer VIDEO_QUALITY env var
 * - Fall back to config.json video.quality
 * - Default to 'high'
 */
const videoQuality = process.env.VIDEO_QUALITY || configJson.video?.quality || 'high';

/**
 * Map the quality preset to an explicit video size so Playwright records
 * at full resolution instead of its default 800x450 fallback.
 */
const videoSize = (() => {
  const size = VIDEO_QUALITY_PRESETS[videoQuality];
  if (!size) {
    throw new Error(
      `Unknown video quality "${videoQuality}". Supported values: ${Object.keys(VIDEO_QUALITY_PRESETS).join(', ')}.\n` +
      '  Set it in config.json (video.quality) or via the VIDEO_QUALITY environment variable.',
    );
  }
  return size;
})();

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
    /* Base URL from .env (BASE_URL) — config.json fallback is intentionally removed */
    baseURL,

    /* Headless/headed mode — set at the test runner fixture level (not inside launchOptions) */
    headless,

    /* Collect traces — mode comes from config.json (trace block) or TRACE_MODE env var */
    trace: traceMode,

    /* Screenshot only on failure */
    screenshot: (process.env.SCREENSHOT_MODE as 'on' | 'off' | 'only-on-failure') || 'only-on-failure',

    /* Record video after every test — mode and resolution/quality come from config.json (video block) or env vars */
    video: { mode: videoMode, size: videoSize },

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
