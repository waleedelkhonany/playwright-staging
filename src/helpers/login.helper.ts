import { type BrowserContext, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import config from '../../config/config.json';

/**
 * Interface for credentials used during login.
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Storage state file path for session persistence.
 * Using this avoids re-logging in for every test in the same worker.
 */
const STORAGE_STATE_PATH = 'test-results/auth-storage-state.json';

/**
 * Default credentials from the project configuration.
 */
export function getDefaultCredentials(): LoginCredentials {
  return {
    username: config.credentials.username,
    password: config.credentials.password,
  };
}

/**
 * Perform login on the given page using the provided or default credentials.
 *
 * This is the simplest approach — call it in `beforeEach` or `beforeAll`.
 *
 * @param page - Playwright Page object
 * @param credentials - Optional credentials (defaults to config.json)
 * @returns The LoginPage instance for method chaining
 *
 * @example
 *   // In a test file:
 *   import { loginAsDefaultUser } from '../src/helpers/login.helper';
 *
 *   test.beforeEach(async ({ page }) => {
 *     await loginAsDefaultUser(page);
 *   });
 */
export async function loginAsDefaultUser(
  page: Page,
  credentials?: LoginCredentials,
): Promise<LoginPage> {
  const creds = credentials ?? getDefaultCredentials();
  const loginPage = new LoginPage(page);

  await loginPage.gotoLogin();
  await loginPage.login(creds.username, creds.password);

  // Verify login was successful
  const isLoggedIn = await loginPage.isLoginSuccessful();
  if (!isLoggedIn) {
    const errorMsg = await loginPage.getErrorMessage().catch(() => 'Unknown error');
    throw new Error(
      `Login failed for user "${creds.username}". Error: ${errorMsg}`,
    );
  }

  return loginPage;
}

/**
 * Perform login and save the storage state (cookies + localStorage) to a file.
 * Once saved, other tests can use `storageState: STORAGE_STATE_PATH` in their
 * context options to skip the login step entirely.
 *
 * @param context - BrowserContext to save state from
 * @param page - Playwright Page object
 * @param credentials - Optional credentials
 *
 * @example
 *   // Run once in global setup:
 *   await loginAndSaveState(context, page);
 *
 *   // Then in playwright.config.ts, set:
 *   use: { storageState: 'test-results/auth-storage-state.json' }
 */
export async function loginAndSaveState(
  context: BrowserContext,
  page: Page,
  credentials?: LoginCredentials,
): Promise<void> {
  await loginAsDefaultUser(page, credentials);
  await context.storageState({ path: STORAGE_STATE_PATH });
}

/**
 * Get the file path for the persisted storage state.
 */
export function getStorageStatePath(): string {
  return STORAGE_STATE_PATH;
}
