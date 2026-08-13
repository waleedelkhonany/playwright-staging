/**
 * =============================================================================
 * E2E Test: Fill the VASCULAR ACCESS ASSESSMENT TOOL Form
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Open the Visits directory (/visits) and locate the row whose first
 *      column equals the target visit ID (config/config.json →
 *      vascularAccess.visitId, default "1005")
 *   3. Click the edit icon (`fa-pen-to-square`) under the Actions column
 *      → redirect to /visits/{id}/edit
 *   4. Open the Vascular Access Assessment form — the "VASCULAR ACCESS
 *      ASSESSMENT TOOL" tab on the visit edit page opens
 *      `/load/visit-form/{id}/vascular-access-assessment` in a new tab
 *      (target="_blank"), so the page object navigates there directly
 *   5. Fill the form section by section (Access Type → AVF branch,
 *      K. Needle Insertion Assessment scoring checkboxes, Post-care
 *      dressing/tego + dates, low-risk Interventions) using the scenario
 *      payload
 *      (config/vascular-access-scenarios/vascular-access.scenario.json)
 *   6. Click the "Save" button (`wire:click="save"`)
 *   7. Assert the save succeeded — the URL gains `?row_id={id}` (the saved
 *      record id; there is no SweetAlert on this form)
 *   8. Verify representative values persisted (the Livewire re-render after
 *      save reflects server state)
 *
 * The target visit ID is read from config/config.json
 * (vascularAccess.visitId) — the single source of truth, mirroring
 * flowSheet.visitId / patientAssessment.visitId / discontinuation.visitId.
 * The visit must be a "Treatment Nurse Visit" for the form to apply.
 *
 * @see config/config.json — vascularAccess.visitId (target visit)
 * @see config/vascular-access-scenarios/vascular-access.scenario.json — form payload
 * @see src/pages/vascular-access.page.ts — Vascular Access page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { VascularAccessPage } from '../src/pages/vascular-access.page';
import { getVascularAccessData } from '../src/helpers/vascular-access-data.loader';

test.describe('E2E: Fill Vascular Access Assessment Form (Treatment Nurse Visit)', () => {

  // The form is a heavy Livewire form (scoring checkboxes trigger Livewire
  // re-renders per field) plus the save round-trip, so raise the per-test
  // timeout (same rationale as flow-sheet.spec.ts / patient-assessment.spec.ts).
  test.setTimeout(180_000);

  // No beforeEach header-context sync here: the auth fixture's autoLogin
  // already ensures Branch/Location after login, and the context persists
  // across navigations (see flow-sheet.spec.ts for the same pattern).

  test('should fill the Vascular Access Assessment form of the target visit section by section and save', async ({ page }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const visitId = config.vascularAccess.visitId;
    // Form payload from the scenario JSON (config/vascular-access-scenarios/)
    const data = getVascularAccessData('vascular-access.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  VASCULAR ACCESS ASSESSMENT TEST');
    console.log(`  Visit ID:         ${visitId}`);
    console.log(`  Access Type:      ${data.accessType}`);
    console.log(`  AVF Site:         ${data.avfSite}`);
    console.log(`  Dressing Applied: ${data.dressingApplied}`);
    console.log(`  Tego Changed:     ${data.tegoChanged}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Visits directory → find the visit → click the edit icon → open form
    // =========================================================================
    console.log('\n📋 Step 1: Open Visits directory & open the Vascular Access Assessment form...');
    const vaPage = new VascularAccessPage(page);
    await vaPage.openVisitVascularAccess(visitId);
    console.log(`[Test] ✅ Vascular Access Assessment form opened for visit ${visitId}`);

    // =========================================================================
    // 3. Fill the form section by section
    // =========================================================================
    console.log('\n📋 Step 2: Fill the Vascular Access Assessment form section by section...');
    await vaPage.fillVascularAccessForm(data);
    console.log('[Test] ✅ Vascular Access Assessment form filled');

    // =========================================================================
    // 4. Save the form
    // =========================================================================
    console.log('\n📋 Step 3: Save the Vascular Access Assessment form...');
    const rowId = await vaPage.saveVascularAccess();
    expect(rowId).toBeTruthy();
    console.log(`[Test] ✅ Vascular Access Assessment saved — row_id: "${rowId}"`);

    // =========================================================================
    // 5. Verify the filled values persisted (server state after save)
    // =========================================================================
    console.log('\n📋 Step 4: Verify saved values persisted...');
    await vaPage.verifySavedValues(data);
    console.log('[Test] ✅ Saved values persisted after the save round-trip');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ VASCULAR ACCESS ASSESSMENT FILLED & SAVED SUCCESSFULLY');
    console.log(`  ✅ Visit ID:    ${visitId}`);
    console.log(`  ✅ Record row_id: "${rowId}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
