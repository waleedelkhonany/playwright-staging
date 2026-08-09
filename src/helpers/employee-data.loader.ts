/**
 * =============================================================================
 * Employee Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads an employee scenario JSON file from config/employee-scenarios/ and
 * resolves each field according to these rules:
 *
 *   empty string ("")  →  default fallback value (sensible seed data)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static hardcoded value)
 *
 * CRITICAL: nationalId / scfhsLicenseNumber / nphiesProviderId are validated
 * server-side for UNIQUENESS — the DYNAMIC generators below always produce
 * fresh values (timestamp-derived) so repeat runs never collide.
 *
 * Usage in tests:
 *
 *   import { getEmployeeData } from '../helpers/employee-data.loader';
 *
 *   const employee = getEmployeeData('full-employee.scenario.json');
 *   await employeesPage.addEmployee(employee);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 * @see src/data/employee.data.ts — EmployeeData type
 */

import { faker } from '@faker-js/faker';
import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { EmployeeData } from '../data/employee.data';

// =========================================================================
// Helpers
// =========================================================================

function sanitizeEnglishName(name: string): string {
  return name.replace(/[^a-zA-Z\s]/g, '').trim() || 'Ahmed';
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Random 10-digit National ID starting with '1' — fresh per run (server
 * enforces uniqueness per ID type) and never has a leading zero.
 */
function generateNationalId(): string {
  return `1${faker.string.numeric({ length: 9 })}`;
}

/** Random SCFHS license number — fresh per run (server enforces uniqueness). */
function generateScfhsLicenseNumber(): string {
  return `SCFHS-${faker.string.numeric({ length: 8 })}`;
}

/** Random NPHIES provider ID — fresh per run (server enforces uniqueness). */
function generateNphiesProviderId(): string {
  return `NP-${faker.string.numeric({ length: 8 })}`;
}

function generateFutureDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + faker.number.int({ min: 1, max: 6 }));
  return toDateString(date);
}

function generateDateOfBirth(): string {
  return toDateString(faker.date.birthdate({ min: 18, max: 65, mode: 'age' }));
}

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  name:                  () => 'Test Employee',
  title:                 () => 'Nurse',
  status:                () => 'Active',
  gender:                () => 'Male',
  maritalStatus:         () => 'Married',
  nationality:           () => 'Saudi Arabian',
  idType:                () => 'national_id',
  nationalId:            () => generateNationalId(),
  expirationDate:        () => generateFutureDate(),
  dateOfBirth:           () => generateDateOfBirth(),
  religion:              () => 'Islam',
  language:              () => 'English',
  scfhsLicenseNumber:    () => generateScfhsLicenseNumber(),
  scfhsLicenseExpiryDate: () => generateFutureDate(),
  nphiesProviderId:      () => generateNphiesProviderId(),
  // Optional fields default to undefined
  branches:              () => undefined,
  systems:               () => undefined,
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // Always random
  name:                  () => sanitizeEnglishName(faker.person.fullName()),
  gender:                () => faker.helpers.arrayElement(['Male', 'Female']),
  nationalId:            () => generateNationalId(),
  scfhsLicenseNumber:    () => generateScfhsLicenseNumber(),
  nphiesProviderId:      () => generateNphiesProviderId(),
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {
  random_dob:              () => generateDateOfBirth(),
  future_expiration_date:  () => generateFutureDate(),
};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read an employee JSON data file and return a fully resolved EmployeeData
 * object.
 *
 * @param fileName  File name (e.g. `"full-employee.scenario.json"`). The file
 *                  is looked up in `config/employee-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 */
export const getEmployeeData = createDataLoader<EmployeeData>({
  name: 'EmployeeData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'employee-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
