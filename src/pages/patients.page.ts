import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { PatientData } from '../data/patient.data';
import type { AppointmentData } from '../data/appointment.data';

/**
 * PatientsPage — Page Object Model for the CareConnect KSA Patient module.
 *
 * Hybrid approach:
 * - Text/date inputs: Playwright placeholder locators (reliable)
 * - Select dropdowns: JavaScript evaluate (avoids Playwright locator
 *   issues with 38+ selects, flatpickr, Select2, and whitespace)
 * - Radio buttons: JavaScript evaluate
 */
export class PatientsPage extends BasePage {
  // Navigation
  readonly patientsSidebarLink: Locator;
  readonly addPatientButton: Locator;
  readonly saveButton: Locator;

  // Text Inputs (by placeholder / name)
  readonly firstNameArInput: Locator;
  readonly middleNameArInput: Locator;
  readonly familyNameArInput: Locator;
  readonly givenNameEnInput: Locator;
  readonly middleNameEnInput: Locator;
  readonly familyNameEnInput: Locator;
  readonly oldMrnInput: Locator;
  readonly farabiFileNoInput: Locator;
  readonly mobileInput: Locator;
  readonly secondaryMobileInput: Locator;
  readonly emailInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly emergencyContactPersonInput: Locator;
  readonly emergencyContactNoInput: Locator;
  readonly nationalIdInput: Locator;
  readonly idExpirationDateInput: Locator;
  readonly dateOfMedicalAcceptanceInput: Locator;
  readonly dateOfHomeSettingsAcceptanceInput: Locator;
  readonly dateOfReferralInput: Locator;

  // Appointment
  readonly createAppointmentButton: Locator;
  readonly appointmentDateInput: Locator;
  readonly appointmentTimeInput: Locator;
  readonly appointmentEndTimeInput: Locator;
  readonly appointmentNotesInput: Locator;
  readonly appointmentSaveButton: Locator;
  /** Scrollable container of the appointment modal/drawer */
  readonly appointmentModalContainer: Locator;

  // For text-based patient selection in search results
  readonly patientTableRowsFiltered: (text: string) => Locator;

  // Patient Filter Form
  readonly patientIdInput: Locator;
  readonly filterButton: Locator;

  // Search & Results
  readonly searchInput: Locator;
  readonly patientTable: Locator;
  readonly patientTableRows: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation — precise locators
    this.patientsSidebarLink = page.locator(
      'a:has-text("Patients"), a:has-text("patients"), a[href*="patient"], .nav-item:has-text("Patients")',
    ).first();
    this.addPatientButton = page.locator(
      'button:has-text("Create Patient"), a:has-text("Create Patient"), button:has-text("Add New"), a:has-text("Add New"), button:has-text("Add Patient")',
    ).first();
    this.saveButton = page.locator('button[name="save"]').first()
      .or(page.getByRole('button', { name: /Save/i }).first());

    // Arabic name inputs
    this.firstNameArInput = page.getByPlaceholder('أدخل الاسم الاول');
    this.middleNameArInput = page.getByPlaceholder('أدخل الاسم الاوسط');
    this.familyNameArInput = page.getByPlaceholder('أدخل اسم العائلة');

    // English name inputs
    this.givenNameEnInput = page.getByPlaceholder('Enter First Name');
    this.middleNameEnInput = page.getByPlaceholder('Enter Middle Name');
    this.familyNameEnInput = page.getByPlaceholder('Enter Family Name');

    // Contact & Identity inputs
    this.oldMrnInput = page.getByPlaceholder('Enter Old MRN');
    this.farabiFileNoInput = page.getByPlaceholder('Enter FileNo');
    this.mobileInput = page.getByPlaceholder('Enter Mobile');
    this.secondaryMobileInput = page.getByPlaceholder('Enter Secondary Mobile');
    this.emailInput = page.getByPlaceholder('Enter Email');
    this.dateOfBirthInput = page.getByPlaceholder('Enter Date of birth');
    this.emergencyContactNoInput = page.getByPlaceholder('Enter Contact No');
    this.nationalIdInput = page.getByPlaceholder(/National ID/i)
      .or(page.locator('input[name="national_id"]').first());
    this.idExpirationDateInput = page.getByPlaceholder(/Expiration/i)
      .or(page.locator('input[name="id_expiration_date"]').first());

    // Date inputs (by name attribute)
    this.dateOfMedicalAcceptanceInput = page.locator('input[name="medical_acceptance_at"]').first();
    this.dateOfHomeSettingsAcceptanceInput = page.locator('input[name="home_settings_acceptance_at"]').first();
    this.dateOfReferralInput = page.locator('input[name="referral_at"]').first();
    // Emergency Contact Person (precedes Contact No input)
    this.emergencyContactPersonInput = page.getByPlaceholder('Enter Contact No')
      .locator('xpath=preceding::input[1]');

    // Appointment
    this.createAppointmentButton = page.locator(
      'button:has-text("Create Appointment"), a:has-text("Create Appointment"), button:has-text("New Appointment"), [class*="create-appointment"]',
    ).first();
    this.appointmentDateInput = page.locator(
      'input[name="date"][type="text"], input[name="appointment_date"]',
    ).first();
    this.appointmentTimeInput = page.locator(
      'input[name="start_time"][type="time"], input[type="time"]',
    ).first();
    this.appointmentEndTimeInput = page.locator(
      'input[name="end_time"][type="time"]',
    ).first();
    this.appointmentNotesInput = page.locator(
      'textarea[name="instructions"]',
    ).first();
    // The appointment form opens in a right-hand offcanvas/side-drawer panel.
    // The "Add" button is at the bottom of the drawer content. We use `.last()`
    // to target the drawer panel and its Add button since they're appended last
    // in the DOM and may exist alongside other similar elements on the page.
    this.appointmentSaveButton = page.locator(
      'button:has-text("Add"), button.btn-primary:has-text("Add")',
    ).last();

    // Scrollable container of the right-hand offcanvas/side-drawer panel.
    // This drawer has its own internal overflow container (`overflow-y: auto`).
    // We must scroll this container to bring the "Add" button into view.
    // Using `.last()` ensures we target the rightmost drawer panel in the DOM.
    this.appointmentModalContainer = page.locator(
      'div[class*="drawer"], div[class*="offcanvas"], div[class*="modal-body"]',
    ).last();

    // Patient Filter Form — visible fields on the Patients list page
    this.patientIdInput = page.locator('input[name="id"]').first();
    this.filterButton = page.locator(
      'input[type="submit"][value="Filter"], input[name="search"][value="Filter"]',
    ).first();

    // Text-based filter helper — finds a table row containing the given text
    this.patientTableRowsFiltered = (text: string) =>
      page.locator('table tbody tr').filter({ hasText: text }).first();

    // Search & Table
    this.searchInput = page.locator(
      'input[type="search"], input[name="search"], input[placeholder*="Search"]',
    ).first();
    this.patientTable = page.locator('table').first();
    this.patientTableRows = page.locator('table tbody tr, table tr[data-patient-id]');
    this.successToast = page.locator(
      '.alert-success, .toast-success, .success-message, [class*="success"]',
    ).first();
  }

  // =========================================================================
  // Navigation
  // =========================================================================

  async navigateToPatients(): Promise<void> {
    // The sidebar is a Livewire component that can re-render right after login;
    // a click landing during that re-render is swallowed (no navigation occurs).
    // Confirm the URL actually moved to /patients and retry if it didn't.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.waitForAnimation(300);
      await this.click(this.patientsSidebarLink);
      try {
        await this.page.waitForURL(/\/patients/, { timeout: 10_000 });
        break;
      } catch {
        if (/\/patients/.test(this.page.url())) break;
        console.warn(`[Patients] Sidebar click did not navigate (attempt ${attempt}/3) — retrying`);
      }
    }

    await this.waitForPageLoad();
    await this.waitForAnimation(500);
  }

  async openAddPatientForm(): Promise<void> {
    await this.click(this.addPatientButton);
    await this.waitForAnimation(1000);
  }

  // =========================================================================
  // Fill Helpers
  // =========================================================================

  private async fillIfDefined(locator: Locator, value: string | undefined | null): Promise<void> {
    if (value !== undefined && value !== null) {
      await this.fill(locator, value);
    }
  }

  /**
   * Set a select element's value using page.evaluate().
   * The select is identified by its index among all <select> elements.
   * @param tag - CSS selector for selects (e.g. 'select')
   * @param index - DOM index among matched elements (0-based)
   * @param optionText - Option text to select (e.g. "Islam", "Full Code", or value like "1")
   */
  private async setSelectByOptionText(tag: string, index: number, optionText: string | undefined | null): Promise<void> {
    if (optionText === undefined || optionText === null) return;
    const result = await this.page.evaluate(({ sel, idx, text }) => {
      const allSelects = document.querySelectorAll(sel);
      const select = allSelects[idx] as HTMLSelectElement;
      if (!select) return `Select #${idx} not found`;
      const options = Array.from(select.options);
      // Try exact match first, then value match, then partial text match
      let match = options.find(o => o.textContent?.trim() === text);
      if (!match) match = options.find(o => o.value === text);
      if (!match) match = options.find(o => o.textContent?.trim().toLowerCase().includes(text.toLowerCase()));
      if (!match) return `Option not found: "${text}" in select #${idx}`;
      select.value = match.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      return null; // success
    }, { sel: tag, idx: index, text: optionText });
    if (result) console.warn(result);
  }

  /**
   * Set a radio button value using page.evaluate().
   */
  private async setRadioValue(name: string, value: string | undefined | null): Promise<void> {
    if (value === undefined || value === null) return;
    await this.page.evaluate(({ n, v }) => {
      const radio = document.querySelector(`input[name="${n}"][value="${v}"]`) as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { n: name, v: value });
  }

  // =========================================================================
  // Fill Patient Form
  // =========================================================================

  async fillPatientForm(patient: PatientData): Promise<void> {
    // --- Text Inputs (Playwright locators) ---
    await this.fillIfDefined(this.firstNameArInput, patient.firstNameAr);
    await this.fillIfDefined(this.middleNameArInput, patient.middleNameAr);
    await this.fillIfDefined(this.familyNameArInput, patient.familyNameAr);
    await this.fillIfDefined(this.givenNameEnInput, patient.givenNameEn);
    await this.fillIfDefined(this.middleNameEnInput, patient.middleNameEn);
    await this.fillIfDefined(this.familyNameEnInput, patient.familyNameEn);
    await this.fillIfDefined(this.oldMrnInput, patient.oldMrn);
    await this.fillIfDefined(this.farabiFileNoInput, patient.farabiFileNo);
    await this.fillIfDefined(this.mobileInput, patient.mobile);
    await this.fillIfDefined(this.secondaryMobileInput, patient.secondaryMobile);
    await this.fillIfDefined(this.emailInput, patient.email);
    await this.fillIfDefined(this.dateOfBirthInput, patient.dateOfBirth);
    await this.fillIfDefined(this.dateOfMedicalAcceptanceInput, patient.dateOfMedicalAcceptance);
    await this.fillIfDefined(this.dateOfHomeSettingsAcceptanceInput, patient.dateOfHomeSettingsAcceptance);
    await this.fillIfDefined(this.dateOfReferralInput, patient.dateOfReferral);
    await this.fillIfDefined(this.emergencyContactPersonInput, patient.emergencyContactPerson);
    await this.fillIfDefined(this.emergencyContactNoInput, patient.emergencyContactNo);
    await this.fillIfDefined(this.nationalIdInput, patient.nationalId);
    await this.fillIfDefined(this.idExpirationDateInput, patient.idExpirationDate);

    // --- Selects via JavaScript evaluate for reliability ---
    // Each select is identified by unique option text we confirmed in diagnostics
    await this.setSelectByOptionText('select', 5, patient.codeStatus);       // Code Status
    await this.setSelectByOptionText('select', 6, patient.isolationType);    // Isolation Type
    await this.setSelectByOptionText('select', 7, patient.referredHospital);  // Referred Hospital (named)
    await this.setSelectByOptionText('select', 9, patient.gender);          // Gender
    await this.setSelectByOptionText('select', 10, patient.maritalStatus);   // Marital Status
    await this.setSelectByOptionText('select', 11, patient.occupation);     // Occupation
    await this.setSelectByOptionText('select', 12, patient.nationality);    // Nationality
    await this.setSelectByOptionText('select', 13, patient.isEmployee);     // Is Employee
    await this.setSelectByOptionText('select', 14, patient.isVisitor);      // Is Visitor
    await this.setSelectByOptionText('select', 15, patient.patientSystem);  // Patient System
    // Ensure Patient System matches the header Location — the server rejects
    // mismatches (e.g., "Home" Patient System with "In Center" header Location).
    // This override handles any data the caller passes, making the form fill
    // robust regardless of the patient data provided.
    await this.syncPatientSystemWithHeaderLocation();
    await this.setSelectByOptionText('select', 17, patient.religion);       // Religion
    await this.setSelectByOptionText('select', 18, patient.preferredLanguage); // Language

    // --- Radio (Government ID Type) ---
    await this.setRadioValue('id_type', patient.governmentIdType);
  }

  /**
   * Read the current header Location select and set the Patient System select
   * to match. The server enforces that Patient System (#15) must align with
   * the header Location (#1):
   *   - "In Center"       → Patient System "Center"
   *   - "Home Hemodialysis" → Patient System "Home"
   *
   * This method reads select #1's selected option text and maps it to the
   * corresponding Patient System value for select #15, then sets it.
   * Call this AFTER setting patientSystem to ensure alignment regardless of
   * what data was passed in.
   */
  private async syncPatientSystemWithHeaderLocation(): Promise<void> {
    const mappedSystem = await this.page.evaluate(() => {
      const allSelects = document.querySelectorAll('select');
      const headerLocation = allSelects[1] as HTMLSelectElement | null;
      if (!headerLocation) return null;

      const selectedText = headerLocation.options[headerLocation.selectedIndex]?.textContent?.trim() || '';

      // Map header Location text to Patient System text
      if (selectedText.includes('In Center')) return 'Center';
      if (selectedText.includes('Home Hemodialysis')) return 'Home';
      return null; // Unknown location — don't override
    });

    if (mappedSystem) {
      console.log(`[PatientSystem] Header Location → "${mappedSystem}" (auto-synced)`);
      await this.setSelectByOptionText('select', 15, mappedSystem);
    }
  }

  /**
   * Discover the `name` attribute of a staff Select2 <select> element by
   * scanning all <select> elements and matching against known patterns.
   *
   * Uses name-based lookup instead of fragile DOM indices because the page
   * can re-render between interactions (e.g., flatpickr adding selects).
   *
   * @param patterns - Array of substrings to match against select names
   * @returns The matching select name, or null if not found
   */
  private async discoverStaffSelectName(
    patterns: string[],
    excludePatterns: string[] = [],
  ): Promise<string | null> {
    const name = await this.page.evaluate(({ pats, exclude }) => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const sel of selects) {
        const n = sel.getAttribute('name') || '';
        const matches = pats.some(p => n.includes(p));
        const excluded = exclude.some(p => n.includes(p));
        if (matches && !excluded) return n;
      }
      return null;
    }, { pats: patterns, exclude: excludePatterns });
    if (!name) {
      console.warn(`Staff select not found: patterns=[${patterns.join(', ')}] exclude=[${excludePatterns.join(', ')}]`);
    }
    return name;
  }

  /**
   * Select a value from a Select2-enhanced dropdown.
   *
   * Workflow (matches user's specification):
   *   1. Programmatic: Check if the hidden <select> has pre-populated <option>
   *      elements. If found, set value directly & dispatch change events.
   *   2. Click the dropdown container to open it.
   *   3. Type the search text using the native HTMLInputElement value setter
   *      + proper Event dispatch (covers React & vanilla Select2).
   *   4. Wait for AJAX results to populate the dropdown.
   *   5. Click the first valid result option.
   *
   * Each evaluate is SYNCHRONOUS to avoid "execution context was destroyed".
   * All async waiting uses Playwright's waitFor (handles navigation gracefully).
   *
   * @param selectName - The `name` attribute of the hidden <select> element
   *                     (found via discoverStaffSelectName or known upfront)
   * @param searchText - The employee name to search for (from config.json)
   */
  async selectFromSelect2(selectName: string, searchText: string): Promise<void> {
    // -----------------------------------------------------------------------
    // 1. Try programmatic — check if options are pre-populated
    // -----------------------------------------------------------------------
    const progResult = await this.page.evaluate(({ name, text }) => {
      const select = document.querySelector(`select[name="${name}"]`) as HTMLSelectElement | null;
      if (!select) return 'Select not found';
      const options = Array.from(select.options);
      if (options.length === 0) return 'No options in select';

      let match = options.find(o => o.textContent?.trim() === text);
      if (!match) match = options.find(o =>
        o.textContent?.trim().toLowerCase().includes(text.toLowerCase()),
      );
      if (!match) return `No option matching "${text}"`;

      select.value = match.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      return null; // success
    }, { name: selectName, text: searchText });

    if (!progResult) {
      await this.waitForAnimation(300);
      return;
    }

    console.warn(`Select2 [${selectName}]: ${progResult} — using UI interaction`);

    // -----------------------------------------------------------------------
    // 2. Open the dropdown by clicking the Select2 rendered element
    // -----------------------------------------------------------------------
    const opened = await this.page.evaluate((name: string) => {
      const select = document.querySelector(`select[name="${name}"]`) as HTMLSelectElement | null;
      if (!select?.parentElement) return false;
      const p = select.parentElement;

      const rendered = p.querySelector('.select2-selection__rendered') as HTMLElement | null;
      if (rendered) { rendered.click(); return true; }

      const container = p.querySelector('.select2-container') as HTMLElement | null;
      if (container) {
        (container.querySelector('.select2-selection__rendered') as HTMLElement | null)?.click();
        return true;
      }
      return false;
    }, selectName).catch(() => false);

    if (!opened) { console.warn(`Select2 [${selectName}]: Could not open`); return; }
    await this.waitForAnimation(800);

    const openContainer = this.page.locator('.select2-container--open');
    const searchInput = openContainer.locator('.select2-search__field').first();

    if (!await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // No search field — click matching option text directly
      const opts = openContainer.locator('.select2-results__option');
      try {
        await opts.first().waitFor({ state: 'visible', timeout: 5000 });
        const count = await opts.count();
        const textLower = searchText.toLowerCase();
        for (let i = 0; i < count; i++) {
          const cls = (await opts.nth(i).getAttribute('class').catch(() => '')) || '';
          if (cls.includes('disabled') || cls.includes('loading')) continue;
          const txt = (await opts.nth(i).textContent())?.trim() || '';
          if (txt.toLowerCase().includes(textLower)) {
            await opts.nth(i).click();
            await this.waitForAnimation(300);
            return;
          }
        }
        console.warn(`Select2 [${selectName}]: Options visible but none matched "${searchText}"`);
      } catch { /* no options */ }
      await this.page.keyboard.press('Escape');
      return;
    }

    // -----------------------------------------------------------------------
    // 3. Type search text (native value setter) — synchronous evaluate
    // -----------------------------------------------------------------------
    await this.page.evaluate(({ text }) => {
      const field = document.querySelector('.select2-container--open .select2-search__field') as HTMLInputElement | null;
      if (!field) return;

      field.focus();

      // Native input value setter (React compatibility)
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value',
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(field, text);
      } else {
        field.value = text;
      }

      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('keyup', { bubbles: true }));
    }, { text: searchText });

    // -----------------------------------------------------------------------
    // 4. Wait for AJAX results and select the first valid option
    // -----------------------------------------------------------------------
    const opts = openContainer.locator('.select2-results__option');
    try {
      await opts.first().waitFor({ state: 'visible', timeout: 15000 });
      const count = await opts.count();

      for (let i = 0; i < count; i++) {
        const cls = (await opts.nth(i).getAttribute('class').catch(() => '')) || '';
        if (cls.includes('loading') || cls.includes('disabled')) continue;
        const txt = (await opts.nth(i).textContent())?.trim() || '';
        if (txt.length > 0 && !txt.toLowerCase().includes('result') && !txt.toLowerCase().includes('no ')) {
          await opts.nth(i).click();
          console.log(`Select2 [${selectName}]: Selected "${txt}"`);
          await this.waitForAnimation(300);
          return;
        }
      }

      const labels: string[] = [];
      for (let i = 0; i < count; i++) {
        labels.push((await opts.nth(i).textContent())?.trim() || '');
      }
      console.warn(`Select2 [${selectName}]: Available options: [${labels.join(' | ')}]`);
    } catch {
      console.warn(`Select2 [${selectName}]: No AJAX results for "${searchText}"`);
    }

    await this.page.keyboard.press('Escape');
  }

  // =========================================================================
  // SweetAlert2 Helper
  // =========================================================================

  /**
   * Dismiss any SweetAlert2 validation popup if present.
   */
  private async dismissSweetAlertIfPresent(): Promise<void> {
    const swalPopup = this.page.locator('.swal2-popup').first();
    if (await swalPopup.isVisible({ timeout: 800 }).catch(() => false)) {
      const okBtn = swalPopup.locator('button:has-text("OK"), .swal2-confirm').first();
      if (await okBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await okBtn.click();
        await this.waitForAnimation(1000);
      }
    }
  }

  // =========================================================================
  // Save
  // =========================================================================

  async savePatient(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForAnimation(2000);

    // Check for SweetAlert2 validation popup
    const swalPopup = this.page.locator('.swal2-popup').first();
    if (await swalPopup.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Extract and log the popup text for diagnostics
      const popupText = await this.page.evaluate(() => {
        const containers = [
          document.querySelector('.swal2-html-container'),
          document.querySelector('.swal2-content'),
          document.querySelector('.swal2-title'),
          document.querySelector('.swal2-popup'),
        ];
        // Also capture validation errors in HTML lists or spans
        const errors: string[] = [];
        document.querySelectorAll('.swal2-html-container li, .swal2-html-container span, .invalid-feedback, .error-message, [class*="error"]').forEach(el => {
          const t = el.textContent?.trim();
          if (t) errors.push(t);
        });
        for (const el of containers) {
          if (el?.textContent?.trim()) {
            const fullText = el.textContent.trim();
            if (errors.length > 0) return `${fullText} | Details: ${errors.join('; ')}`;
            return fullText;
          }
        }
        if (errors.length > 0) return errors.join('; ');
        return '';
      }).catch(() => '');
      console.warn(`[Save] Validation error: "${popupText}"`);

      // Capture screenshot to inspect the validation error visually
      await this.page.screenshot({
        path: `test-results/artifacts/save-validation-error-${Date.now()}.png`,
      }).catch(() => {});

      const okBtn = swalPopup.locator('button:has-text("OK"), .swal2-confirm').first();
      if (await okBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await okBtn.click();
      }
      return; // Validation failed
    }

    // Otherwise wait for success navigation
    await this.waitForPageLoad();
    await this.waitForAnimation(1000);
  }

  /**
   * Complete end-to-end flow: open form, fill all fields including Select2, save.
   * @param patient - Patient data with optional staff names for Select2 dropdowns
   */
  async addPatient(patient: PatientData): Promise<void> {
    await this.openAddPatientForm();
    await this.fillPatientForm(patient);

    // Select staff via Select2 if names are provided.
    // Each staff field is found by scanning <select> elements for name patterns
    // (more robust than hardcoded indices — survives page re-renders).
    if (patient.primaryTeamLeaderNurse) {
      const name = await this.discoverStaffSelectName(['primary_team_leader', 'team_leader']);
      if (name) await this.selectFromSelect2(name, patient.primaryTeamLeaderNurse);
    }
    if (patient.primaryNurseName) {
      const name = await this.discoverStaffSelectName(['nurse'], ['team_leader']);
      if (name) await this.selectFromSelect2(name, patient.primaryNurseName);
    }
    if (patient.primaryPhysicianName) {
      const name = await this.discoverStaffSelectName(['physician', 'doctor']);
      if (name) await this.selectFromSelect2(name, patient.primaryPhysicianName);
    }
    if (patient.primarySocialWorkerName) {
      const name = await this.discoverStaffSelectName(['social_worker', 'social_work']);
      if (name) await this.selectFromSelect2(name, patient.primarySocialWorkerName);
    }

    await this.savePatient();
  }

  // =========================================================================
  // Search & Verify
  // =========================================================================

  async searchPatient(query: string): Promise<void> {
    // First try normal fill (input must be visible)
    const isVisible = await this.searchInput.isVisible().catch(() => false);

    if (isVisible) {
      await this.fill(this.searchInput, query);
      await this.page.keyboard.press('Enter');
    } else {
      // Fallback: use evaluate() to set the value and dispatch events.
      // This handles hidden search inputs common in admin templates where the
      // search field is rendered hidden or toggled by a search button.
      // Also tries to trigger DataTables search API if available.
      console.warn('[Search] Input not visible — using evaluate fallback');
      await this.page.evaluate((q: string) => {
        // Find the search input by various selectors
        const input = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[name="search"], input[placeholder*="Search"], input[placeholder*="search"]',
        );
        if (!input) throw new Error('Search input not found in DOM');

        // Set value natively (React-compatible)
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value',
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(input, q);
        } else {
          input.value = q;
        }

        // Dispatch input event to trigger React/Angular/Vue listeners
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Dispatch keyboard events for DataTables / jQuery listeners
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));

        // Try DataTables API if available (bypasses hidden input issues)
        try {
          const table = (window as any).$?.('table').DataTable?.();
          if (table) table.search(q).draw();
        } catch {
          // DataTables not available — ignore
        }
      }, query);
    }

    await this.waitForAnimation(1500);
  }

  async getPatientList(): Promise<string[]> {
    await this.waitForElementVisible(this.patientTableRows);
    return this.patientTableRows.evaluateAll((rows) =>
      rows.map((row) => row.textContent?.trim() ?? ''),
    );
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    try {
      await this.waitForElementVisible(this.successToast, 8000);
      return true;
    } catch {
      return false;
    }
  }

  async getSuccessMessage(): Promise<string> {
    return this.getText(this.successToast);
  }

  // =========================================================================
  // Appointment — Search & Select Patient
  // =========================================================================

  /**
   * Search for a patient by Patient ID using the dedicated filter form
   * on the Patients list page, then click their name to open the detail page.
   *
   * Workflow:
   *   1. Locate the "Patient ID" search input (`input[name="id"]`)
   *   2. Type the patient ID value from config
   *   3. Click "Filter" button (`input[type="submit"][value="Filter"]`)
   *   4. Wait for table results to update
   *   5. Click the patient's name link in the results row
   *
   * @param patientId - The Patient ID number from config.json
   */
  async searchAndSelectPatient(patientId: string): Promise<void> {
    // 1. Fill the Patient ID search input
    console.log(`[Search] Using Patient ID filter: "${patientId}"`);
    await this.fill(this.patientIdInput, patientId);

    // 2. Click the Filter button to execute search
    await this.click(this.filterButton);

    // 3. Wait for the table to refresh with filtered results
    await this.waitForAnimation(2000);

    // 4. Find the row containing this patient ID and click the name link
    const patientRow = this.patientTableRowsFiltered(patientId);
    await this.waitForElementVisible(patientRow, 10000);

    // 5. Click the patient name link within that row
    const patientLink = patientRow.locator('a').first();
    const isLinkVisible = await patientLink.isVisible().catch(() => false);

    if (isLinkVisible) {
      await this.click(patientLink);
    } else {
      // Fallback: click the entire row
      await this.click(patientRow);
    }

    await this.waitForPageLoad();
    await this.waitForAnimation(1000);

    // The patient detail page may show a conditional Allergies & Contamination
    // Alert modal for patients with registered records. Dismiss if present.
    await this.dismissAllergiesAlertIfPresent();
  }


  // =========================================================================
  // Encounters → Appointments Navigation
  // =========================================================================

  /**
   * Navigate from the Patient Details page to the Appointments list
   * via the Encounters nav section.
   *
   * On the patient detail page "Encounters" is a collapsible sidebar section
   * (Bootstrap collapse — `data-bs-toggle="collapse"` → `#collapse-encounters`),
   * NOT a dropdown: clicking its toggle expands it and reveals sub-items such
   * as "Appointments". The section is a Livewire-rendered accordion, so a
   * re-render can collapse it again right after the click — therefore we
   * re-open it until the Appointments option is actually visible.
   *
   * Workflow:
   *   1. Locate the "Encounters" collapse toggle (data-bs-toggle, nav-link, or tab)
   *   2. Click it to expand the section (retrying if a re-render closes it)
   *   3. Click the "Appointments" option inside the OPEN collapse only
   *      (scoped to `.collapse.show` so a hidden duplicate nav is never matched)
   *   4. Wait for the Appointments page/table to fully load
   */
  async navigateToEncountersAppointments(): Promise<void> {
    // Locate the Encounters collapse toggle (patients-toggle / nav-link / tab)
    const encountersToggle = this.page.locator(
      '[data-bs-toggle="collapse"]:has-text("Encounters"), a:has-text("Encounters"), button:has-text("Encounters")',
    ).first();

    // The Appointments option lives inside the OPEN Encounters collapse. Scope
    // to `.collapse.show` so the click never lands on a hidden duplicate nav
    // (e.g. mobile + desktop variants of the same sidebar).
    const appointmentsOption = this.page.locator(
      '.collapse.show a:has-text("Appointments"), .collapse.show .nav-item:has-text("Appointments")',
    ).first();

    console.log('[Navigation] Opening Encounters section...');

    // Expand the collapse; Livewire re-renders may collapse it again, so keep
    // toggling until the Appointments option is actually visible.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.click(encountersToggle);
      await this.waitForAnimation(800);

      const appeared = await appointmentsOption.isVisible({ timeout: 2000 }).catch(() => false);
      if (appeared) break;

      console.warn(`[Navigation] Appointments option not visible (attempt ${attempt}/3) — toggling Encounters again`);
    }

    console.log('[Navigation] Clicking Appointments option...');
    await this.click(appointmentsOption);

    // Wait for the appointments page/table to load
    await this.waitForPageLoad();
    await this.waitForAnimation(1000);

    // The appointments page may display a patient alerts modal if the selected
    // patient has registered allergies or contamination records.
    await this.dismissAllergiesAlertIfPresent();
  }

  /**
   * Open (view) the appointment whose Status badge matches the given
   * status name (default: "New"), optionally filtered by a date string.
   *
   * When `dateFilter` is provided, only rows containing that date text AND
   * the target status badge are considered. This lets tests target a specific
   * date (e.g., today's appointments) instead of just the first matching row.
   *
   * Handles paginated tables by iterating through pages if the target row
   * is not visible on the current page.
   *
   * Based on actual DOM inspection:
   *   Parent Button: <button class="btn btn-sm btn-outline-info" title="View Appointment" wire:click.prevent="viewAppointment(...)">
   *   Inner Icon:    <i class="ri-eye-line"></i>
   *   Parent Column: <td class="actions-column">
   *
   * @param targetStatus    - The status text to filter by (default: "New")
   * @param dateFilter      - Optional date text to require in the row
   *                          (e.g., "2026/07/30" for today's appointments)
   * @param extraFilterText - Optional additional text the row must contain
   *                          (e.g., the visit type), so tests can target the
   *                          exact appointment they created instead of the
   *                          first status/date match.
   */
  async openLatestAppointmentByStatus(targetStatus = 'New', dateFilter?: string, extraFilterText?: string): Promise<void> {
    const maxPages = 10;

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
      if (pageIndex > 0) {
        // Not the first page — click the "Next" pagination button
        const nextButton = this.page.locator(
          'nav a:has-text("Next"), nav button:has-text("Next"), ' +
          'nav [rel="next"], nav li:has-text("Next") button, ' +
          '[aria-label="Next"], .pagination .next a, .pagination .next button',
        ).first();

        const nextVisible = await nextButton.isVisible({ timeout: 2000 }).catch(() => false);
        if (!nextVisible) break; // No more pages

        console.log(`[Appointments] Navigating to page ${pageIndex + 2}...`);
        await nextButton.click();
        await this.waitForAnimation(1000);
      }

      // Build the row locator: filter by status badge, and optionally by date
      let targetRow = this.page.locator('tr').filter({
        has: this.page.locator('.badge, span', { hasText: targetStatus })
      });

      if (dateFilter) {
        targetRow = targetRow.filter({ hasText: dateFilter });
        console.log(`[Appointments] Looking for "${targetStatus}" with date "${dateFilter}" on page ${pageIndex + 1}...`);
      }

      if (extraFilterText) {
        targetRow = targetRow.filter({ hasText: extraFilterText });
        console.log(`[Appointments] ... also requiring row text "${extraFilterText}"`);
      }

      targetRow = targetRow.first();

      const rowVisible = await targetRow.isVisible({ timeout: 3000 }).catch(() => false);

      if (!rowVisible) {
        const searchDesc = dateFilter
          ? `"${targetStatus}" with date "${dateFilter}"`
          : `"${targetStatus}"`;
        console.log(`[Appointments] ${searchDesc} not found on page ${pageIndex + 1}, checking next...`);
        continue; // Try next page
      }

      // Row found and visible on this page
      console.log(`[Appointments] Found ${targetStatus} row${dateFilter ? ` for date ${dateFilter}` : ''} on page ${pageIndex + 1}`);

      // 2. Locate the "View Appointment" eye button using exact inspect properties
      const viewButton = targetRow.locator(
        'button[title="View Appointment"], button.btn-outline-info, button:has(i.ri-eye-line)'
      ).first();

      await viewButton.scrollIntoViewIfNeeded();
      await viewButton.waitFor({ state: 'visible', timeout: 5000 });
      await viewButton.click();

      // Wait for the appointment detail modal/offcanvas to render after clicking
      // View. Bootstrap modal animations and Livewire hydration need time.
      await this.waitForAnimation(1500);

      console.log(`[Appointments] Clicked View Appointment for status: ${targetStatus}`);
      return; // Success
    }

    // If we exhaust all pages without finding the target status, throw
    const searchDesc = dateFilter
      ? `"${targetStatus}" with date "${dateFilter}"`
      : `"${targetStatus}"`;
    throw new Error(
      `[Appointments] No visible row with ${searchDesc} found after paginating through all available pages`
    );
  }

  // =========================================================================
  // Appointment — Create Appointment
  // =========================================================================

  /**
   * Click the "Create Appointment" button on the patient detail page.
   * Dismisses any blocking modals (e.g., allergies modal) first.
   * Then waits for the appointment modal to be fully visible.
   */
  async clickCreateAppointment(): Promise<void> {
    // Dismiss any blocking patient alerts that may have appeared when landing
    // on the patient detail page (allergies/contamination banners/modals).
    await this.dismissAllergiesAlertIfPresent();
    await this.click(this.createAppointmentButton);

    // Wait for the appointment modal/form to appear (Bootstrap modal animation)
    // The visit_type_id select is a reliable indicator that the form loaded
    await this.waitForElementVisible(
      this.page.locator('select[name="visit_type_id"]'),
      10000,
    ).catch(() => {
      console.warn('[Appointment] Modal may not have fully rendered');
    });

    await this.waitForAnimation(500);
  }

  /**
   * Discover the `name` attribute of an appointment-related <select> element
   * by scanning all visible <select> elements on the page.
   *
   * Uses name-based lookup instead of fragile DOM indices because the patient
   * detail page can have 150+ selects from collapsed sections and embedded forms.
   *
   * @param patterns - Array of substrings to match against select names
   * @returns The matching select name, or null if not found
   */


  /**
   * Fill the appointment creation form with the provided data.
   * Uses a hybrid approach:
   * - Select dropdowns: JavaScript evaluate (like fillPatientForm)
   * - Date/time: evaluate with proper event dispatching (JS framework compatibility)
   *
   * Form field names are based on the actual staging app structure:
   *   - Visit Type:  select[name="visit_type_id"]
   *   - Date:        input[name="date"]
   *   - Start Time:  input[name="start_time"][type="time"]
   *   - Instructions: textarea[name="instructions"]
   *
   * All fields are set via evaluate with native value setters + proper events
   * to ensure the JS framework (Livewire/Vue/React) detects the changes.
   *
   * @param appointment - AppointmentData with visit type, date, time, etc.
   */
  async fillAppointmentForm(appointment: AppointmentData): Promise<void> {
    await this.page.evaluate((data: {
      visitType?: string;
      appointmentDate?: string;
      appointmentTime?: string;
      endTime?: string;
      notes?: string;
    }) => {
      /** Helper to set a form field value and dispatch events */
      function setFieldValue(
        el: HTMLInputElement | HTMLTextAreaElement | null,
        value: string,
      ): void {
        if (!el) return;

        el.removeAttribute('disabled');

        // Use the correct prototype setter based on element type
        // HTMLInputElement.prototype.value on a textarea causes "Illegal invocation"
        const proto = el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;

        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

        if (nativeSetter) {
          nativeSetter.call(el, value);
        } else {
          el.value = value;
        }

        // Dispatch events for JS framework listeners
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      // Set Visit Type
      if (data.visitType) {
        const select = document.querySelector<HTMLSelectElement>('select[name="visit_type_id"]');
        if (select) {
          const option = Array.from(select.options).find(
            o => o.textContent?.trim() === data.visitType || o.value === data.visitType,
          );
          if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }

      // Set Date
      if (data.appointmentDate) {
        setFieldValue(document.querySelector<HTMLInputElement>('input[name="date"]'), data.appointmentDate);
      }

      // Set Start Time
      if (data.appointmentTime) {
        setFieldValue(document.querySelector<HTMLInputElement>('input[name="start_time"]'), data.appointmentTime);
      }

      // Set End Time
      if (data.endTime) {
        setFieldValue(document.querySelector<HTMLInputElement>('input[name="end_time"]'), data.endTime);
      }

      // Set Instructions
      if (data.notes) {
        setFieldValue(document.querySelector<HTMLTextAreaElement>('textarea[name="instructions"]'), data.notes);
      }
    }, {
      visitType: appointment.visitType,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      endTime: appointment.endTime,
      notes: appointment.notes,
    });

    // Allow JS framework to process changes and update UI (enable save button, etc.)
    await this.waitForAnimation(1000);
  }

  /**
   * Save the appointment form and wait for the success toast.
   * Uses standard Playwright actions — scrolls the button into view
   * and clicks it — ensuring proper visibility checks and form
   * validation are respected (no page.evaluate() fallbacks).
   *
   * Also handles SweetAlert2 validation popups gracefully, consistent
   * with the existing savePatient() pattern.
   *
   * @returns The success message text, or empty string if validation failed
   */
  async saveAppointment(): Promise<string> {
    // The appointment form resides inside a right-hand offcanvas/side-drawer
    // panel with its own internal scroll container. We must scroll the drawer
    // container to bring the "Add" button (at the bottom) into view.
    // evaluate() is used exclusively to adjust scrollTop on the drawer
    // container — not to click the button. The click uses standard Playwright
    // click() which enforces proper actionability checks.
    await this.appointmentModalContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await this.waitForAnimation(500);

    // Verify the "Add" button is visible within the drawer, then click
    await this.appointmentSaveButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.appointmentSaveButton.click();
    await this.waitForAnimation(1000);

    // Check for SweetAlert2 popup (success OR validation error)
    const swalPopup = this.page.locator('.swal2-popup').first();
    if (await swalPopup.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Read the popup message
      const popupText = await this.page.evaluate(() => {
        const containers = [
          document.querySelector('.swal2-html-container'),
          document.querySelector('.swal2-content'),
          document.querySelector('.swal2-title'),
          document.querySelector('.swal2-popup'),
        ];
        for (const el of containers) {
          if (el?.textContent?.trim()) {
            return el.textContent.trim().slice(0, 500);
          }
        }
        return '';
      }).catch(() => '');

      if (popupText.toLowerCase().includes('success') || popupText.toLowerCase().includes('saved')) {
        // Success! The appointment was created.
        console.log(`[Appointment] Success popup: "${popupText}"`);

        // Dismiss the success popup
        const okBtn = swalPopup.locator('button:has-text("OK"), .swal2-confirm, button:has-text("ok")').first();
        if (await okBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await okBtn.click();
        }

        await this.waitForAnimation(500);
        return popupText;
      } else {
        // Validation error
        console.warn(`[Appointment] SweetAlert2 validation error: ${popupText}`);
        await this.page.screenshot({
          path: `test-results/artifacts/appointment-validation-error.png`,
        }).catch(() => {});

        const okBtn = swalPopup.locator('button:has-text("OK"), .swal2-confirm, button:has-text("ok")').first();
        if (await okBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await okBtn.click();
        }
        return ''; // Validation failed — caller can check empty string
      }
    }

    // Otherwise wait for success toast
    await this.waitForElementVisible(this.successToast, 10000);
    const message = await this.getSuccessMessage();

    // Allow page to settle
    await this.waitForAnimation(500);

    return message;
  }

  /**
   * Complete end-to-end appointment creation flow:
   *   1. Search and select the target patient
   *   2. Click "Create Appointment"
   *   3. Fill the appointment form
   *   4. Save and verify success
   *
   * @param patientIdentifier - Patient name or ID/MRN to select
   * @param appointment - Appointment data (visit type, date, time, etc.)
   * @returns The success message text
   */
  async createAppointment(
    patientIdentifier: string,
    appointment: AppointmentData,
  ): Promise<string> {
    await this.searchAndSelectPatient(patientIdentifier);
    await this.clickCreateAppointment();
    await this.fillAppointmentForm(appointment);
    return this.saveAppointment();
  }
}
