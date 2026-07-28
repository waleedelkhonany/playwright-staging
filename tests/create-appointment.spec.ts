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
 *   7. Select the Visit Type from config.json
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
 * @see config/config.json — appointment section
 * @see config/config.json — headerContext section
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { buildAppointment } from '../src/data/appointment.data';
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
    const defaultVisitType = config.appointment.visitType;

    console.log('═══════════════════════════════════════════════');
    console.log('  APPOINTMENT TEST CONFIGURATION');
    console.log(`  Target Patient:  ${targetPatient}`);
    console.log(`  Visit Type:      ${defaultVisitType}`);
    console.log('═══════════════════════════════════════════════');

    // -----------------------------------------------------------------------
    // 2. Generate dynamic appointment data using Faker
    //    Uses config.json visit type by default, but can be overridden.
    // -----------------------------------------------------------------------
    const appointment = buildAppointment();

    console.log(`  Appointment Date: ${appointment.appointmentDate}`);
    console.log(`  Appointment Time: ${appointment.appointmentTime}`);
    console.log(`  Duration:         ${appointment.durationMinutes} min`);
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

  // test('should create an appointment with minimal required fields', async ({ patientsPage }) => {
  //   // -----------------------------------------------------------------------
  //   // 1. Use config values for target patient and visit type
  //   // -----------------------------------------------------------------------
  //   const targetPatient = config.appointment.targetPatientIdentifier;

  //   // Minimal appointment: only visit type and date (no time/notes/duration)
  //   const appointment = buildAppointment({
  //     appointmentTime: undefined,
  //     notes: undefined,
  //     durationMinutes: undefined,
  //   });

  //   console.log('═══════════════════════════════════════════════');
  //   console.log('  MINIMAL APPOINTMENT TEST');
  //   console.log(`  Patient:   ${targetPatient}`);
  //   console.log(`  Visit:     ${appointment.visitType}`);
  //   console.log(`  Date:      ${appointment.appointmentDate}`);
  //   console.log('═══════════════════════════════════════════════\\n');

  //   // -----------------------------------------------------------------------
  //   // 2. Execute workflow
  //   // -----------------------------------------------------------------------
  //   await patientsPage.navigateToPatients();
  //   const successMessage = await patientsPage.createAppointment(
  //     targetPatient,
  //     appointment,
  //   );

  //   // -----------------------------------------------------------------------
  //   // 3. Assert
  //   // -----------------------------------------------------------------------
  //   expect(successMessage).toBeTruthy();
  //   console.log(`\n✅ Minimal appointment created: "${successMessage}"`);
  // });

  // test('should create an appointment with a different visit type', async ({ patientsPage }) => {
  //   // -----------------------------------------------------------------------
  //   // 1. Use config target patient but override to a different valid visit type
  //   // -----------------------------------------------------------------------
  //   const targetPatient = config.appointment.targetPatientIdentifier;

  //   // Override to a different valid visit type from the actual dropdown
  //   const appointment = buildAppointment({ visitType: 'Social Worker Visit' });

  //   console.log('═══════════════════════════════════════════════');
  //   console.log('  ALTERNATE VISIT TYPE TEST');
  //   console.log(`  Patient:   ${targetPatient}`);
  //   console.log(`  Visit:     ${appointment.visitType}`);
  //   console.log(`  Date:      ${appointment.appointmentDate}`);
  //   console.log(`  Time:      ${appointment.appointmentTime}`);
  //   console.log('═══════════════════════════════════════════════\\n');

  //   // -----------------------------------------------------------------------
  //   // 2. Execute workflow
  //   // -----------------------------------------------------------------------
  //   await patientsPage.navigateToPatients();
  //   const successMessage = await patientsPage.createAppointment(
  //     targetPatient,
  //     appointment,
  //   );

  //   // -----------------------------------------------------------------------
  //   // 3. Assert
  //   // -----------------------------------------------------------------------
  //   expect(successMessage).toBeTruthy();
  //   console.log(`\n✅ Alternate visit type appointment created: "${successMessage}"`);
  // });
});
