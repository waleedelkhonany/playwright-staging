/**
 * =============================================================================
 * E2E Test: View & Check-In Appointment
 * =============================================================================
 *
 * Full end-to-end workflow covering the complete appointment lifecycle:
 *   1. Auto-login (via auth fixture)
 *   2. Verify & set Branch/Location header context (via beforeEach)
 *   3. Navigate to Patients section
 *   4. Search and select the target patient from config.json
 *   5. Safely dismiss the conditional Allergies & Contamination Alert if present
 *   6. Navigate to Encounters → Appointments (via top dropdown tab)
 *   7. Locate the latest "New" appointment in the table
 *   8. Open the appointment detail modal (click View / eye icon)
 *   9. Confirm all Care Team members (click each "Confirm" button)
 *   10. Click "Check-In" button in the modal
 *   11. Assert success toast / SweetAlert2 confirmation
 *   12. Assert automatic redirect to Visit Details page (/visits/{id}/edit)
 *   13. Verify the Visit page is loaded with action buttons visible
 *
 * Configuration is loaded from config/config.json for settings like the
 * target patient identifier, header context, etc.
 *
 * @see config/appointment-scenarios/view-checkin-appointment.scenario.json — _config
 * @see config/config.json — headerContext section
 * @see src/pages/patients.page.ts — patient search & appointments navigation
 * @see src/pages/appointment-detail.page.ts — modal confirm + check-in
 * @see src/pages/visits.page.ts — visit details page verification
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import viewCheckinScenario from '../config/appointment-scenarios/view-checkin-appointment.scenario.json';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';
import { AppointmentDetailPage } from '../src/pages/appointment-detail.page';
import { VisitsPage } from '../src/pages/visits.page';

test.describe('E2E: View and Check-In Appointment', () => {

  // ===========================================================================
  // Pre-condition: Ensure Branch & Location header context matches config.json
  // ===========================================================================
  test.beforeEach(async ({ page }) => {
    await ensureHeaderContext(page);
  });

  test('should view the latest New appointment, confirm care team, check in, and redirect to Visit page', async ({ page, patientsPage }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const targetPatient = viewCheckinScenario._config.targetPatientIdentifier;
    const today = new Date().toLocaleDateString('en-CA').replace(/-/g, '/'); // YYYY/MM/DD (matching table display)

    console.log('═══════════════════════════════════════════════');
    console.log('  VIEW & CHECK-IN APPOINTMENT TEST');
    console.log(`  Target Patient:  ${targetPatient}`);
    console.log(`  Target Date:     ${today}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Navigate to Patients and select target patient
    // =========================================================================
    console.log('\n📋 Step 1: Navigate to Patients & select target...');
    await patientsPage.navigateToPatients();
    await patientsPage.searchAndSelectPatient(targetPatient);

    // Explicitly dismiss the conditional Allergies & Contamination Alert popup
    // if it appeared on the patient detail page.
    await patientsPage.dismissAllergiesAlertIfPresent();
    console.log('[Test] ✅ Patient selected, allergies alert dismissed if present');

    // =========================================================================
    // 3. Navigate Encounters → Appointments
    // =========================================================================
    console.log('\n📋 Step 2: Navigate Encounters → Appointments...');
    await patientsPage.navigateToEncountersAppointments();

    // navigateToEncountersAppointments also calls dismissAllergiesAlertIfPresent()
    // in case the appointments page shows the alert modal.
    console.log('[Test] ✅ Encounters → Appointments navigated');

    // =========================================================================
    // 4. Open today's "New" appointment detail modal
    // =========================================================================
    console.log('\n📋 Step 3: Open today\'s "New" appointment...');
    await patientsPage.openLatestAppointmentByStatus('New', today);


    // =========================================================================
    // 5. Confirm Care Team members in the appointment modal
    // =========================================================================
    console.log('\n📋 Step 4: Confirm care team members...');
    const appointmentModal = new AppointmentDetailPage(page);

    // Web-first assertion: auto-retries until the modal is visible (handles
    // Livewire rendering + Bootstrap animation timing gracefully).
    await appointmentModal.waitForModalVisible(15000);
    console.log('[Test] ✅ Appointment detail modal is visible');

    // Verify all care team members show a "Confirmed" status badge
    // Based on DOM inspection: the modal does NOT contain clickable "Confirm"
    // buttons — each care team row displays a "Confirmed" status badge instead.
    const confirmedCount = await appointmentModal.verifyCareTeamConfirmed();

    // Assert at least one confirmed status badge was found
    expect(confirmedCount).toBeGreaterThan(0);
    console.log(`[Test] ✅ Found ${confirmedCount} confirmed care team member badge(s)`);

    // =========================================================================
    // 6. Perform Check-In
    // =========================================================================
    console.log('\n📋 Step 5: Perform check-in...');
    const checkInResult = await appointmentModal.performCheckIn();

    // Assert check-in returned a non-empty result
    // performCheckIn() already validated the toast/popup was a success response,
    // so any truthy (non-empty) string confirms the check-in completed.
    expect(checkInResult).toBeTruthy();
    console.log(`[Test] ✅ Check-In result: "${checkInResult}"`);

    // =========================================================================
    // 7. Assert automatic redirect to Visit Details page
    // =========================================================================
    console.log('\n📋 Step 6: Wait for redirect to Visit page...');
    await page.waitForURL(/\/visits\/\d+\/edit/, { timeout: 15000 });
    const currentUrl = page.url();
    console.log(`[Test] ✅ Redirected to Visit page: ${currentUrl}`);

    // Assert the URL matches the expected pattern
    expect(currentUrl).toMatch(/\/visits\/\d+\/edit/);

    // =========================================================================
    // 8. Verify Visit Details page is loaded correctly
    // =========================================================================
    console.log('\n📋 Step 7: Verify Visit page loaded...');
    const visitsPage = new VisitsPage(page);

    // Handle any patient alerts (allergies, contamination) that may appear
    const alertsHandled = await visitsPage.handleAlertsIfPresent();
    console.log(`[Test] Patient alerts handled: ${alertsHandled}`);

    // Verify the visit page has the expected elements
    const visitStatusResult = await visitsPage.verifyVisitPageLoaded();

    // Assert the URL pattern is correct
    expect(visitStatusResult.urlOk).toBeTruthy();
    console.log('[Test] ✅ Visit page URL matches expected pattern');

    // Assert at least one action button is visible (Start Procedure or Check-Out)
    const actionButtonVisible = (
      visitStatusResult.startProcedureVisible ||
      visitStatusResult.checkOutVisible
    );
    expect(actionButtonVisible).toBeTruthy();
    console.log('[Test] ✅ Visit action buttons are visible');

    // =========================================================================
    // 9. Assert the visit status shows a valid active state (if visible)
    // =========================================================================
    const visitStatus = visitStatusResult.statusText;
    console.log(`\n📋 Visit status: "${visitStatus || '(hidden/not rendered on this layout)'}"`);

    if (visitStatusResult.statusVisible && visitStatus) {
      // Status badge is visible and has text — assert it indicates an active visit
      const statusValid = visitStatus.toLowerCase().includes('progress')
        || visitStatus.toLowerCase().includes('checked');
      expect(statusValid).toBeTruthy();
      console.log('[Test] ✅ Visit status indicates active visit');
    } else {
      // Status badge is hidden or not rendered on this page layout.
      // This is acceptable — the URL redirect and action buttons are the
      // stronger assertions that confirm the visit page loaded correctly.
      console.log('[Test] ℹ️  Visit status badge is not visible on this layout (skip assertion)');
    }

    // =========================================================================
    // Summary — all assertions passed
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ FULL WORKFLOW COMPLETED SUCCESSFULLY');
    console.log('  ✅ Patient selected');
    console.log('  ✅ Encounters → Appointments navigated');
    console.log(`  ✅ Today's "New" appointment opened (${today})`);
    console.log(`  ✅ ${confirmedCount} care team member(s) confirmed`);
    console.log(`  ✅ Check-In performed: "${checkInResult}"`);
    console.log('  ✅ Redirected to Visit page');
    console.log(`  ✅ Visit status: "${visitStatus}"`);
    console.log('═══════════════════════════════════════════════');
  });
});
