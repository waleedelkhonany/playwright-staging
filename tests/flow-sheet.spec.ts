/**
 * =============================================================================
 * E2E Test: Fill the Flow Sheet Form (Treatment Nurse Visit)
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Open the Visits directory (/visits) and locate the row whose first
 *      column equals the target visit ID (config/config.json → visitId,
 *      default "1005")
 *   3. Click the edit icon (`fa-pen-to-square`) under the Actions column
 *      → redirect to /visits/{id}/edit
 *   4. Open the "Flow Sheet" tab (Livewire component `patients::flowsheet`)
 *   5. Fill the form section by section (Outside Dialysis, Pain Assessment,
 *      Fall Risk Assessment, Pre-Treatment Vascular Access, Alarms Test,
 *      Pre-Treatment Vitals, Nursing Action, Dialysis Parameters,
 *      Post-Treatment Vascular Access) using the scenario payload
 *      (config/flow-sheet-scenarios/flow-sheet.scenario.json)
 *   6. Click the single "Save" button (`wire:click="save"`)
 *   7. Assert the SweetAlert2 success popup "Flow sheet saved successfully!"
 *   8. Verify representative values persisted (the Livewire re-render after
 *      save reflects server state)
 *
 * The target visit ID is read from config/config.json (visitId) — the
 * single source of truth shared by all visit-form tests.
 * The visit must be a "Treatment Nurse Visit" (visit 1005 is) for the Flow
 * Sheet form to apply.
 *
 * @see config/config.json — visitId (target visit)
 * @see config/flow-sheet-scenarios/flow-sheet.scenario.json — form payload
 * @see src/pages/flow-sheet.page.ts — Flow Sheet page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { FlowSheetPage } from '../src/pages/flow-sheet.page';
import { getFlowSheetData } from '../src/helpers/flow-sheet-data.loader';

test.describe('E2E: Fill Flow Sheet Form (Treatment Nurse Visit)', () => {

  // The Flow Sheet is a heavy Livewire form (hundreds of controls across
  // ~10 sections); filling + the save round-trip can exceed the global 60s
  // default, so raise the per-test timeout (same rationale as
  // physician-orders.spec.ts).
  test.setTimeout(180_000);

  // No beforeEach header-context sync here: the auth fixture's autoLogin
  // already ensures Branch/Location after login, and the context persists
  // across navigations (see visit_filter.spec.ts for the same pattern).

  test('should fill the Flow Sheet of the target visit section by section and save', async ({ page }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const visitId = config.visitId;
    // Form payload from the scenario JSON (config/flow-sheet-scenarios/)
    const flowSheet = getFlowSheetData('flow-sheet.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  FLOW SHEET TEST');
    console.log(`  Visit ID:       ${visitId}`);
    console.log(`  Pain Rating:    ${flowSheet.painRating}`);
    console.log(`  Fall Risk Score: ${flowSheet.fallRiskScore}`);
    console.log(`  Access Type:    ${flowSheet.vasAccessPreType}`);
    console.log(`  BP:             ${flowSheet.preVitalBpSystolic}/${flowSheet.preVitalBpDiastolic}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Visits directory → find the visit → click the edit icon
    // =========================================================================
    console.log('\n📋 Step 1: Open Visits directory & open visit by ID...');
    const flowSheetPage = new FlowSheetPage(page);
    await flowSheetPage.openVisitFlowSheet(visitId);
    console.log(`[Test] ✅ Visit ${visitId} opened (edit icon under Actions → Flow Sheet tab)`);

    // =========================================================================
    // 3. Fill the form section by section
    // =========================================================================
    console.log('\n📋 Step 2: Fill the Flow Sheet form section by section...');
    await flowSheetPage.fillFlowSheetForm(flowSheet);
    console.log('[Test] ✅ Flow Sheet form filled');

    // =========================================================================
    // 4. Save the Flow Sheet
    // =========================================================================
    console.log('\n📋 Step 3: Save the Flow Sheet...');
    const saveResult = await flowSheetPage.saveFlowSheet();
    expect(saveResult.toLowerCase()).toContain('saved successfully');
    console.log(`[Test] ✅ Flow Sheet saved: "${saveResult}"`);

    // =========================================================================
    // 5. Verify the filled values persisted (server state after save)
    // =========================================================================
    console.log('\n📋 Step 4: Verify saved values persisted...');
    await flowSheetPage.verifySavedValues(flowSheet);
    console.log('[Test] ✅ Saved values persisted after the save round-trip');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ FLOW SHEET FILLED & SAVED SUCCESSFULLY');
    console.log(`  ✅ Visit ID: ${visitId}`);
    console.log(`  ✅ Save result: "${saveResult}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
