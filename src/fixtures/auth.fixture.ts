import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { PatientsPage } from '../pages/patients.page';
import { EmployeesPage } from '../pages/employees.page';
import { HeaderPage } from '../pages/header.page';
import { loginAsDefaultUser } from '../helpers/login.helper';
import { ensureHeaderContext } from '../helpers/header-context.helper';
import config from '../../config/config.json';

/**
 * Extended test fixture that provides:
 * - Auto-login before each test
 * - Pre-instantiated page objects for common pages
 * - Automatic header context (Branch + Location) synchronisation after login
 *
 * Usage:
 *   import { test } from '../src/fixtures/auth.fixture';
 *
 *   test('add a patient', async ({ patientsPage }) => {
 *     await patientsPage.navigateToPatients();
 *     // ... your test steps
 *   });
 *
 *   test('verify header', async ({ headerPage }) => {
 *     const branch = await headerPage.getSelectedBranch();
 *     expect(branch).toBe(config.headerContext.targetBranch);
 *   });
 */
export interface AuthFixture {
  /** Pre-authenticated LoginPage instance */
  loginPage: LoginPage;
  /** Pre-authenticated PatientsPage instance */
  patientsPage: PatientsPage;
  /** Pre-authenticated EmployeesPage instance */
  employeesPage: EmployeesPage;
  /** Header page for top navigation context verification */
  headerPage: HeaderPage;
}

/**
 * Auto-login fixture that runs automatically before every test.
 * Uses `{ auto: true }` so tests don't need to request it explicitly.
 *
 * After login, it integrates the ensureHeaderContext() helper to:
 *   1. Read the target branch/location from config.json
 *   2. Check the current values in the header
 *   3. Automatically switch any that don't match
 */
const autoLogin = base.extend<{ autoLogin: void }>({
  autoLogin: [
    async ({ page }, use) => {
      // 1. Login with default credentials
      await loginAsDefaultUser(page);

    // 2. Ensure the header context matches config.json targets.
    //    After login, the page is on the scheduler which has the header
    //    (with Branch/Location selects). Wait for any <select> to appear
    //    in the DOM to confirm Livewire hydration is complete, then check
    //    and switch the branch/location to match config.json.
    //    Skip if headerContext section is not defined in config.json.
    if (config.headerContext?.targetBranch && config.headerContext?.targetLocation) {
      await page.locator('select').first().waitFor({
        state: 'attached',
        timeout: 15000,
      });
      await ensureHeaderContext(page);
    }

      await use();
    },
    { auto: true },
  ],
});

/**
 * Extend the base Playwright test with auto-login and page objects.
 *
 * The `autoLogin` fixture runs automatically before every test, ensuring the
 * user is logged in before any test uses a page object. Tests can request
 * any page object directly without needing to manually log in.
 */
export const test = autoLogin.extend<AuthFixture>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  patientsPage: async ({ page }, use) => {
    const patientsPage = new PatientsPage(page);
    await use(patientsPage);
  },

  employeesPage: async ({ page }, use) => {
    const employeesPage = new EmployeesPage(page);
    await use(employeesPage);
  },

  headerPage: async ({ page }, use) => {
    const headerPage = new HeaderPage(page);
    await use(headerPage);
  },
});

/**
 * Re-export `expect` so tests only need to import from this file.
 */
export { expect } from '@playwright/test';
export type { Page, BrowserContext } from '@playwright/test';
