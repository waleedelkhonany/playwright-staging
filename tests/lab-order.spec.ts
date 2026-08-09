/**
 * =============================================================================
 * E2E Test: Create a Lab Order (Physician Orders → Labs & Imaging)
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Verify & set Branch/Location header context (via beforeEach)
 *   3. Navigate to Patients and select the target patient from config.json
 *   4. Open the Physician Orders → Labs & Imaging tab (?tab=lab_orders) —
 *      the "Create Lab Order" form renders directly on the tab (no modal)
 *   5. Pick the Lab Company, collection-by, due date, free text, and a
 *      Lab Test from the first test row's "Search Lab Test" Tom Select
 *   6. Add a second test row (wire:click="addTest") and pick a second Lab Test
 *   7. Save the order (wire:click="update")
 *   8. Assert a new order row appears at the top of the lab orders table
 *      (order number increased, today's created date, Pending status)
 *
 * The target patient identifier is read from config/config.json
 * (appointment.targetPatientIdentifier) — the single source of truth used by
 * every appointment/order test.
 *
 * @see config/config.json — appointment.targetPatientIdentifier
 * @see config/physician-order-scenarios/lab-order.scenario.json — form payload
 * @see src/pages/physician-orders.page.ts — Physician Orders page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';
import { PhysicianOrdersPage } from '../src/pages/physician-orders.page';
import { getLabOrderData } from '../src/helpers/lab-order-data.loader';

test.describe('E2E: Create Lab Order', () => {

  // ===========================================================================
  // Pre-condition: Ensure Branch & Location header context matches config.json
  // ===========================================================================
  test.beforeEach(async ({ page }) => {
    await ensureHeaderContext(page);
  });

  test('should create a Lab Order for the target patient end-to-end', async ({ page, patientsPage }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const targetPatient = config.appointment.targetPatientIdentifier;
    // Form payload from the scenario JSON (config/physician-order-scenarios/)
    const order = getLabOrderData('lab-order.scenario.json');
    // The lab orders table shows created dates as YYYY/MM/DD (e.g. "2026/08/09").
    // Format in the app's timezone (Asia/Riyadh — see playwright.config.ts) so
    // the assertion is correct even near midnight when Node's local tz differs.
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
    }).format(new Date()).replace(/-/g, '/'); // YYYY/MM/DD (Asia/Riyadh)

    console.log('═══════════════════════════════════════════════');
    console.log('  LAB ORDER TEST');
    console.log(`  Target Patient:  ${targetPatient}`);
    console.log(`  Lab Company:     ${order.labCompany}`);
    console.log(`  Lab Test 1:      ${order.labTest} (row 0)`);
    console.log(`  Lab Test 2:      ${order.labTest2} (row 1, via Add)`);
    console.log(`  Collection By:   ${order.collectionBy}`);
    console.log(`  Due Date:        ${order.dueDate}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Navigate to Patients & select the target patient
    // =========================================================================
    console.log('\n📋 Step 1: Navigate to Patients & select target...');
    await patientsPage.navigateToPatients();
    await patientsPage.searchAndSelectPatient(targetPatient);
    console.log('[Test] ✅ Patient selected');

    // =========================================================================
    // 3. Open Physician Orders → Labs & Imaging (Create Lab Order form)
    // =========================================================================
    console.log('\n📋 Step 2: Open Physician Orders → Labs & Imaging...');
    const physicianOrdersPage = new PhysicianOrdersPage(page);
    await physicianOrdersPage.openLabOrderTab();
    console.log('[Test] ✅ Lab Order form opened');

    // =========================================================================
    // 4. Record the current newest order number (deterministic verification)
    // =========================================================================
    const beforeRow = await physicianOrdersPage.getNewestLabOrderRow();
    const beforeNumber = parseInt(beforeRow, 10) || 0;
    // Guard: a 0 baseline would let the post-save poll pass trivially on any
    // pre-existing order, masking a failed save.
    expect(beforeNumber).toBeGreaterThan(0);
    console.log(`[Test] ℹ️  Newest order before save: #${beforeNumber}`);

    // =========================================================================
    // 5. Fill the form
    // =========================================================================
    console.log('\n📋 Step 3: Fill the Lab Order form (two test rows)...');
    await physicianOrdersPage.fillLabOrderForm(order);
    console.log('[Test] ✅ Lab Order form filled (2 Lab Tests)');

    // =========================================================================
    // 6. Save the order
    // =========================================================================
    console.log('\n📋 Step 4: Save the Lab Order...');
    const saveResult = await physicianOrdersPage.saveLabOrder();
    expect(saveResult).toBeTruthy();
    console.log(`[Test] ✅ Order saved: "${saveResult}"`);

    // =========================================================================
    // 7. Assert a NEW order appeared in the orders table (Livewire reloads the
    //    table after save, so poll until the newest order number increases)
    // =========================================================================
    console.log('\n📋 Step 5: Verify new order in the table...');
    await expect.poll(async () => {
      const row = await physicianOrdersPage.getNewestLabOrderRow();
      return parseInt(row, 10) || 0;
    }, { timeout: 30000, intervals: [2000, 2000, 3000, 5000] })
      .toBeGreaterThan(beforeNumber);

    const newestRow = await physicianOrdersPage.getNewestLabOrderRow();
    const newestNumber = parseInt(newestRow, 10) || 0;
    expect(newestNumber).toBeGreaterThan(beforeNumber);
    expect(newestRow).toContain(today);
    expect(newestRow.toLowerCase()).toContain('pending');
    console.log(`[Test] ✅ Newest order row: "${newestRow}"`);

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ LAB ORDER CREATED SUCCESSFULLY');
    console.log(`  ✅ Patient: ${targetPatient}`);
    console.log(`  ✅ Lab Company: ${order.labCompany}`);
    console.log(`  ✅ Lab Tests: ${order.labTest} + ${order.labTest2}`);
    console.log(`  ✅ Save result: "${saveResult}"`);
    console.log(`  ✅ Table row: "${newestRow}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
