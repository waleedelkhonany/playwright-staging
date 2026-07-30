import { faker } from '@faker-js/faker';
import fullScenario from '../../config/appointment-scenarios/full-appointment.scenario.json';

/** Shorthand to the scenario's _config block */
const C = fullScenario._config;

// =========================================================================
// Types
// =========================================================================

export interface AppointmentData {
  /** Visit type selected from dropdown (e.g., "In-Center", "Home Visit") */
  visitType: string;

  /** Appointment date in ISO format (YYYY-MM-DD) */
  appointmentDate?: string;

  /** Appointment start time (e.g., "10:00", "14:30") */
  appointmentTime?: string;

  /** Appointment end time (e.g., "11:00", "15:30") */
  endTime?: string;

  /** Optional assigned staff member */
  assignedStaff?: string;

  /** Optional notes for the appointment */
  notes?: string;

  /** Optional duration in minutes */
  durationMinutes?: number;
}

// =========================================================================
// Constants
// =========================================================================

// Actual Visit Type options from the staging app's `visit_type_id` dropdown:
// "Select Visit Type" (placeholder), "Initial Visit", "Treatment Nurse Visit",
// "Social Worker Visit", "Test Nurse All Forme"
const VISIT_TYPES = [
  'Initial Visit',
  'Treatment Nurse Visit',
  'Social Worker Visit',
  'Test Nurse All Forme',
] as const;

// =========================================================================
// Helpers
// =========================================================================

/**
 * Get today's date in YYYY-MM-DD format.
 */
function getTodayDate(): string {
  const now = new Date();
  // Adjust for timezone offset to get local date
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
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
 * Resolve the appointment date: today's date (no config dependency).
 */
function resolveAppointmentDate(): string {
  return getTodayDate();
}

/**
 * Resolve the start time: current time (no config dependency).
 */
function resolveStartTime(): string {
  return getCurrentTime();
}

/**
 * Resolve the end time: startTime + defaultDurationMinutes.
 */
function resolveEndTime(startTime: string): string {
  return addMinutesToTime(startTime, C.defaultDurationMinutes);
}

// =========================================================================
// Factory Functions
// =========================================================================

/**
 * Build appointment data with all fields dynamically generated via faker.
 * Supports overrides for any field.
 *
 * @param overrides - Optional partial AppointmentData to override generated values
 * @returns Complete AppointmentData object
 *
 * @example
 *   const appointment = buildAppointment();
 *   const custom = buildAppointment({ visitType: "Home Visit", durationMinutes: 60 });
 */
export function buildAppointment(overrides?: Partial<AppointmentData>): AppointmentData {
  // --- Visit Type: config value or random fallback ---
  const visitType = faker.helpers.arrayElement([...VISIT_TYPES]);

  // --- Date & Time: dynamic defaults ---
  const appointmentDate = resolveAppointmentDate();
  const startTime = resolveStartTime();
  const endTime = resolveEndTime(startTime);

  return {
    visitType,
    appointmentDate,
    appointmentTime: startTime,
    endTime,
    notes: faker.lorem.sentence(),
    durationMinutes: C.defaultDurationMinutes,
    ...overrides,
  };
}

/**
 * Build appointment data with only the minimum required fields.
 * Date and visit type are dynamically generated via faker.
 *
 * @param overrides - Optional partial AppointmentData to override values
 * @returns Minimal AppointmentData object (date + visit type only)
 */
export function buildMinimalAppointment(overrides?: Partial<AppointmentData>): AppointmentData {
  const visitType = faker.helpers.arrayElement([...VISIT_TYPES]);

  return {
    visitType,
    appointmentDate: resolveAppointmentDate(),
    ...overrides,
  };
}
