/**
 * =============================================================================
 * Appointment Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a merged appointment scenario JSON file from config/appointment-scenarios/
 * and resolves each _fields entry using the same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback value
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static hardcoded value)
 *
 * The target patient identifier is NOT read from scenario files — it lives in
 * config/config.json (appointment.targetPatientIdentifier) so every test uses
 * the same value. Scenario _config blocks hold remaining test parameters such
 * as defaultDurationMinutes.
 *
 * Usage in tests:
 *
 *   import config from '../../config/config.json';
 *   import { getAppointmentData } from '../helpers/appointment-data.loader';
 *
 *   const targetPatient = config.appointment.targetPatientIdentifier;
 *   const appointment = getAppointmentData('full-appointment.scenario.json');
 *   await patientsPage.createAppointment(targetPatient, appointment);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import { faker } from '@faker-js/faker';
import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { AppointmentData } from '../data/appointment.data';
import fullScenario from '../../config/appointment-scenarios/full-appointment.scenario.json';

/** Shorthand to the scenario's _config block */
const C = fullScenario._config;

// =========================================================================
// Helpers
// =========================================================================

/**
 * Get today's date in YYYY-MM-DD format (local timezone).
 */
function getTodayDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().split('T')[0];
}

/**
 * Get the current time in HH:MM format (24h).
 */
function getCurrentTime(): string {
  const now = new Date();
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * Add a number of minutes to a time string (HH:MM) and return the result.
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const resultHour = Math.floor(totalMinutes / 60) % 24;
  const resultMin = totalMinutes % 60;
  return `${resultHour.toString().padStart(2, '0')}:${resultMin.toString().padStart(2, '0')}`;
}

/**
 * Generate a future appointment date within the next 30 days.
 */
function generateFutureDate(): string {
  const date = faker.date.soon({ days: 30 });
  return date.toISOString().split('T')[0];
}

/**
 * Generate a random appointment time in HH:MM format (business hours).
 */
function generateAppointmentTime(): string {
  const hour = faker.number.int({ min: 8, max: 17 });
  const minute = faker.helpers.arrayElement(['00', '15', '30', '45']);
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

// =========================================================================
// Constants
// =========================================================================

const VISIT_TYPES = [
  'Initial Visit',
  'Treatment Nurse Visit',
  'Social Worker Visit',
  'Test Nurse All Forme',
] as const;

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  visitType:           () => 'Initial Visit',
  appointmentDate:     () => getTodayDate(),
  appointmentTime:     () => getCurrentTime(),
  endTime:             () => addMinutesToTime(getCurrentTime(), C.defaultDurationMinutes),
  assignedStaff:       () => undefined,
  notes:               () => 'Test appointment notes',
  // durationMinutes is a number, not string — handled by overrides only
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  visitType:           () => faker.helpers.arrayElement([...VISIT_TYPES]),
  appointmentDate:     () => generateFutureDate(),
  appointmentTime:     () => generateAppointmentTime(),
  endTime:             () => addMinutesToTime(generateAppointmentTime(), C.defaultDurationMinutes),
  // assignedStaff intentionally omitted: optional string, resolved via
  // defaults or overrides only. DYNAMIC would not make sense for this field.
  notes:               () => faker.lorem.sentence(),
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {
  today_date:          () => getTodayDate(),
  current_time:        () => getCurrentTime(),
  future_date:         () => generateFutureDate(),
  random_time:         () => generateAppointmentTime(),
  random_notes:        () => faker.lorem.sentence(),
  random_visit_type:   () => faker.helpers.arrayElement([...VISIT_TYPES]),
};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read an appointment JSON data file and return a fully resolved
 * AppointmentData object.
 *
 * @param fileName  File name (e.g. `"full-appointment.scenario.json"`). The file
 *                  is looked up in `config/appointment-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const apt = getAppointmentData('full-appointment.scenario.json');
 *   const apt = getAppointmentData('minimal-appointment.scenario.json');
 */
export const getAppointmentData = createDataLoader<AppointmentData>({
  name: 'AppointmentData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'appointment-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
