/**
 * =============================================================================
 * E2E Test: Create a Respiratory Triage Checklist during a Visit
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Open the Visits directory (/visits) and locate the row whose first
 *      column equals the target visit ID (config/config.json → visitId,
 *      default "1005")
 *   3. Click the edit icon (`fa-pen-to-square`) under the Actions column
 *      → redirect to /visits/{id}/edit
 *   4. Open the Respiratory Triage tab (`/load/visit-form/{id}/respiratory-triage`)
 *      — a LIST page
 *   5. Click "Add New" → `/load/form/{patientId}/respiratory-triage?display=create`
 *      (the patient-level create form)
 *   6. Fill the form section by section (triage date + vitals, dialysis?,
 *      symptom scores ped/adult, nurse/physician signatures, disposition
 *      iso/er/opd, doctor signature) using the scenario payload
 *      (config/respiratory-triage-scenarios/respiratory-triage.scenario.json)
 *   7. Click the "Save" button (`wire:click="save"`)
 *   8. Assert the save succeeded — the URL changes from `?display=create` to
 *      `?display=index` (the saved-records list; there is no SweetAlert on
 *      this form)
 *   9. Read the saved record id from the list and verify representative
 *      values persisted by opening the record in edit mode (`?display=form&row_id={id}`)
 *
 * The target visit ID is read from config/config.json (visitId) — the
 * single source of truth shared by all visit-form tests. The patient ID
 * comes from the "Add New" href itself
 * (load/form/{patientId}/respiratory-triage), i.e.
 * appointment.targetPatientIdentifier. The visit must be a "Treatment Nurse
 * Visit" for the tab to apply.
 *
 * @see config/config.json — visitId (target visit)
 * @see config/respiratory-triage-scenarios/respiratory-triage.scenario.json — form payload
 * @see src/pages/respiratory-triage.page.ts — Respiratory Triage page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { RespiratoryTriagePage } from '../src/pages/respiratory-triage.page';
import { getRespiratoryTriageData } from '../src/helpers/respiratory-triage-data.loader';

test.describe('E2E: Create Respiratory Triage Checklist (Treatment Nurse Visit)', () => {

  // The form is a moderately heavy Livewire form plus the save round-trip and
  // the edit-mode readback, so raise the per-test timeout (same rationale as
  // the other visit-form specs).
  test.setTimeout(180_000);

  // No beforeEach header-context sync here: the auth fixture's autoLogin
  // already ensures Branch/Location after login, and the context persists
  // across navigations (see flow-sheet.spec.ts for the same pattern).

  test('should fill the Respiratory Triage form of the target visit section by section and save', async ({ page }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const visitId = config.visitId;
    // Form payload from the scenario JSON (config/respiratory-triage-scenarios/)
    const data = getRespiratoryTriageData('respiratory-triage.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  RESPIRATORY TRIAGE TEST');
    console.log(`  Visit ID:         ${visitId}`);
    console.log(`  Date:             ${data.date}`);
    console.log(`  Height/Weight:    ${data.height} cm / ${data.weight} kg`);
    console.log(`  Dialysis:         ${data.dialysis}`);
    console.log(`  SOB (adult):      ${data.sobAdult}`);
    console.log(`  Total Score:      ${data.totalScore}`);
    console.log(`  Disposition:      iso=${data.iso}, er=${data.er}, opd=${data.opd}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Visits directory → edit icon → Respiratory Triage tab → Add New
    // =========================================================================
    console.log('\n📋 Step 1: Open Visits directory & open the Respiratory Triage create form...');
    const rtPage = new RespiratoryTriagePage(page);
    await rtPage.openVisitRespiratoryTriage(visitId);
    console.log(`[Test] ✅ Respiratory Triage create form opened for visit ${visitId}`);

    // =========================================================================
    // 3. Fill the form section by section
    // =========================================================================
    console.log('\n📋 Step 2: Fill the Respiratory Triage form section by section...');
    await rtPage.fillRespiratoryTriageForm(data);
    console.log('[Test] ✅ Respiratory Triage form filled');

    // =========================================================================
    // 4. Save the form
    // =========================================================================
    console.log('\n📋 Step 3: Save the Respiratory Triage form...');
    const rowId = await rtPage.saveRespiratoryTriage();
    expect(rowId).toBeTruthy();
    console.log(`[Test] ✅ Respiratory Triage saved — row_id: "${rowId}"`);

    // =========================================================================
    // 5. Verify the filled values persisted (edit-mode readback)
    // =========================================================================
    console.log('\n📋 Step 4: Verify saved values persisted...');
    await rtPage.verifySavedValues(data, rowId);
    console.log('[Test] ✅ Saved values persisted after the save round-trip');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ RESPIRATORY TRIAGE CREATED & SAVED SUCCESSFULLY');
    console.log(`  ✅ Visit ID:    ${visitId}`);
    console.log(`  ✅ Record row_id: "${rowId}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
