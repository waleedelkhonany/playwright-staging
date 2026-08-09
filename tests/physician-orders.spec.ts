/**
 * =============================================================================
 * E2E Test: Create a Dialysis Order (Physician Orders → Dialysis Order)
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Verify & set Branch/Location header context (via beforeEach)
 *   3. Navigate to Patients and select the target patient from config.json
 *   4. Open the Physician Orders → Dialysis Order tab
 *   5. Click "Add New" to open the Dialysis Order creation modal
 *   6. Fill the "Dialysis Order Type" + "Additional Information" sections
 *   7. Save the order
 *   8. Assert a success confirmation appears
 *   9. Assert the new order shows up in the orders table (today's date, Pending)
 *
 * The target patient identifier is read from config/config.json
 * (appointment.targetPatientIdentifier) — the single source of truth used by
 * every appointment/order test.
 *
 * @see config/config.json — appointment.targetPatientIdentifier
 * @see config/physician-order-scenarios/dialysis-order.scenario.json — form payload
 * @see src/pages/physician-orders.page.ts — Physician Orders page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';
import { PhysicianOrdersPage } from '../src/pages/physician-orders.page';
import { getDialysisOrderData } from '../src/helpers/dialysis-order-data.loader';

test.describe('E2E: Create Dialysis Order', () => {

  // ===========================================================================
  // Pre-condition: Ensure Branch & Location header context matches config.json
  // ===========================================================================
  test.beforeEach(async ({ page }) => {
    await ensureHeaderContext(page);
  });

  test('should create a Dialysis Order for the target patient end-to-end', async ({ page, patientsPage }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const targetPatient = config.appointment.targetPatientIdentifier;
    // Form payload from the scenario JSON (config/physician-order-scenarios/)
    const order = getDialysisOrderData('dialysis-order.scenario.json');
    // The orders table shows dates as YYYY-MM-DD (e.g. "2026-08-09 16:59:23")
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)

    console.log('═══════════════════════════════════════════════');
    console.log('  DIALYSIS ORDER TEST');
    console.log(`  Target Patient:  ${targetPatient}`);
    console.log(`  Order Type:      ${order.orderType}`);
    console.log(`  Modality:        ${order.modality}`);
    console.log(`  Access:          ${order.vascularAccessType} / ${order.accessSite}`);
    console.log(`  Frequency:       ${order.frequency}`);
    console.log(`  Target Date:     ${today}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Navigate to Patients & select the target patient
    // =========================================================================
    console.log('\n📋 Step 1: Navigate to Patients & select target...');
    await patientsPage.navigateToPatients();
    await patientsPage.searchAndSelectPatient(targetPatient);
    console.log('[Test] ✅ Patient selected');

    // =========================================================================
    // 3. Open Physician Orders → Dialysis Order tab
    // =========================================================================
    console.log('\n📋 Step 2: Open Physician Orders → Dialysis Order...');
    const physicianOrdersPage = new PhysicianOrdersPage(page);
    await physicianOrdersPage.openDialysisOrderTab();
    console.log('[Test] ✅ Dialysis Order tab opened');

    // =========================================================================
    // 4. Open the Dialysis Order creation modal
    // =========================================================================
    console.log('\n📋 Step 3: Open the Dialysis Order modal (Add New)...');
    await physicianOrdersPage.openNewOrderModal();
    console.log('[Test] ✅ Dialysis Order modal is visible');

    // =========================================================================
    // 5. Fill the form
    // =========================================================================
    console.log('\n📋 Step 4: Fill the Dialysis Order form...');
    await physicianOrdersPage.fillDialysisOrderForm(order);
    console.log('[Test] ✅ Dialysis Order form filled');

    // =========================================================================
    // 6. Save the order
    // =========================================================================
    console.log('\n📋 Step 5: Save the Dialysis Order...');
    const saveResult = await physicianOrdersPage.saveDialysisOrder();
    expect(saveResult).toBeTruthy();
    console.log(`[Test] ✅ Order saved: "${saveResult}"`);

    // =========================================================================
    // 7. Assert the new order appears in the orders table
    // =========================================================================
    console.log('\n📋 Step 6: Verify order appears in the table...');
    const newestRow = await physicianOrdersPage.getNewestOrderRow();

    expect(newestRow).toContain(today);
    expect(newestRow.toLowerCase()).toContain('pending');
    console.log(`[Test] ✅ Newest order row: "${newestRow}"`);

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ DIALYSIS ORDER CREATED SUCCESSFULLY');
    console.log(`  ✅ Patient: ${targetPatient}`);
    console.log(`  ✅ Order Type: ${order.orderType}`);
    console.log(`  ✅ Save result: "${saveResult}"`);
    console.log(`  ✅ Table row: "${newestRow}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
