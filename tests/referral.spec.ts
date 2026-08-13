/**
 * =============================================================================
 * E2E Test: Create a Referral during a Visit (Treatment Nurse Visit)
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Open the Visits directory (/visits) and locate the row whose first
 *      column equals the target visit ID (config/config.json → visitId,
 *      default "1005")
 *   3. Click the edit icon (`fa-pen-to-square`) under the Actions column
 *      → redirect to /visits/{id}/edit
 *   4. Open the Referral form (`/load/visit-form/{id}/referrals`, opened by
 *      the "Referrals" tab on the visit edit page)
 *   5. Fill the form section by section (referral date, referral type,
 *      referred hospital, documents to print, referral reason, completion
 *      date, comments) using the scenario payload
 *      (config/referral-scenarios/referral.scenario.json)
 *   6. Click the "Save" button (`wire:click="save"`)
 *   7. Assert the save succeeded — the URL gains `?row_id={id}` (there is no
 *      SweetAlert on this form)
 *   8. Verify representative values persisted (the Livewire re-render after
 *      save reflects server state)
 *
 * The target visit ID is read from config/config.json (visitId) — the
 * single source of truth shared by all visit-form tests. The visit must be
 * a "Treatment Nurse Visit" for the form to apply.
 *
 * @see config/config.json — visitId (target visit)
 * @see config/referral-scenarios/referral.scenario.json — form payload
 * @see src/pages/referral.page.ts — Referral page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { ReferralPage } from '../src/pages/referral.page';
import { getReferralData } from '../src/helpers/referral-data.loader';

test.describe('E2E: Create Referral (Treatment Nurse Visit)', () => {

  // The form is a Livewire form plus the save round-trip and the edit-mode
  // readback, so raise the per-test timeout (same rationale as the other
  // visit-form specs).
  test.setTimeout(180_000);

  // No beforeEach header-context sync here: the auth fixture's autoLogin
  // already ensures Branch/Location after login, and the context persists
  // across navigations (see flow-sheet.spec.ts for the same pattern).

  test('should fill the Referral form of the target visit section by section and save', async ({ page }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const visitId = config.visitId;
    // Form payload from the scenario JSON (config/referral-scenarios/)
    const data = getReferralData('referral.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  REFERRAL TEST');
    console.log(`  Visit ID:         ${visitId}`);
    console.log(`  Referral Date:    ${data.referralDate}`);
    console.log(`  Referral Type:    ${data.referralType}`);
    console.log(`  Hospital:         ${data.referralHospitalId}`);
    console.log(`  Documents:        ${data.printMonthlyMedicalReport}, ${data.printLabResult}, ...`);
    console.log(`  Completion Date:  ${data.completionDate}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Visits directory → edit icon → Referral form
    // =========================================================================
    console.log('\n📋 Step 1: Open Visits directory & open the Referral form...');
    const referralPage = new ReferralPage(page);
    await referralPage.openVisitReferral(visitId);
    console.log(`[Test] ✅ Referral form opened for visit ${visitId}`);

    // =========================================================================
    // 3. Fill the form section by section
    // =========================================================================
    console.log('\n📋 Step 2: Fill the Referral form section by section...');
    await referralPage.fillReferralForm(data);
    console.log('[Test] ✅ Referral form filled');

    // =========================================================================
    // 4. Save the form
    // =========================================================================
    console.log('\n📋 Step 3: Save the Referral form...');
    const rowId = await referralPage.saveReferral();
    expect(rowId).toBeTruthy();
    console.log(`[Test] ✅ Referral saved — row_id: "${rowId}"`);

    // =========================================================================
    // 5. Verify the filled values persisted (post-save readback)
    // =========================================================================
    console.log('\n📋 Step 4: Verify saved values persisted...');
    await referralPage.verifySavedValues(data);
    console.log('[Test] ✅ Saved values persisted after the save round-trip');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ REFERRAL CREATED & SAVED SUCCESSFULLY');
    console.log(`  ✅ Visit ID:    ${visitId}`);
    console.log(`  ✅ Record row_id: "${rowId}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
