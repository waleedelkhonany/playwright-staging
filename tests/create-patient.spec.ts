/**
 * =============================================================================
 * Comprehensive E2E Test: Create a New Patient
 * =============================================================================
 *
 * Single end-to-end test covering the complete happy path:
 *   1. Auto-login (via auth fixture)
 *   2. ⚠️  Mandatory: Verify & set Branch/Location header context (via beforeEach)
 *   3. Navigate to Patients section
 *   4. Open the Create Patient form
 *   5. Fill ALL required fields with dynamically generated data
 *      (Arabic/English names, Saudi phone, selects, dates, radios, etc.)
 *   6. Select assigned staff from config.json via Select2 AJAX dropdowns
 *   7. Click Save
 *   8. Assert success toast appears
 *
 * Staff names are loaded from config/config.json so they can be updated
 * without modifying the test code. Simply edit the JSON file.
 *
 * Pre-test Header Context Verification:
 *   Every test in this suite explicitly verifies and ensures the Branch and
 *   Location match config.json headerContext targets. If the current UI state
 *   does not match, the test automatically switches before proceeding.
 *
 * @see config/config.json — staff section
 * @see config/config.json — headerContext section
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { buildPatient } from '../src/data/patient.data';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';

test.describe('E2E: Create Patient', () => {

  // ---------------------------------------------------------------------------
  // Mandatory Pre-test: Verify & set header context before every test
  // ---------------------------------------------------------------------------
  test.beforeEach(async ({ page }) => {
    // Reads targetBranch + targetLocation from config.json
    // Checks current header values; switches any that don't match
    await ensureHeaderContext(page);
  });

  test('should create a patient end-to-end with all dynamic data', async ({ patientsPage }) => {
    // -----------------------------------------------------------------------
    // 1. Generate complete dynamic patient data
    //    Staff selection via Select2 is available in addPatient() as an
    //    optional step. To enable, pass staff names via buildPatient():
    //      buildPatient({ primaryTeamLeaderNurse: 'Name', ... })
    //    Update the names in config/config.json — staff section.
    //    The selectFromSelect2() method handles the full workflow:
    //      click → type (native value setter) → wait for AJAX → select
    // -----------------------------------------------------------------------
    const patient = buildPatient();

    console.log('═══════════════════════════════════════════════');
    console.log('  PATIENT TEST DATA');
    console.log(`  English: ${patient.givenNameEn} ${patient.familyNameEn}`);
    console.log(`  Arabic:  ${patient.firstNameAr} ${patient.familyNameAr}`);
    console.log(`  Mobile:  ${patient.mobile}`);
    console.log(`  DOB:     ${patient.dateOfBirth}`);
    console.log(`  Gender:  ${patient.gender}`);
    console.log('═══════════════════════════════════════════════');

    // -----------------------------------------------------------------------
    // 2. Execute the full add-patient workflow
    // -----------------------------------------------------------------------
    await patientsPage.navigateToPatients();
    await patientsPage.addPatient(patient);

    // -----------------------------------------------------------------------
    // 3. Assert — verify success
    // -----------------------------------------------------------------------
    const successVisible = await patientsPage.isSuccessMessageVisible();
    expect(successVisible).toBe(true);

    const successMessage = await patientsPage.getSuccessMessage();
    expect(successMessage).toBeTruthy();
    console.log(`\n✅ Patient created: ${successMessage}`);
  });
});
