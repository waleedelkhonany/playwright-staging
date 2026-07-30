/**
 * =============================================================================
 * Combined E2E Test: Create → View → Confirm → Check-In Appointment
 * =============================================================================
 *
 * Single end-to-end test covering the complete appointment lifecycle:
 *   1. Auto-login (via auth fixture)
 *   2. Verify & set Branch/Location header context (via beforeEach)
 *   3. Navigate to Patients section
 *   4. Search and select the target patient from config.json
 *   5. Create a new appointment with dynamic data (Faker-generated)
 *   6. Navigate to Encounters → Appointments (via top dropdown tab)
 *   7. Locate the latest "New" appointment in the table (with pagination support)
 *   8. Open the appointment detail modal (click View / eye icon)
 *   9. Confirm all Care Team members (click each "Confirm" button, or bulk)
 *   10. Verify "Confirmed" status badges appear
 *   11. Click "Check-In" button in the modal
 *   12. Assert success toast / SweetAlert2 confirmation
 *   13. Assert automatic redirect to Visit Details page (/visits/{id}/edit)
 *   14. Verify the Visit page is loaded with action buttons visible
 *
 * This combined test eliminates the need to pre-seed a "New" appointment —
 * it creates one fresh within the same test run.
 *
 * Configuration is loaded from config/config.json for settings like the
 * target patient identifier, visit type, header context, etc.
 *
 * @see config/appointment.config.json — appointment settings (targetPatientIdentifier)
 * @see config/config.json — headerContext section
 * @see src/pages/patients.page.ts — patient search & appointments navigation
 * @see src/pages/appointment-detail.page.ts — modal confirm + check-in
 * @see src/pages/visits.page.ts — visit details page verification
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { getAppointmentData } from '../src/helpers/appointment-data.loader';
import fullScenario from '../config/appointment-scenarios/full-appointment.scenario.json';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';
import { AppointmentDetailPage } from '../src/pages/appointment-detail.page';
import { VisitsPage } from '../src/pages/visits.page';

test.describe('E2E: Create → View → Check-In Appointment', () => {

  // ===========================================================================
  // Pre-condition: Ensure Branch & Location header context matches config.json
  // ===========================================================================
  test.beforeEach(async ({ page }) => {
    await ensureHeaderContext(page);
  });

  test('should create an appointment, view it, confirm care team, check in, and redirect to Visit page', async ({ page, patientsPage }) => {
    // =========================================================================
    // 1. Load configurable test parameters and generate appointment data from JSON
    // =========================================================================
    const targetPatient = fullScenario._config.targetPatientIdentifier;
    const appointment = getAppointmentData('full-appointment.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  COMBINED APPOINTMENT LIFECYCLE TEST');
    console.log(`  Target Patient:  ${targetPatient}`);
    console.log(`  Visit Type:      ${appointment.visitType}`);
    console.log(`  Appointment Date: ${appointment.appointmentDate}`);
    console.log(`  Appointment Time: ${appointment.appointmentTime}`);
    console.log(`  End Time:         ${appointment.endTime}`);
    console.log(`  Notes:            ${appointment.notes}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. Navigate to Patients & select target patient
    // =========================================================================
    console.log('\n📋 Step 1: Navigate to Patients & select target...');
    await patientsPage.navigateToPatients();
    await patientsPage.searchAndSelectPatient(targetPatient);

    // Explicitly dismiss the conditional Allergies & Contamination Alert popup
    // if it appeared on the patient detail page.
    await patientsPage.dismissAllergiesAlertIfPresent();
    console.log('[Test] ✅ Patient selected, allergies alert dismissed if present');

    // =========================================================================
    // 3. Create a new appointment
    // =========================================================================
    console.log('\n📋 Step 2: Create a new appointment...');
    await patientsPage.clickCreateAppointment();
    await patientsPage.fillAppointmentForm(appointment);
    const createResult = await patientsPage.saveAppointment();

    // Assert the appointment was created successfully
    expect(createResult).toBeTruthy();
    console.log(`[Test] ✅ Appointment created successfully: "${createResult}"`);

    // =========================================================================
    // 4. Navigate Encounters → Appointments
    // =========================================================================
    console.log('\n📋 Step 3: Navigate Encounters → Appointments...');
    await patientsPage.navigateToEncountersAppointments();

    console.log('[Test] ✅ Encounters → Appointments navigated');

    // =========================================================================
    // 5. Open the latest "New" appointment detail modal
    // =========================================================================
    console.log('\n📋 Step 4: Open latest "New" appointment...');
    await patientsPage.openLatestAppointmentByStatus('New');

    // =========================================================================
    // 6. Confirm Care Team members in the appointment modal
    // =========================================================================
    console.log('\n📋 Step 5: Confirm care team members...');
    const appointmentModal = new AppointmentDetailPage(page);

    // Web-first assertion: auto-retries until the modal is visible
    await appointmentModal.waitForModalVisible(15000);
    console.log('[Test] ✅ Appointment detail modal is visible');

    // Verify all care team members show a "Confirmed" status badge
    // Handles both bulk "Confirm Appointment" button and individual buttons.
    const confirmedCount = await appointmentModal.verifyCareTeamConfirmed();

    // Assert at least one confirmed status badge was found
    expect(confirmedCount).toBeGreaterThan(0);
    console.log(`[Test] ✅ Found ${confirmedCount} confirmed care team member badge(s)`);

    // =========================================================================
    // 7. Perform Check-In
    // =========================================================================
    console.log('\n📋 Step 6: Perform check-in...');
    const checkInResult = await appointmentModal.performCheckIn();

    // Assert check-in returned a non-empty result
    expect(checkInResult).toBeTruthy();
    console.log(`[Test] ✅ Check-In result: "${checkInResult}"`);

    // =========================================================================
    // 8. Assert automatic redirect to Visit Details page
    // =========================================================================
    console.log('\n📋 Step 7: Wait for redirect to Visit page...');
    await page.waitForURL(/\/visits\/\d+\/edit/, { timeout: 15000 });
    const currentUrl = page.url();
    console.log(`[Test] ✅ Redirected to Visit page: ${currentUrl}`);

    // Assert the URL matches the expected pattern
    expect(currentUrl).toMatch(/\/visits\/\d+\/edit/);

    // =========================================================================
    // 9. Verify Visit Details page is loaded correctly
    // =========================================================================
    console.log('\n📋 Step 8: Verify Visit page loaded...');
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
    // 10. Assert the visit status shows a valid active state (if visible)
    // =========================================================================
    const visitStatus = visitStatusResult.statusText;
    console.log(`\n📋 Visit status: "${visitStatus || '(hidden/not rendered on this layout)'}"`);

    if (visitStatusResult.statusVisible && visitStatus) {
      const statusValid = visitStatus.toLowerCase().includes('progress')
        || visitStatus.toLowerCase().includes('checked');
      expect(statusValid).toBeTruthy();
      console.log('[Test] ✅ Visit status indicates active visit');
    } else {
      console.log('[Test] ℹ️  Visit status badge is not visible on this layout (skip assertion)');
    }

    // =========================================================================
    // Summary — all assertions passed
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ FULL LIFECYCLE COMPLETED SUCCESSFULLY');
    console.log('  ✅ Patient selected');
    console.log(`  ✅ Appointment created: "${createResult}"`);
    console.log('  ✅ Encounters → Appointments navigated');
    console.log(`  ✅ Latest "New" appointment opened`);
    console.log(`  ✅ ${confirmedCount} care team member(s) confirmed`);
    console.log(`  ✅ Check-In performed: "${checkInResult}"`);
    console.log('  ✅ Redirected to Visit page');
    console.log('  ✅ Visit action buttons visible');
    console.log('═══════════════════════════════════════════════');
  });
});
