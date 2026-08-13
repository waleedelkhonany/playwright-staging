/**
 * =============================================================================
 * E2E Test: Fill the REFUSAL/DISCONTINUATION OF HEMODIALYSIS SESSION/S Form
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Open the Visits directory (/visits) and locate the row whose first
 *      column equals the target visit ID (config/config.json → visitId,
 *      default "1005")
 *   3. Click the edit icon (`fa-pen-to-square`) under the Actions column
 *      → redirect to /visits/{id}/edit
 *   4. Open the Discontinue Of Hemodialysis form — the "Discontinue Of
 *      Hemodialysis" tab on the visit edit page opens
 *      `/load/visit-form/{id}/dis-of-hemodialysis` in a new tab
 *      (target="_blank"), so the page object navigates there directly
 *   5. Fill the form section by section (Reason/Refusal, Witness
 *      Information, Reason why patient is unable to sign, Relative
 *      Information, Doctor Information, Interpreter Information) — both the
 *      English (*_en) and Arabic (*_ar) sides — using the scenario payload
 *      (config/discontinuation-scenarios/discontinuation.scenario.json)
 *   6. Click the "Save" button (`wire:click="save"`)
 *   7. Assert the save succeeded — the URL gains `?row_id={id}` (the saved
 *      record id; there is no SweetAlert on this form)
 *   8. Verify representative values persisted (the Livewire re-render after
 *      save reflects server state)
 *
 * The target visit ID is read from config/config.json (visitId) — the
 * single source of truth shared by all visit-form tests. The visit must be
 * a "Treatment Nurse Visit" for the form to apply.
 *
 * @see config/config.json — visitId (target visit)
 * @see config/discontinuation-scenarios/discontinuation.scenario.json — form payload
 * @see src/pages/discontinuation.page.ts — Discontinuation page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { DiscontinuationPage } from '../src/pages/discontinuation.page';
import { getDiscontinuationData } from '../src/helpers/discontinuation-data.loader';

test.describe('E2E: Fill Discontinue Of Hemodialysis Form (Treatment Nurse Visit)', () => {

  // The form is a heavy bilingual Livewire form (40 mapped controls) plus
  // per-field settle waits and the save round-trip, so raise the per-test
  // timeout (same rationale as flow-sheet.spec.ts / patient-assessment.spec.ts).
  test.setTimeout(180_000);

  // No beforeEach header-context sync here: the auth fixture's autoLogin
  // already ensures Branch/Location after login, and the context persists
  // across navigations (see flow-sheet.spec.ts for the same pattern).

  test('should fill the Discontinue Of Hemodialysis form of the target visit section by section and save', async ({ page }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const visitId = config.visitId;
    // Form payload from the scenario JSON (config/discontinuation-scenarios/)
    const data = getDiscontinuationData('discontinuation.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  DISCONTINUE OF HEMODIALYSIS TEST');
    console.log(`  Visit ID:             ${visitId}`);
    console.log(`  Discontinue Services: ${data.discontinueServicesEn}`);
    console.log(`  Reason (EN):          ${data.discontinueReasonEn}`);
    console.log(`  Witness:              ${data.witnessNameEn} (${data.witnessRelationshipEn})`);
    console.log(`  Doctor:               ${data.doctorNameEn}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Visits directory → find the visit → click the edit icon → open form
    // =========================================================================
    console.log('\n📋 Step 1: Open Visits directory & open the Discontinue Of Hemodialysis form...');
    const discPage = new DiscontinuationPage(page);
    await discPage.openVisitDiscontinuation(visitId);
    console.log(`[Test] ✅ Discontinue Of Hemodialysis form opened for visit ${visitId}`);

    // =========================================================================
    // 3. Fill the form section by section (EN + AR)
    // =========================================================================
    console.log('\n📋 Step 2: Fill the Discontinue Of Hemodialysis form section by section...');
    await discPage.fillDiscontinuationForm(data);
    console.log('[Test] ✅ Discontinue Of Hemodialysis form filled');

    // =========================================================================
    // 4. Save the form
    // =========================================================================
    console.log('\n📋 Step 3: Save the Discontinue Of Hemodialysis form...');
    const rowId = await discPage.saveDiscontinuation();
    expect(rowId).toBeTruthy();
    console.log(`[Test] ✅ Discontinue Of Hemodialysis saved — row_id: "${rowId}"`);

    // =========================================================================
    // 5. Verify the filled values persisted (server state after save)
    // =========================================================================
    console.log('\n📋 Step 4: Verify saved values persisted...');
    await discPage.verifySavedValues(data);
    console.log('[Test] ✅ Saved values persisted after the save round-trip');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ DISCONTINUE OF HEMODIALYSIS FILLED & SAVED SUCCESSFULLY');
    console.log(`  ✅ Visit ID:    ${visitId}`);
    console.log(`  ✅ Record row_id: "${rowId}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
