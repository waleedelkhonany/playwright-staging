/**
 * =============================================================================
 * Comprehensive E2E Test: Create a Patient Appointment
 * =============================================================================
 *
 * Single end-to-end test covering the complete happy path:
 *   1. Auto-login (via auth fixture)
 *   2. ⚠️  Mandatory: Verify & set Branch/Location header context (via beforeEach)
 *   3. Navigate to Patients section
 *   4. Search for a target patient using the identifier from config.json
 *   5. Click the patient's name to open their detail/profile page
 *   6. Click "Create Appointment" button
 *   7. Select the Visit Type from the scenario file
 *   8. Fill in dynamically generated appointment details (date, time, notes, etc.)
 *   9. Click Save
 *   10. Verify success message/toast appears
 *
 * Configuration is loaded from config/config.json so settings like the
 * target patient and visit type can be updated without modifying the test code.
 *
 * Pre-test Header Context Verification:
 *   Every test in this suite explicitly verifies and ensures the Branch and
 *   Location match config.json headerContext targets. If the current UI state
 *   does not match, the test automatically switches before proceeding.
 *
 * @see config/config.json — appointment.targetPatientIdentifier, appointment.visitType
 * @see config/config.json — headerContext section
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { getAppointmentData } from '../src/helpers/appointment-data.loader';
import config from '../config/config.json';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';

test.describe('E2E: Create Patient Appointment', () => {

  // ---------------------------------------------------------------------------
  // Mandatory Pre-test: Verify & set header context before every test
  // ---------------------------------------------------------------------------
  test.beforeEach(async ({ page }) => {
    // Reads targetBranch + targetLocation from config.json
    // Checks current header values; switches any that don't match
    await ensureHeaderContext(page);
  });

  test('should create an appointment for a patient end-to-end', async ({ patientsPage }) => {
    // -----------------------------------------------------------------------
    // 1. Load configurable test parameters
    // -----------------------------------------------------------------------
    const targetPatient = config.appointment.targetPatientIdentifier;
    // Visit type comes from config.json (appointment.visitType) — the single
    // source of truth shared by every appointment test.
    const visitType = config.appointment.visitType;

    console.log('═══════════════════════════════════════════════');
    console.log('  APPOINTMENT TEST CONFIGURATION');
    console.log(`  Target Patient:  ${targetPatient}`);
    console.log(`  Visit Type:      ${visitType}`);
    console.log('═══════════════════════════════════════════════');

    // -----------------------------------------------------------------------
    // 2. Generate appointment data from scenario file
    //    'DYNAMIC' fields produce fresh random values each run.
    // -----------------------------------------------------------------------
    const appointment = getAppointmentData('full-appointment.scenario.json', { visitType });

    console.log(`  Visit Type:       ${appointment.visitType}`);
    console.log(`  Appointment Date: ${appointment.appointmentDate}`);
    console.log(`  Appointment Time: ${appointment.appointmentTime}`);
    console.log(`  End Time:         ${appointment.endTime}`);
    console.log(`  Notes:            ${appointment.notes}`);
    console.log('═══════════════════════════════════════════════\\n');

    // -----------------------------------------------------------------------
    // 3. Execute the full create-appointment workflow
    //    - Navigate to Patients page
    //    - Search and select the target patient
    //    - Click "Create Appointment"
    //    - Fill the form with dynamic data
    //    - Save
    // -----------------------------------------------------------------------
    await patientsPage.navigateToPatients();
    const successMessage = await patientsPage.createAppointment(
      targetPatient,
      appointment,
    );

    // -----------------------------------------------------------------------
    // 4. Assert — verify success toast/notification
    // -----------------------------------------------------------------------
    expect(successMessage).toBeTruthy();
    console.log(`\n✅ Appointment created successfully: "${successMessage}"`);
  });

    // =========================================================================
    // Custom Scenario: Morning appointment with fixed time slot
    // =========================================================================

    test('should create a morning appointment with a fixed 09:00 time slot', async ({ patientsPage }) => {
      // -----------------------------------------------------------------------
      // 1. Load configurable test parameters
      // -----------------------------------------------------------------------
      const targetPatient = config.appointment.targetPatientIdentifier;
      // Visit type comes from config.json (appointment.visitType) — the single
      // source of truth shared by every appointment test.
      const visitType = config.appointment.visitType;

      // -----------------------------------------------------------------------
      // 2. Generate appointment data from the morning-scenario JSON file
      //    - visitType:     config.json → appointment.visitType (single source)
      //    - appointmentTime: "09:00" (static morning slot)
      //    - endTime:       "10:00" (static, 1-hour slot)
      //    - appointmentDate: {{future_date}} (dynamic, random future date)
      //    - notes:         DYNAMIC (random sentence each run)
      // -----------------------------------------------------------------------
      const appointment = getAppointmentData('morning-appointment.scenario.json', { visitType });

      console.log('═══════════════════════════════════════════════');
      console.log('  MORNING APPOINTMENT SCENARIO');
      console.log(`  Target Patient:  ${targetPatient}`);
      console.log(`  Visit Type:      ${appointment.visitType}`);
      console.log(`  Appointment Date: ${appointment.appointmentDate}`);
      console.log(`  Appointment Time: ${appointment.appointmentTime}`);
      console.log(`  End Time:         ${appointment.endTime}`);
      console.log(`  Notes:            ${appointment.notes}`);
      console.log('═══════════════════════════════════════════════\\n');

      // -----------------------------------------------------------------------
      // 3. Execute the full create-appointment workflow
      // -----------------------------------------------------------------------
      await patientsPage.navigateToPatients();
      const successMessage = await patientsPage.createAppointment(
        targetPatient,
        appointment,
      );

      // -----------------------------------------------------------------------
      // 4. Assert — verify success toast/notification
      // -----------------------------------------------------------------------
      expect(successMessage).toBeTruthy();
      console.log(`\n✅ Morning appointment created: "${successMessage}"`);
    });

    // =========================================================================
    // Minimal Required Fields
    // =========================================================================

    test('should create an appointment with minimal required fields only', async ({ patientsPage }) => {
      const targetPatient = config.appointment.targetPatientIdentifier;
      // Visit type comes from config.json (appointment.visitType) — the single
      // source of truth shared by every appointment test.
      const visitType = config.appointment.visitType;
      const appointment = getAppointmentData('minimal-appointment.scenario.json', { visitType });

      console.log('═══════════════════════════════════════════════');
      console.log('  MINIMAL APPOINTMENT TEST');
      console.log(`  Patient:   ${targetPatient}`);
      console.log(`  Visit:     ${appointment.visitType}`);
      console.log(`  Date:      ${appointment.appointmentDate}`);
      console.log('═══════════════════════════════════════════════\\n');

      await patientsPage.navigateToPatients();
      const successMessage = await patientsPage.createAppointment(
        targetPatient,
        appointment,
      );

      expect(successMessage).toBeTruthy();
      console.log(`\n✅ Minimal appointment created: "${successMessage}"`);
    });
});
