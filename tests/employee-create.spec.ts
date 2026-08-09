/**
 * =============================================================================
 * Employee Management — E2E Tests (Create)
 * =============================================================================
 *
 * Tests employee creation on CareConnect KSA (staging):
 *   - Creating an employee with dynamically generated data on the
 *     /employees/create form (Main Info tab), including the SCFHS/NPHIES
 *     license section that is required for licensed titles.
 *   - Verifying success via the redirect to /employees/{id}/edit.
 *
 * Real staging form (verified via scripts/inspect-employee-create.ts):
 *   - The "Add New" link on /employees navigates to /employees/create — the
 *     form is its own Livewire page (no modal).
 *   - Required fields: Name, Title, Branches*, Systems*, Gender, Nationality,
 *     ID Type (radio), National ID/Passport/Iqama, ID Expiration date,
 *     Religion — plus SCFHS License Number / Expiry Date and NPHIES Provider
 *     ID once a LICENSED title (e.g. Nurse) reveals the license section.
 *     (*Branches/Systems are pre-selected and locked to the current context.)
 *   - The "Create" button lives OUTSIDE the form and stays disabled until the
 *     server-side `isFormValidForCreation` check passes; it then dispatches
 *     `employee-created` → SweetAlert "Employee Created Successfully!" →
 *     redirect to /employees/{id}/edit (~3s).
 *   - nationalId / scfhsLicenseNumber / nphiesProviderId are validated for
 *     UNIQUENESS server-side — the data loader always generates fresh values.
 *
 * Header Context Verification:
 *   The auth fixture (src/fixtures/auth.fixture.ts) automatically ensures the
 *   Branch and Location match config.json headerContext targets after login.
 *   No additional beforeEach is needed.
 *
 * Test Flow:
 *   1. Auto-login (via auth fixture) + auto header context sync
 *   2. Navigate to Employees section
 *   3. Click "Add New" → /employees/create
 *   4. Fill all required fields with dynamically generated data
 *   5. Wait for the "Create" button to enable (server-side validation)
 *   6. Click Create → wait for the success redirect to /employees/{id}/edit
 *   7. Assert the created employee's name is pre-filled on the edit page
 *   8. Search the Employees list page by name → assert the employee appears
 *
 * @see config/employee-scenarios/full-employee.scenario.json — test data
 * @see src/helpers/employee-data.loader.ts — DYNAMIC field resolution
 * @see src/pages/employees.page.ts — EmployeesPage POM
 * @see src/fixtures/auth.fixture.ts — auto-login before every test
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { getEmployeeData } from '../src/helpers/employee-data.loader';
import type { EmployeesPage } from '../src/pages/employees.page';

// =============================================================================
// Shared verification helpers
// =============================================================================

/**
 * After creating an employee, go back to the Employees list page and verify
 * the employee appears in the results when searching by name.
 *
 * The list page's "Search by name, email, or mobile" input is a Livewire live
 * search: typing + blur commits to ?search=<name> in the URL and re-renders
 * the table via AJAX (searchEmployee() waits for the URL update).
 */
async function verifyEmployeeVisibleInList(
  employeesPage: EmployeesPage,
  employeeName: string,
): Promise<void> {
  // Back to the Employees list page (fresh load — resets any filter state)
  await employeesPage.goto('/employees');

  // Search by name — searchEmployee() waits for ?search= to appear in the URL,
  // so the assertion below verifies the SEARCHED results (narrowed), not the
  // full paginated list.
  await employeesPage.searchEmployee(employeeName);

  // Web-first assertion: a result row containing the employee name is visible.
  // The empty-state row ("No Data Available") never contains employee data, so
  // it cannot satisfy this filter.
  await expect(employeesPage.employeeRowContaining(employeeName)).toBeVisible({ timeout: 10_000 });
  console.log(`✅ Employee "${employeeName}" found in the Employees list search`);
}

// =============================================================================
// Employees Module — E2E Browser Tests
// =============================================================================

test.describe('Employees Module', () => {
  test.describe('Employee CRUD', () => {

    // =========================================================================
    // Happy Path: Create Employee with Full Dynamic Data
    // =========================================================================

    test('should create a new employee with all required dynamic data', async ({ employeesPage }) => {
      // -----------------------------------------------------------------------
      // 1. Generate complete employee data from the scenario JSON file.
      //    - 'DYNAMIC' fields (name, nationalId, scfhsLicenseNumber,
      //      nphiesProviderId) produce fresh values each run — the server
      //      enforces UNIQUENESS on the ID fields, so stale values would fail.
      //    - Title is fixed to 'Nurse' (a licensed title) which reveals the
      //      SCFHS/NPHIES license section on the form.
      //    - Branches (Main Branch) and Systems (In Center) are pre-selected
      //      and locked on staging — left untouched.
      // -----------------------------------------------------------------------
      const employee = getEmployeeData('full-employee.scenario.json');

      console.log('═══════════════════════════════════════════════');
      console.log('  EMPLOYEE TEST DATA');
      console.log(`  Name:               ${employee.name}`);
      console.log(`  Title:              ${employee.title}`);
      console.log(`  Status:             ${employee.status}`);
      console.log(`  Gender:             ${employee.gender}`);
      console.log(`  Marital status:     ${employee.maritalStatus}`);
      console.log(`  Nationality:        ${employee.nationality}`);
      console.log(`  ID type:            ${employee.idType}`);
      console.log(`  National ID:        ${employee.nationalId}`);
      console.log(`  Expiration date:    ${employee.expirationDate}`);
      console.log(`  DOB:                ${employee.dateOfBirth}`);
      console.log(`  Religion:           ${employee.religion}`);
      console.log(`  Language:           ${employee.language}`);
      console.log(`  SCFHS license #:    ${employee.scfhsLicenseNumber}`);
      console.log(`  SCFHS expiry:       ${employee.scfhsLicenseExpiryDate}`);
      console.log(`  NPHIES provider ID: ${employee.nphiesProviderId}`);
      console.log('═══════════════════════════════════════════════');

      // -----------------------------------------------------------------------
      // 2. Execute the full add-employee workflow
      // -----------------------------------------------------------------------
      await employeesPage.navigateToEmployees();
      const editUrl = await employeesPage.addEmployee(employee);

      // -----------------------------------------------------------------------
      // 3. Assert — success is signalled by the redirect to /employees/{id}/edit
      // -----------------------------------------------------------------------
      expect(editUrl, 'Employee creation should redirect to the edit page').toBeTruthy();
      expect(editUrl).toMatch(/\/employees\/\d+\/edit$/);
      console.log(`\n✅ Employee created — redirected to ${editUrl}`);

      // -----------------------------------------------------------------------
      // 4. Assert — the edit page is pre-filled with the created employee name
      // -----------------------------------------------------------------------
      const savedName = await employeesPage.getEmployeeNameValue();
      expect(savedName).toBe(employee.name);
      console.log(`✅ Edit page shows employee name: "${savedName}"`);

      // -----------------------------------------------------------------------
      // 5. Assert — the created employee is searchable on the Employees list
      // -----------------------------------------------------------------------
      await verifyEmployeeVisibleInList(employeesPage, employee.name!);
    });

    // =========================================================================
    // Minimal Required Fields Only (non-licensed title)
    // =========================================================================

    test('should create an employee with minimal required fields and a non-licensed title', async ({ employeesPage }) => {
      // -----------------------------------------------------------------------
      // 1. Generate minimal employee data from the scenario JSON file.
      //    - Title is 'Driver' — a NON-licensed title, so the SCFHS/NPHIES
      //      license section stays hidden on the form and only the base
      //      required fields are needed (Name, Title, Gender, Nationality,
      //      ID Type, National ID, ID Expiration date, Religion).
      //    - nationalId is DYNAMIC — the server enforces uniqueness.
      // -----------------------------------------------------------------------
      const employee = getEmployeeData('minimal-employee.scenario.json');

      console.log('═══════════════════════════════════════════════');
      console.log('  MINIMAL EMPLOYEE TEST DATA');
      console.log(`  Name:            ${employee.name}`);
      console.log(`  Title:           ${employee.title}`);
      console.log(`  Gender:          ${employee.gender}`);
      console.log(`  Nationality:     ${employee.nationality}`);
      console.log(`  ID type:         ${employee.idType}`);
      console.log(`  National ID:     ${employee.nationalId}`);
      console.log(`  Expiration date: ${employee.expirationDate}`);
      console.log(`  Religion:        ${employee.religion}`);
      console.log('═══════════════════════════════════════════════');

      // -----------------------------------------------------------------------
      // 2. Execute the full add-employee workflow (license fields are absent
      //    from the scenario — fillEmployeeForm skips them gracefully)
      // -----------------------------------------------------------------------
      await employeesPage.navigateToEmployees();
      const editUrl = await employeesPage.addEmployee(employee);

      // -----------------------------------------------------------------------
      // 3. Assert — success is signalled by the redirect to /employees/{id}/edit
      // -----------------------------------------------------------------------
      expect(editUrl, 'Employee creation should redirect to the edit page').toBeTruthy();
      expect(editUrl).toMatch(/\/employees\/\d+\/edit$/);
      console.log(`\n✅ Employee created (minimal) — redirected to ${editUrl}`);

      // -----------------------------------------------------------------------
      // 4. Assert — the edit page is pre-filled with the created employee name
      // -----------------------------------------------------------------------
      const savedName = await employeesPage.getEmployeeNameValue();
      expect(savedName).toBe(employee.name);
      console.log(`✅ Edit page shows employee name: "${savedName}"`);

      // -----------------------------------------------------------------------
      // 5. Assert — the created employee is searchable on the Employees list
      // -----------------------------------------------------------------------
      await verifyEmployeeVisibleInList(employeesPage, employee.name!);
    });
  });
});
