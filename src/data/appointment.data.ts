import { faker } from '@faker-js/faker';
import config from '../../config/config.json';

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
 * Generate a future appointment date within the next 30 days.
 * (Used as fallback when config.appointmentDate is null)
 */
function generateAppointmentDate(): string {
  const date = faker.date.soon({ days: 30 });
  return date.toISOString().split('T')[0];
}

/**
 * Generate a random appointment time in HH:MM format (business hours).
 * (Used as fallback when config.startTime is null)
 */
function generateAppointmentTime(): string {
  const hour = faker.number.int({ min: 8, max: 17 });
  const minute = faker.helpers.arrayElement(['00', '15', '30', '45']);
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

/**
 * Resolve the appointment date from config, or fall back to today's date.
 */
function resolveAppointmentDate(): string {
  const configured = config.appointment?.appointmentDate;
  if (configured) return configured;
  return getTodayDate();
}

/**
 * Resolve the start time from config, or fall back to the current time.
 */
function resolveStartTime(): string {
  const configured = config.appointment?.startTime;
  if (configured) return configured;
  return getCurrentTime();
}

/**
 * Resolve the end time from config, or calculate from startTime + defaultDurationMinutes.
 */
function resolveEndTime(startTime: string): string | undefined {
  const configured = config.appointment?.endTime;
  if (configured) return configured;

  const defaultDuration = config.appointment?.defaultDurationMinutes;
  if (defaultDuration) {
    return addMinutesToTime(startTime, defaultDuration);
  }

  return undefined;
}

// =========================================================================
// Factory Functions
// =========================================================================

/**
 * Build appointment data with all fields dynamically generated.
 * Uses the visit type from config.json by default, but supports overrides.
 *
 * @param overrides - Optional partial AppointmentData to override generated values
 * @returns Complete AppointmentData object
 *
 * @example
 *   const appointment = buildAppointment();
 *   // => { visitType: "In-Center", appointmentDate: "2026-08-15", ... }
 *
 *   const custom = buildAppointment({ visitType: "Home Visit", durationMinutes: 60 });
 */
export function buildAppointment(overrides?: Partial<AppointmentData>): AppointmentData {
  // --- Visit Type: config value or random fallback ---
  const configuredVisitType = config.appointment?.visitType;
  const visitType = configuredVisitType && VISIT_TYPES.includes(configuredVisitType as any)
    ? configuredVisitType
    : faker.helpers.arrayElement([...VISIT_TYPES]);

  // --- Date & Time: config values or dynamic defaults ---
  const appointmentDate = resolveAppointmentDate();
  const startTime = resolveStartTime();
  const endTime = resolveEndTime(startTime);

  return {
    visitType,
    appointmentDate,
    appointmentTime: startTime,
    endTime,
    notes: faker.lorem.sentence(),
    durationMinutes: config.appointment?.defaultDurationMinutes ?? 60,
    ...overrides,
  };
}

/**
 * Build appointment data with only the minimum required fields.
 * Relies on config.json for visit type and date/time defaults.
 *
 * @param overrides - Optional partial AppointmentData to override values
 * @returns Minimal AppointmentData object (date + visit type only)
 */
export function buildMinimalAppointment(overrides?: Partial<AppointmentData>): AppointmentData {
  const configuredVisitType = config.appointment?.visitType;
  const visitType = configuredVisitType && VISIT_TYPES.includes(configuredVisitType as any)
    ? configuredVisitType
    : faker.helpers.arrayElement([...VISIT_TYPES]);

  return {
    visitType,
    appointmentDate: resolveAppointmentDate(),
    ...overrides,
  };
}
