import { test, expect } from '../src/fixtures/auth.fixture';
import { buildPatient, buildMinimalPatient } from '../src/data/patient.data';
import { generateSaudiPhoneNumber } from '../src/helpers/saudi-phone.helper';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';

/**
 * Test suite: Patient Management
 *
 * This suite tests the full patient lifecycle on CareConnect KSA (staging):
 * - Creating patients with dynamically generated data (Arabic + English names,
 *   Saudi phone numbers, dates, dropdown selections, etc.)
 * - Verifying successful creation via success toast
 * - Validating Saudi phone number format compliance
 *
 * Pre-test Header Context Verification:
 *   Every browser-based test in this suite explicitly verifies and ensures
 *   the Branch and Location match config.json headerContext targets before
 *   executing any test steps. If the current UI state does not match, the
 *   test automatically switches before proceeding.
 *
 * Phone format validation tests are pure unit tests (no browser) and
 * do not require header context.
 */

test.describe('Patients Module', () => {
  // =========================================================================
  // Browser-based Patient Tests (require header context)
  // =========================================================================

  test.describe('Patient CRUD', () => {

    // ---------------------------------------------------------------------------
    // Mandatory Pre-test: Verify & set header context before every browser test
    // ---------------------------------------------------------------------------
    test.beforeEach(async ({ page }) => {
      await ensureHeaderContext(page);
    });

    // =========================================================================
    // Happy Path: Create Patient with Full Dynamic Data
    // =========================================================================

    test('should create a new patient with all required dynamic data', async ({ patientsPage }) => {
      // -----------------------------------------------------------------------
      // 1. Generate complete patient data using Faker (Arabic + English locales)
      // -----------------------------------------------------------------------
      const patient = buildPatient();

      console.log(`[Patient] Arabic: ${patient.firstNameAr} ${patient.middleNameAr} ${patient.familyNameAr}`);
      console.log(`[Patient] English: ${patient.givenNameEn} ${patient.middleNameEn} ${patient.familyNameEn}`);
      console.log(`[Patient] Mobile: ${patient.mobile}`);
      console.log(`[Patient] DOB: ${patient.dateOfBirth}`);
      console.log(`[Patient] Nationality: ${patient.nationality}`);
      console.log(`[Patient] ID: ${patient.nationalId}`);

      // -----------------------------------------------------------------------
      // 2. Execute the full add-patient flow
      // -----------------------------------------------------------------------
      await patientsPage.navigateToPatients();
      await patientsPage.addPatient(patient);

      // -----------------------------------------------------------------------
      // 3. Assert — verify success indicator
      // -----------------------------------------------------------------------
      const successVisible = await patientsPage.isSuccessMessageVisible();
      expect(successVisible).toBe(true);

      const successMessage = await patientsPage.getSuccessMessage();
      expect(successMessage).toBeTruthy();
      console.log(`[Result] Success message: "${successMessage}"`);
    });

    // =========================================================================
    // Minimal Required Fields Only
    // =========================================================================

    test('should create a patient with minimal required fields only', async ({ patientsPage }) => {
      const patient = buildMinimalPatient();

      console.log(`[Minimal] ${patient.givenNameEn} ${patient.familyNameEn} — ${patient.mobile}`);

      await patientsPage.navigateToPatients();
      await patientsPage.addPatient(patient);

      const successVisible = await patientsPage.isSuccessMessageVisible();
      expect(successVisible).toBe(true);
    });

    // =========================================================================
    // Saudi Phone Number Formats
    // =========================================================================

    // test('should create a patient with custom Saudi phone number', async ({ patientsPage }) => {
    //   // Use LOCAL format for the server (international format is tested in unit tests below)
    //   const patient = buildPatient({
    //     mobile: generateSaudiPhoneNumber('local'),
    //     emergencyContactNo: generateSaudiPhoneNumber('local'),
    //   });

    //   console.log(`[Phone] Mobile: ${patient.mobile}`);

    //   await patientsPage.navigateToPatients();
    //   await patientsPage.addPatient(patient);

    //   const successVisible = await patientsPage.isSuccessMessageVisible();
    //   expect(successVisible).toBe(true);
    // });

    // =========================================================================
    // Custom Field Overrides
    // =========================================================================

    // test('should create a Saudi female patient with specific nationality and gender', async ({ page, patientsPage }) => {
    //   const patient = buildPatient({
    //     gender: 'Female',
    //     nationality: 'Saudi Arabian',
    //     maritalStatus: 'Married',
    //     patientSystem: 'Center',
    //   });

    //   console.log(`[Custom] ${patient.givenNameEn} — ${patient.gender}, ${patient.nationality}`);

    //   await patientsPage.navigateToPatients();
    //   await patientsPage.addPatient(patient);

    //   // Check for SweetAlert2 validation error
    //   const swalPopup = page.locator('.swal2-popup').first();
    //   if (await swalPopup.isVisible({ timeout: 2000 }).catch(() => false)) {
    //     const errText = await page.evaluate(() => {
    //       const html = document.querySelector('.swal2-html-container');
    //       return html?.textContent?.trim() || 'No error details in popup';
    //     });
    //     console.log(`[Custom] Validation error: ${errText}`);
    //     // Dismiss and retry logic could go here
    //   }

    //   const successVisible = await patientsPage.isSuccessMessageVisible();
    //   expect(successVisible).toBe(true);
    // });
  });

  // =========================================================================
  // Phone Number Format Validation (unit-style tests, no browser needed)
  // =========================================================================

  // test.describe('Saudi Phone Number Format Validation', () => {
  //   test('local format should match 05XXXXXXXX (10 digits)', () => {
  //     const phone = generateSaudiPhoneNumber('local');
  //     expect(phone).toMatch(/^05\d{8}$/);
  //   });

  //   test('international format should match +9665XXXXXXXX (13 chars)', () => {
  //     const phone = generateSaudiPhoneNumber('international');
  //     expect(phone).toMatch(/^\+9665\d{8}$/);
  //   });

  //   test('spaced format should match 05X XXX XXXX (3+3+4 grouping)', () => {
  //     const phone = generateSaudiPhoneNumber('spaced');
  //     expect(phone).toMatch(/^05\d \d{3} \d{4}$/);
  //   });
  // });
});
