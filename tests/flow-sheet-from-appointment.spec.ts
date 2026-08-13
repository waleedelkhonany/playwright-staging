/**
 * =============================================================================
 * E2E Test: Create Appointment → Check-In → Fill Flow Sheet (end-to-end)
 * =============================================================================
 *
 * Full lifecycle test that chains the appointment creation, check-in, and
 * Flow Sheet filling workflows into one end-to-end scenario:
 *   1. Auto-login (via auth fixture) + Branch/Location header context
 *   2. Create an appointment for the target patient
 *      (config/appointment-scenarios/full-appointment.scenario.json) whose
 *      visit type comes from config.json (appointment.visitType — must be a
 *      "Treatment Nurse Visit" for the Flow Sheet to apply)
 *   3. Navigate to Encounters → Appointments and open the appointment just
 *      created (row filtered by status "New" + today's date + visit type)
 *   4. Confirm the care team (no-op if the appointment has no staff) and
 *      check the appointment in
 *   5. Land on the Visit Details page (/visits/{id}/edit) — "view visit"
 *   6. Open the "Flow Sheet" tab and fill the form section by section
 *      (config/flow-sheet-scenarios/flow-sheet.scenario.json)
 *   7. Save and verify representative values persisted
 *
 * Configuration is loaded from config/config.json:
 *   - appointment.targetPatientIdentifier → patient to create the appointment for
 *   - appointment.visitType               → appointment/visit type (single source)
 *   - headerContext                       → Branch/Location to ensure before the test
 *
 * @see config/config.json — appointment.targetPatientIdentifier, appointment.visitType, headerContext
 * @see config/appointment-scenarios/full-appointment.scenario.json — appointment form payload
 * @see config/flow-sheet-scenarios/flow-sheet.scenario.json — flow sheet form payload
 * @see src/pages/patients.page.ts — patient search, appointment creation, Encounters navigation
 * @see src/pages/appointment-detail.page.ts — care team confirm + check-in
 * @see src/pages/visits.page.ts — visit page verification & alert dismissal
 * @see src/pages/flow-sheet.page.ts — Flow Sheet tab, fill, save, verify
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';
import { getAppointmentData } from '../src/helpers/appointment-data.loader';
import { getFlowSheetData } from '../src/helpers/flow-sheet-data.loader';
import { AppointmentDetailPage } from '../src/pages/appointment-detail.page';
import { VisitsPage } from '../src/pages/visits.page';
import { FlowSheetPage } from '../src/pages/flow-sheet.page';

test.describe('E2E: Create Appointment → Check-In → Fill Flow Sheet', () => {

  // Appointment creation + check-in + the heavy Livewire Flow Sheet form
  // (hundreds of controls, per-field settle waits) easily exceed the global
  // 60s default — raise the per-test timeout (same rationale as
  // flow-sheet.spec.ts and physician-orders.spec.ts).
  test.setTimeout(240_000);

  // Appointment creation depends on the Branch/Location context matching
  // config.json (same as create-appointment.spec.ts).
  test.beforeEach(async ({ page }) => {
    await ensureHeaderContext(page);
  });

  test('should create the appointment, check it in, and fill the Flow Sheet end-to-end', async ({ page, patientsPage }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const targetPatient = config.appointment.targetPatientIdentifier;
    // The appointment type is driven by config.json — the Flow Sheet only
    // applies to "Treatment Nurse Visit" appointments, so this is the single
    // place to change it (appointment.visitType is the shared source for all
    // appointment tests).
    const visitType = config.appointment.visitType;
    // Table display format for the date filter (YYYY/MM/DD)
    const today = new Date().toLocaleDateString('en-CA').replace(/-/g, '/');

    // Appointment payload — visitType override comes from config.json.
    // Date/time default to today/now (needed for check-in to start the visit).
    const appointment = getAppointmentData('full-appointment.scenario.json', { visitType });
    // Flow Sheet payload from the scenario JSON.
    const flowSheet = getFlowSheetData('flow-sheet.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  APPOINTMENT → FLOW SHEET TEST');
    console.log(`  Target Patient: ${targetPatient}`);
    console.log(`  Visit Type:     ${visitType}`);
    console.log(`  Appointment:    ${appointment.appointmentDate} ${appointment.appointmentTime}`);
    console.log(`  Pain Rating:    ${flowSheet.painRating}`);
    console.log(`  Fall Risk Score: ${flowSheet.fallRiskScore}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Navigate to Patients & create the appointment for the selected patient
    // =========================================================================
    console.log('\n📋 Step 1: Navigate to Patients & create appointment...');
    await patientsPage.navigateToPatients();
    const successMessage = await patientsPage.createAppointment(targetPatient, appointment);
    expect(successMessage).toBeTruthy();
    console.log(`[Test] ✅ Appointment created (${visitType}): "${successMessage}"`);

    // =========================================================================
    // 3. Encounters → Appointments → open the appointment just created
    // =========================================================================
    console.log('\n📋 Step 2: Navigate Encounters → Appointments...');
    await patientsPage.navigateToEncountersAppointments();
    console.log('[Test] ✅ Encounters → Appointments navigated');

    console.log('\n📋 Step 3: Open today\'s "New" appointment...');
    await patientsPage.openLatestAppointmentByStatus('New', today, visitType);
    console.log(`[Test] ✅ Opened "${visitType}" appointment for ${today}`);

    // =========================================================================
    // 4. Confirm care team & check in
    // =========================================================================
    console.log('\n📋 Step 4: Confirm care team & check in...');
    const appointmentModal = new AppointmentDetailPage(page);
    await appointmentModal.waitForModalVisible(15000);
    console.log('[Test] ✅ Appointment detail modal is visible');

    // Newly created appointments have no assigned staff (assignedStaff is
    // optional in the scenario), so the care team may be empty and this is a
    // no-op returning 0 — the check-in below is the authoritative step.
    const confirmedCount = await appointmentModal.verifyCareTeamConfirmed();
    console.log(`[Test] ${confirmedCount > 0 ? '✅' : 'ℹ️'} ${confirmedCount} care team member(s) confirmed`);

    const checkInResult = await appointmentModal.performCheckIn();
    expect(checkInResult).toBeTruthy();
    console.log(`[Test] ✅ Check-In performed: "${checkInResult}"`);

    // =========================================================================
    // 5. View visit — wait for the redirect to the Visit Details page
    // =========================================================================
    console.log('\n📋 Step 5: Wait for redirect to Visit page...');
    await page.waitForURL(/\/visits\/\d+\/edit/, { timeout: 15000 });
    console.log(`[Test] ✅ Visit page: ${page.url()}`);

    const visitsPage = new VisitsPage(page);
    const alertsHandled = await visitsPage.handleAlertsIfPresent();
    console.log(`[Test] Patient alerts handled: ${alertsHandled}`);

    // =========================================================================
    // 6. Open the Flow Sheet tab of the visit
    // =========================================================================
    console.log('\n📋 Step 6: Open the Flow Sheet tab...');
    const flowSheetPage = new FlowSheetPage(page);
    await flowSheetPage.openFlowSheetTab();
    console.log('[Test] ✅ Flow Sheet tab opened');

    // =========================================================================
    // 7. Fill the form section by section
    // =========================================================================
    console.log('\n📋 Step 7: Fill the Flow Sheet form section by section...');
    await flowSheetPage.fillFlowSheetForm(flowSheet);
    console.log('[Test] ✅ Flow Sheet form filled');

    // =========================================================================
    // 8. Save the Flow Sheet
    // =========================================================================
    console.log('\n📋 Step 8: Save the Flow Sheet...');
    const saveResult = await flowSheetPage.saveFlowSheet();
    expect(saveResult.toLowerCase()).toContain('saved successfully');
    console.log(`[Test] ✅ Flow Sheet saved: "${saveResult}"`);

    // =========================================================================
    // 9. Verify the filled values persisted (server state after save)
    // =========================================================================
    console.log('\n📋 Step 9: Verify saved values persisted...');
    await flowSheetPage.verifySavedValues(flowSheet);
    console.log('[Test] ✅ Saved values persisted after the save round-trip');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ APPOINTMENT → FLOW SHEET COMPLETED SUCCESSFULLY');
    console.log(`  ✅ Patient:        ${targetPatient}`);
    console.log(`  ✅ Visit Type:     ${visitType}`);
    console.log(`  ✅ Check-In:       "${checkInResult}"`);
    console.log(`  ✅ Visit page:     ${page.url()}`);
    console.log(`  ✅ Save result:    "${saveResult}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
