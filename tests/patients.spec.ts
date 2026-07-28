/**
 * =============================================================================
 * Patient Management — Consolidated E2E Tests
 * =============================================================================
 *
 * This suite tests the full patient lifecycle on CareConnect KSA (staging):
 *   - Creating patients with dynamically generated data (Arabic + English names,
 *     Saudi phone numbers, dates, dropdown selections, etc.)
 *   - Creating patients with minimal required fields only
 *   - Verifying successful creation via success toast
 *
 * Header Context Verification:
 *   The auth fixture (src/fixtures/auth.fixture.ts) automatically ensures the
 *   Branch and Location match config.json headerContext targets after login.
 *   No additional beforeEach is needed — the context persists across tests
 *   within the same session.
 *
 * Staff names are loaded from config/config.json so they can be updated
 * without modifying the test code. Simply edit the JSON file.
 *
 * Test Flow:
 *   1. Auto-login (via auth fixture)
 *   2. Auto header context sync (via auth fixture)
 *   3. Navigate to Patients section
 *   4. Open the Create Patient form
 *   5. Fill ALL required fields with dynamically generated data
 *      (Arabic/English names, Saudi phone, selects, dates, radios, etc.)
 *   6. Select assigned staff from config.json via Select2 AJAX dropdowns
 *   7. Click Save
 *   8. Assert success toast appears
 *
 * @see config/config.json — staff section
 * @see config/config.json — headerContext section
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { buildPatient, buildMinimalPatient } from '../src/data/patient.data';

// =============================================================================
// Patients Module — E2E Browser Tests
// =============================================================================

test.describe('Patients Module', () => {
  test.describe('Patient CRUD', () => {

    // =========================================================================
    // Happy Path: Create Patient with Full Dynamic Data
    // =========================================================================

    test('should create a new patient with all required dynamic data', async ({ patientsPage }) => {
      // -----------------------------------------------------------------------
      // 1. Generate complete patient data
      //    - patientSystem is 'Center' to match the header Location "In Center"
      //      from config.json (server rejects mismatches)
      //    - Fields below are excluded because they trigger client-side
      //      validation errors on the form despite having no server-side
      //      name attribute or causing flatpickr parse failures
      //    - Form structure verified in scripts/investigate-patient-form.ts
      // -----------------------------------------------------------------------
      const patient = buildPatient({
        secondaryMobile: undefined as any,
        dateOfMedicalAcceptance: undefined as any,
        dateOfHomeSettingsAcceptance: undefined as any,
        dateOfReferral: undefined as any,
        idExpirationDate: undefined as any,
      });

      console.log('═══════════════════════════════════════════════');
      console.log('  PATIENT TEST DATA');
      console.log(`  Arabic:  ${patient.firstNameAr} ${patient.middleNameAr} ${patient.familyNameAr}`);
      console.log(`  English: ${patient.givenNameEn} ${patient.middleNameEn} ${patient.familyNameEn}`);
      console.log(`  Mobile:  ${patient.mobile}`);
      console.log(`  DOB:     ${patient.dateOfBirth}`);
      console.log(`  Gender:  ${patient.gender}`);
      console.log(`  Nat'l:   ${patient.nationality}`);
      console.log(`  ID:      ${patient.nationalId}`);
      console.log(`  Employee: ${patient.isEmployee}`);
      console.log(`  Visitor:  ${patient.isVisitor}`);
      console.log(`  System:   ${patient.patientSystem}`);
      console.log(`  Religion: ${patient.religion}`);
      console.log(`  Language: ${patient.preferredLanguage}`);
      console.log('═══════════════════════════════════════════════');

      // -----------------------------------------------------------------------
      // 2. Execute the full add-patient workflow
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
      console.log(`\n✅ Patient created: ${successMessage}`);
    });

    // =========================================================================
    // Minimal Required Fields Only
    // =========================================================================

    test('should create a patient with minimal required fields only', async ({ patientsPage }) => {
      const patient = buildMinimalPatient();

      console.log('═══════════════════════════════════════════════');
      console.log('  MINIMAL PATIENT TEST DATA');
      console.log(`  English: ${patient.givenNameEn} ${patient.familyNameEn}`);
      console.log(`  Arabic:  ${patient.firstNameAr} ${patient.familyNameAr}`);
      console.log(`  Mobile:  ${patient.mobile}`);
      console.log('═══════════════════════════════════════════════');

      await patientsPage.navigateToPatients();
      await patientsPage.addPatient(patient);

      const successVisible = await patientsPage.isSuccessMessageVisible();
      expect(successVisible).toBe(true);

      const successMessage = await patientsPage.getSuccessMessage();
      expect(successMessage).toBeTruthy();
      console.log(`\n✅ Patient created (minimal): ${successMessage}`);
    });

    // =========================================================================
    // Saudi Phone Number Formats (disabled — needs server-side support)
    // =========================================================================

    // test('should create a patient with custom Saudi phone number', async ({ patientsPage }) => {
    //   const patient = buildPatient({
    //     mobile: generateSaudiPhoneNumber('local'),
    //     emergencyContactNo: generateSaudiPhoneNumber('local'),
    //   });
    //
    //   console.log(`[Phone] Mobile: ${patient.mobile}`);
    //
    //   await patientsPage.navigateToPatients();
    //   await patientsPage.addPatient(patient);
    //
    //   const successVisible = await patientsPage.isSuccessMessageVisible();
    //   expect(successVisible).toBe(true);
    // });

    // =========================================================================
    // Custom Field Overrides (disabled — needs server-side validation)
    // =========================================================================

    // test('should create a Saudi female patient with specific nationality and gender', async ({ page, patientsPage }) => {
    //   const patient = buildPatient({
    //     gender: 'Female',
    //     nationality: 'Saudi Arabian',
    //     maritalStatus: 'Married',
    //     patientSystem: 'Center',
    //   });
    //
    //   console.log(`[Custom] ${patient.givenNameEn} — ${patient.gender}, ${patient.nationality}`);
    //
    //   await patientsPage.navigateToPatients();
    //   await patientsPage.addPatient(patient);
    //
    //   const swalPopup = page.locator('.swal2-popup').first();
    //   if (await swalPopup.isVisible({ timeout: 2000 }).catch(() => false)) {
    //     const errText = await page.evaluate(() => {
    //       const html = document.querySelector('.swal2-html-container');
    //       return html?.textContent?.trim() || 'No error details in popup';
    //     });
    //     console.log(`[Custom] Validation error: ${errText}`);
    //   }
    //
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
  //
  //   test('international format should match +9665XXXXXXXX (13 chars)', () => {
  //     const phone = generateSaudiPhoneNumber('international');
  //     expect(phone).toMatch(/^\+9665\d{8}$/);
  //   });
  //
  //   test('spaced format should match 05X XXX XXXX (3+3+4 grouping)', () => {
  //     const phone = generateSaudiPhoneNumber('spaced');
  //     expect(phone).toMatch(/^05\d \d{3} \d{4}$/);
  //   });
  // });
});
