import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { EmployeeData } from '../data/employee.data';

/**
 * EmployeesPage — Page Object Model for the CareConnect KSA Employees module.
 *
 * LOCATORS ARE ALIGNED TO THE REAL STAGING DOM (verified via
 * scripts/inspect-employee-create.ts):
 *
 *   - The list page (/employees) has an "Add New" link
 *     (<a href="/employees/create" class="btn btn-soft-success">) — there is
 *     NO modal; the form is a separate page.
 *   - The create form (/employees/create) is a Livewire component. Every
 *     field is bound with a `wire:model.live` / `wire:model` attribute that
 *     is used directly as the CSS selector.
 *   - The main submit button ("Create") sits OUTSIDE the <form> and is
 *     DISABLED until the server-side computed property `isFormValidForCreation`
 *     returns true (checked on every Livewire update). Clicking it calls
 *     dispatchBeforeSave() → Livewire call('save').
 *   - On success the server dispatches the `employee-created` event; the page
 *     shows a SweetAlert "Employee Created Successfully!" and redirects to
 *     /employees/{id}/edit after ~3 seconds.
 *   - Selecting a LICENSED title (e.g. Nurse, Physician) reveals the hidden
 *     SCFHS/NPHIES license section whose fields are required server-side.
 *   - nationalId / scfhsLicenseNumber / nphiesProviderId are validated
 *     server-side for UNIQUENESS — data generators must produce fresh values.
 */
export class EmployeesPage extends BasePage {
  // =========================================================================
  // Locators
  // =========================================================================

  // Navigation
  readonly employeesSidebarLink: Locator;
  /** "Add New" link on the Employees list page → /employees/create */
  readonly addEmployeeLink: Locator;

  // Form Fields (wire:model attributes — verified against staging DOM)
  readonly nameInput: Locator;
  readonly titleSelect: Locator;
  readonly statusSelect: Locator;
  readonly genderSelect: Locator;
  readonly maritalStatusSelect: Locator;
  readonly nationalitySelect: Locator;
  readonly nationalIdInput: Locator;
  readonly expirationDateInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly religionSelect: Locator;
  readonly languageSelect: Locator;
  readonly scfhsLicenseNumberInput: Locator;
  readonly scfhsLicenseExpiryDateInput: Locator;
  readonly nphiesProviderIdInput: Locator;

  // Submit
  /** "Create" button — outside the form, disabled until all required fields set */
  readonly createButton: Locator;

  // Search & Table (list page)
  /** Live "Search by name, email, or mobile" input (exact placeholder). */
  readonly nameSearchInput: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation
    // Precise: the sidebar link is <a href="employees" class="nav-link menu-link">.
    // A broad a[href*="employee"] selector would wrongly match hidden dropdown
    // items like /employees/106/edit (from the alerts menu) that appear first.
    this.employeesSidebarLink = page.locator(
      'a.nav-link:has-text("Employees"), a[href="employees"], a[href="/employees"], .nav-item:has-text("Employees") a.nav-link',
    ).first();
    this.addEmployeeLink = page.locator(
      'a:has-text("Add New"), a[href*="employees/create"]',
    ).first();

    // Form Fields — Livewire wire:model attributes (real staging DOM)
    this.nameInput = page.locator('input[wire\\:model\\.live="name"]').first();
    this.titleSelect = page.locator('select[wire\\:model\\.live="title_id"]').first();
    this.statusSelect = page.locator('select[wire\\:model\\.live="status"]').first();
    this.genderSelect = page.locator('select[wire\\:model\\.live="gender"]').first();
    this.maritalStatusSelect = page.locator('select[wire\\:model\\.live="marital_status"]').first();
    this.nationalitySelect = page.locator('select[wire\\:model\\.live="nationality_id"]').first();
    this.nationalIdInput = page.locator('input[wire\\:model\\.live="national_id"]').first();
    this.expirationDateInput = page.locator('input[wire\\:model\\.live="expiration_date"]').first();
    this.dateOfBirthInput = page.locator('input[wire\\:model\\.live="date_of_birth"]').first();
    this.religionSelect = page.locator('select[wire\\:model\\.live="religion_id"]').first();
    this.languageSelect = page.locator('select[wire\\:model\\.live="language_id"]').first();
    // License section (visible once a licensed title is selected)
    this.scfhsLicenseNumberInput = page.locator('#scfhs_license_number').first();
    this.scfhsLicenseExpiryDateInput = page.locator('#scfhs_license_expiry_date').first();
    this.nphiesProviderIdInput = page.locator('#nphies_provider_id').first();

    // Submit — the "Create" button lives OUTSIDE the form and is disabled
    // until isFormValidForCreation is true server-side
    this.createButton = page.locator(
      'button:has-text("Create"), button[onclick="dispatchBeforeSave()"]',
    ).first();

    // Search & Table (list page). Exact placeholder is required: a generic
    // input[placeholder*="Search"] would match the hidden header "Search ..."
    // input that appears first in the DOM (verified on staging).
    this.nameSearchInput = page.locator('input[placeholder="Search by name, email, or mobile"]').first();
  }

  // =========================================================================
  // Navigation
  // =========================================================================

  /** Navigate to the Employees list page via the sidebar. */
  async navigateToEmployees(): Promise<void> {
    await this.click(this.employeesSidebarLink);
    await this.waitForPageLoad();
    await this.waitForAnimation(500);
  }

  /**
   * Open the Add Employee form — the "Add New" link navigates to
   * /employees/create (the form is its own page, not a modal).
   */
  async openAddEmployeeForm(): Promise<void> {
    await this.click(this.addEmployeeLink);
    await this.waitForPageLoad();
    await this.waitForAnimation(500);
  }

  // =========================================================================
  // Fill helpers
  // =========================================================================

  /**
   * Set a radio button value using page.evaluate (reliable for Livewire).
   * Playwright's check() does not always commit wire:model.live radios.
   */
  private async setRadioValue(name: string, value: string | undefined | null): Promise<void> {
    if (value === undefined || value === null) return;
    await this.page.evaluate(({ n, v }) => {
      const radio = document.querySelector(
        `input[wire\\:model\\.live="${n}"][value="${v}"]`,
      ) as HTMLInputElement | null;
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        radio.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, { n: name, v: value });
  }

  // =========================================================================
  // Fill Employee Form
  // =========================================================================

  /**
   * Fill the employee creation form (Main Info tab) with the given data.
   *
   * Order matters:
   *   1. Title is selected FIRST because licensed titles (Nurse, Physician,
   *      ...) reveal the hidden SCFHS/NPHIES license section.
   *   2. The license fields are only filled when the section is visible
   *      (i.e. when the scenario provides license data and the title is
   *      licensed) — they are REQUIRED server-side for licensed titles.
   *
   * Select fields are matched by option LABEL; the id_type radio is set via
   * evaluate; date inputs are plain text inputs (flatpickr) — fill + blur
   * commits the Livewire update.
   */
  async fillEmployeeForm(employee: EmployeeData): Promise<void> {
    // --- Basic fields ---
    if (employee.name) await this.fill(this.nameInput, employee.name);
    if (employee.title) await this.selectByLabel(this.titleSelect, employee.title);
    if (employee.status) await this.selectByLabel(this.statusSelect, employee.status);
    if (employee.gender) await this.selectByLabel(this.genderSelect, employee.gender);
    if (employee.maritalStatus) await this.selectByLabel(this.maritalStatusSelect, employee.maritalStatus);
    if (employee.nationality) await this.selectByLabel(this.nationalitySelect, employee.nationality);

    // --- ID & dates ---
    await this.setRadioValue('id_type', employee.idType);
    if (employee.nationalId) await this.fill(this.nationalIdInput, employee.nationalId);
    if (employee.expirationDate) await this.fill(this.expirationDateInput, employee.expirationDate);
    if (employee.dateOfBirth) await this.fill(this.dateOfBirthInput, employee.dateOfBirth);
    if (employee.religion) await this.selectByLabel(this.religionSelect, employee.religion);
    if (employee.language) await this.selectByLabel(this.languageSelect, employee.language);

    // --- License section (revealed for licensed titles) ---
    if (employee.scfhsLicenseNumber || employee.scfhsLicenseExpiryDate || employee.nphiesProviderId) {
      // The section only exists when the selected title is a licensed role
      // (Nurse, Physician, ...). If it never appears (e.g. a non-licensed
      // title with license data in the scenario), skip instead of failing —
      // the server-side isFormValidForCreation check still gates the Create
      // button, so a genuinely required-but-missing field surfaces there.
      try {
        await this.waitForElementVisible(this.scfhsLicenseNumberInput, 10_000);
      } catch {
        console.warn('[Employees] License section not shown — skipping license fields');
        return;
      }
      if (employee.scfhsLicenseNumber) await this.fill(this.scfhsLicenseNumberInput, employee.scfhsLicenseNumber);
      if (employee.scfhsLicenseExpiryDate) {
        await this.fill(this.scfhsLicenseExpiryDateInput, employee.scfhsLicenseExpiryDate);
      }
      if (employee.nphiesProviderId) await this.fill(this.nphiesProviderIdInput, employee.nphiesProviderId);
    }
  }

  /**
   * Wait for the "Create" button to become enabled.
   *
   * The button is disabled until the server-side computed property
   * `isFormValidForCreation` returns true; it is re-evaluated on every
   * Livewire update as fields are filled.
   */
  async waitForCreateEnabled(timeoutMs: number = 30_000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => (b.textContent || '').trim().replace(/\s+/g, ' ') === 'Create',
        );
        return btn ? !btn.hasAttribute('disabled') : false;
      },
      { timeout: timeoutMs },
    );
  }

  /**
   * Save the employee form: wait for "Create" to enable, click it, then wait
   * for the success redirect to /employees/{id}/edit.
   *
   * @returns The edit-page URL (e.g. /employees/155/edit), or null if the
   *          redirect did not happen within the timeout.
   */
  async saveEmployee(): Promise<string | null> {
    await this.waitForCreateEnabled();
    await this.click(this.createButton);

    // The server dispatches `employee-created` → SweetAlert (~3s) → redirect
    // to /employees/{id}/edit. The Livewire morph can be large; give it time.
    try {
      await this.page.waitForURL(/\/employees\/\d+\/edit/, { timeout: 30_000 });
      await this.waitForPageLoad().catch(() => {});
      await this.waitForAnimation(1000);
      return this.page.url();
    } catch {
      // Diagnostics for a failed save: capture the page state so a CI failure
      // is debuggable (mirrors the savePatient() validation-error pattern).
      console.warn('[Employees] Save did not redirect to /employees/{id}/edit');
      await this.page.screenshot({
        path: `test-results/artifacts/employee-save-failed-${Date.now()}.png`,
        fullPage: true,
      }).catch(() => {});
      return null;
    }
  }

  /**
   * Complete end-to-end flow: open the form, fill it, and save.
   * Assumes the user is already on the Employees list page (call
   * navigateToEmployees() first).
   *
   * @returns The edit-page URL on success, or null on failure.
   */
  async addEmployee(employee: EmployeeData): Promise<string | null> {
    await this.openAddEmployeeForm();
    await this.fillEmployeeForm(employee);
    return this.saveEmployee();
  }

  /**
   * Read the employee Name field's current value (works on both the create
   * page and the edit page — used to verify the saved employee).
   */
  async getEmployeeNameValue(): Promise<string> {
    return this.nameInput.inputValue();
  }

  // =========================================================================
  // Search & List (Employees list page)
  // =========================================================================

  /**
   * Search for an employee via the list page's live "name, email, or mobile"
   * search input (Livewire live search — typing updates the URL query string
   * to ?search=<query> and re-renders the table via AJAX).
   *
   * Waits for the URL query string to update (proves the Livewire request was
   * committed) before settling, so callers can immediately assert on rows.
   */
  async searchEmployee(query: string): Promise<void> {
    await this.fill(this.nameSearchInput, query);
    await this.nameSearchInput.blur();
    // Livewire live search commits to ?search=<query> — wait for it so the
    // caller's row assertion verifies the SEARCHED results, not the full list.
    await this.page.waitForURL(
      (url) => url.searchParams.has('search'),
      { timeout: 10_000 },
    );
    await this.waitForAnimation(1200); // settle wait for the AJAX re-render
  }

  /**
   * Locator for a result row on the list page containing the given text.
   * The empty-state row ("No Data Available") is naturally excluded because
   * it never contains employee data.
   */
  employeeRowContaining(text: string): Locator {
    return this.page.locator('table tbody tr').filter({ hasText: text }).first();
  }
}
