/**
 * =============================================================================
 * E2E Test: Fill the Patient Assessment Form (Treatment Nurse Visit)
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Open the Visits directory (/visits) and locate the row whose first
 *      column equals the target visit ID (config/config.json →
 *      patientAssessment.visitId, default "1005")
 *   3. Click the edit icon (`fa-pen-to-square`) under the Actions column
 *      → redirect to /visits/{id}/edit
 *   4. Open the Patient Assessment form — the "Patient Assessment" tab on the
 *      visit edit page opens `/load/visit-form/{id}/patient-assessment` in a
 *      new tab (target="_blank"), so the page object navigates there directly
 *   5. Fill the form section by section (Patient Information, Assessment,
 *      Medical History, Surgical History, Social History, Referral, History
 *      Given By) using the scenario payload
 *      (config/patient-assessment-scenarios/patient-assessment.scenario.json)
 *   6. Click the "Save" button (`wire:click="save"`)
 *   7. Assert the save succeeded — the URL gains `?row_id={id}` (the saved
 *      assessment record id; there is no SweetAlert on this form)
 *   8. Verify representative values persisted (the Livewire re-render after
 *      save reflects server state)
 *
 * The target visit ID is read from config/config.json (patientAssessment.visitId) —
 * the single source of truth, mirroring flowSheet.visitId. The visit must be
 * a "Treatment Nurse Visit" for the form to apply.
 *
 * @see config/config.json — patientAssessment.visitId (target visit)
 * @see config/patient-assessment-scenarios/patient-assessment.scenario.json — form payload
 * @see src/pages/patient-assessment.page.ts — Patient Assessment page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { PatientAssessmentPage } from '../src/pages/patient-assessment.page';
import { getPatientAssessmentData } from '../src/helpers/patient-assessment-data.loader';

test.describe('E2E: Fill Patient Assessment Form (Treatment Nurse Visit)', () => {

  // The Patient Assessment is a heavy Livewire form (nearly 100 controls) plus
  // per-field settle waits and the save round-trip, so raise the per-test
  // timeout (same rationale as flow-sheet.spec.ts / physician-orders.spec.ts).
  test.setTimeout(180_000);

  // No beforeEach header-context sync here: the auth fixture's autoLogin
  // already ensures Branch/Location after login, and the context persists
  // across navigations (see flow-sheet.spec.ts for the same pattern).

  test('should fill the Patient Assessment of the target visit section by section and save', async ({ page }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const visitId = config.patientAssessment.visitId;
    // Form payload from the scenario JSON (config/patient-assessment-scenarios/)
    const assessment = getPatientAssessmentData('patient-assessment.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  PATIENT ASSESSMENT TEST');
    console.log(`  Visit ID:        ${visitId}`);
    console.log(`  Initial:         ${assessment.initialAssessment}`);
    console.log(`  Mental Status:   ${assessment.mentalStatus}`);
    console.log(`  Patient Alert:   ${assessment.patientAlert}`);
    console.log(`  Dwelling Type:   ${assessment.dwellingType}`);
    console.log(`  History Given By: ${assessment.historyGivenBy}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Visits directory → find the visit → click the edit icon → open form
    // =========================================================================
    console.log('\n📋 Step 1: Open Visits directory & open the Patient Assessment form...');
    const paPage = new PatientAssessmentPage(page);
    await paPage.openVisitPatientAssessment(visitId);
    console.log(`[Test] ✅ Patient Assessment form opened for visit ${visitId}`);

    // =========================================================================
    // 3. Fill the form section by section
    // =========================================================================
    console.log('\n📋 Step 2: Fill the Patient Assessment form section by section...');
    await paPage.fillPatientAssessmentForm(assessment);
    console.log('[Test] ✅ Patient Assessment form filled');

    // =========================================================================
    // 4. Save the Patient Assessment
    // =========================================================================
    console.log('\n📋 Step 3: Save the Patient Assessment...');
    const rowId = await paPage.savePatientAssessment();
    expect(rowId).toBeTruthy();
    console.log(`[Test] ✅ Patient Assessment saved — row_id: "${rowId}"`);

    // =========================================================================
    // 5. Verify the filled values persisted (server state after save)
    // =========================================================================
    console.log('\n📋 Step 4: Verify saved values persisted...');
    await paPage.verifySavedValues(assessment);
    console.log('[Test] ✅ Saved values persisted after the save round-trip');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ PATIENT ASSESSMENT FILLED & SAVED SUCCESSFULLY');
    console.log(`  ✅ Visit ID:    ${visitId}`);
    console.log(`  ✅ Assessment row_id: "${rowId}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
