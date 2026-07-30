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
 * Staff names are available in config/patient-scenarios/*.scenario.json (_config.staff)
 * so they can be updated per-scenario without modifying the test code.
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
 * @see config/patient-scenarios/ — scenario files with _config + _fields
 * @see config/config.json — headerContext section
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { getPatientData } from '../src/helpers/patient-data.loader';
// Scenario JSONs (_config + _fields) live in config/patient-scenarios/.
// Import them directly when a test needs _config values (e.g. staff names):
//   import scenario from '../config/patient-scenarios/full-patient.scenario.json';

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
      // 1. Generate complete patient data from JSON file
      //    - 'DYNAMIC' fields in the JSON produce fresh random values each run
      //    - Problematic fields (secondaryMobile, dateOfMedicalAcceptance, etc.)
      //      are left empty in the JSON, resolving to undefined via the loader,
      //      avoiding client-side validation errors from missing server-side
      //      name attributes or flatpickr parse issues.
      //    - patientSystem is auto-aligned by the page object's
      //      syncPatientSystemWithHeaderLocation() method.
      // -----------------------------------------------------------------------
      const patient = getPatientData('full-patient.scenario.json');

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
      const patient = getPatientData('minimal-patient.scenario.json');

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
    // Custom Scenario: Female Saudi patient with static constraints
    // =========================================================================

    test('should create a Saudi female patient with specific nationality and gender', async ({ patientsPage }) => {
      // -----------------------------------------------------------------------
      // 1. Generate patient data from custom scenario JSON
      //    - gender:        "Female" (static)
      //    - nationality:   "Saudi Arabian" (static)
      //    - maritalStatus: "Married" (static)
      //    - All other fields are DYNAMIC or empty (default/undefined)
      // -----------------------------------------------------------------------
      const patient = getPatientData('female-saudi-patient.scenario.json');

      console.log('═══════════════════════════════════════════════');
      console.log('  FEMALE SAUDI PATIENT SCENARIO');
      console.log(`  English: ${patient.givenNameEn} ${patient.familyNameEn}`);
      console.log(`  Gender:  ${patient.gender}`);
      console.log(`  Nat'l:   ${patient.nationality}`);
      console.log(`  Marital: ${patient.maritalStatus}`);
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
      console.log(`\n✅ Female Saudi patient created: ${successMessage}`);
    });
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
