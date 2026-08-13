/**
 * =============================================================================
 * Patient Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a merged patient scenario JSON file from config/patient-scenarios/ and
 * resolves each _fields entry according to these rules:
 *
 *   empty string ("")  →  default fallback value (sensible seed data)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static hardcoded value)
 *
 * The _config block in each scenario file is available for test parameters
 * (e.g., staff names) and can be imported directly by the test.
 *
 * Usage in tests:
 *
 *   import scenario from '../config/patient-scenarios/minimal-patient.scenario.json';
 *   import { getPatientData } from '../helpers/patient-data.loader';
 *
 *   const patient = getPatientData('minimal-patient.scenario.json');
 *   await patientsPage.addPatient(patient);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import { faker as fakerAr } from '@faker-js/faker/locale/ar';
import { faker as fakerEn } from '@faker-js/faker';
import * as path from 'path';
import { generateSaudiPhoneNumber } from './saudi-phone.helper';
import { createDataLoader } from './data.loader';
import type { PatientData } from '../data/patient.data';

// =========================================================================
// Helpers
// =========================================================================

function sanitizeEnglishName(name: string): string {
  return name.replace(/[^a-zA-Z\s]/g, '').trim() || 'Ahmed';
}

function generateDateOfBirth(): string {
  return fakerEn.date
    .birthdate({ min: 18, max: 70, mode: 'age' })
    .toISOString()
    .split('T')[0];
}

function generateNationalId(): string {
  return fakerEn.string.numeric({ length: 10 });
}

// =========================================================================
// Constants (option sets used by dynamic generators)
// =========================================================================

const GENDERS = ['Male', 'Female'] as const;
const MARITAL_STATUSES = ['Married', 'Unmarried', 'Divorced', 'Widowed', 'Legally Separated'] as const;
const OCCUPATIONS = [
  'Administration', 'Agriculture', 'Business', 'Education',
  'Housewife', 'Marine', 'Medical Field', 'Military',
  'Skilled Worker', 'Student', 'Oil Industries',
  'Unemployed', 'Others', 'Unknown',
] as const;
const NATIONALITIES = [
  'Saudi Arabian', 'Egyptian', 'Pakistani', 'Indian',
  'Bangladeshi', 'Filipino', 'Sudanese', 'Yemeni',
  'Syrian', 'Jordanian', 'Lebanese', 'Other',
] as const;
const CODE_STATUSES = [
  'Full Code', 'DNR (Do Not Resuscitate)', 'DNI (Do Not Intubate)',
  'Limited/Modified Code', 'Comfort Measures Only',
] as const;
const ISOLATION_TYPES = [
  'Standard Precautions', 'Contact Isolation', 'Droplet Isolation',
  'Airborne Isolation', 'Protective Isolation', 'Reverse Isolation',
  'No Isolation Required',
] as const;
const RELIGIONS = [
  'Islam', 'Christianity', 'Hinduism', 'Buddhism',
  'Judaism', 'Sikhism', 'Atheism', 'Other',
] as const;
const PREFERRED_LANGUAGES = [
  'English', 'Arabic', 'French', 'Spanish',
  'German', 'Chinese', 'Hindi', 'Japanese', 'Russian',
] as const;
const REFERRED_HOSPITALS = [
  'King Abdulaziz Medical City', 'King Faisal Specialist Hospital & Research Centre',
  'King Fahad Medical City', 'King Fahad Hospital of the University',
  'Dallah Hospital', 'Dr. Soliman Fakeeh Hospital',
  'King Abdullah Medical City', 'Aseer Central Hospital',
  'Prince Sultan Military Medical City',
] as const;

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  firstNameAr:              () => fakerAr.person.firstName(),
  middleNameAr:             () => fakerAr.person.firstName(),
  familyNameAr:             () => fakerAr.person.lastName(),
  givenNameEn:              () => sanitizeEnglishName(fakerEn.person.firstName()),
  middleNameEn:             () => sanitizeEnglishName(fakerEn.person.firstName()),
  familyNameEn:             () => sanitizeEnglishName(fakerEn.person.lastName()),
  mobile:                   () => generateSaudiPhoneNumber('local'),
  codeStatus:               () => 'Full Code',
  dateOfBirth:              () => generateDateOfBirth(),
  gender:                   () => 'Male',
  maritalStatus:            () => 'Married',
  occupation:               () => 'Student',
  nationality:              () => 'Saudi Arabian',
  patientSystem:            () => fakerEn.helpers.arrayElement(['Center', 'Home']),
  emergencyContactPerson:   () => 'Emergency Contact',
  emergencyContactNo:       () => generateSaudiPhoneNumber('local'),
  governmentIdType:         () => 'national_id',
  nationalId:               () => generateNationalId(),
  isolationType:            () => 'No Isolation Required',
  email:                    () => fakerEn.internet.email().toLowerCase(),
  referredHospital:         () => 'King Abdulaziz Medical City',
  religion:                 () => 'Islam',
  preferredLanguage:        () => 'English',
  isEmployee:               () => '0',
  isVisitor:                () => '0',
  // Care team — default to undefined so Select2 is not attempted
  primaryTeamLeaderNurse:   () => undefined,
  primaryNurseName:         () => undefined,
  primaryPhysicianName:     () => undefined,
  primarySocialWorkerName:  () => undefined,
  // Optional fields default to undefined
  oldMrn:                   () => undefined,
  farabiFileNo:             () => undefined,
  secondaryMobile:          () => undefined,
  firstEverHd:              () => undefined,
  dateOfMedicalAcceptance:  () => undefined,
  dateOfHomeSettingsAcceptance: () => undefined,
  dateOfReferral:           () => undefined,
  dateOfFirstHhdTreatment:  () => undefined,
  // "Is Cash" is a required field on the staging form. "Yes" avoids the
  // conditional rule that makes SAP Project mandatory when is_cash is "0".
  isCash:                   () => 'Yes',
  sapProject:               () => undefined,
  idExpirationDate:         () => undefined,
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // Names — always random
  firstNameAr:              () => fakerAr.person.firstName(),
  middleNameAr:             () => fakerAr.person.firstName(),
  familyNameAr:             () => fakerAr.person.lastName(),
  givenNameEn:              () => sanitizeEnglishName(fakerEn.person.firstName()),
  middleNameEn:             () => sanitizeEnglishName(fakerEn.person.firstName()),
  familyNameEn:             () => sanitizeEnglishName(fakerEn.person.lastName()),

  // Contact — always random
  mobile:                   () => generateSaudiPhoneNumber('local'),
  emergencyContactNo:       () => generateSaudiPhoneNumber('local'),
  email:                    () => fakerEn.internet.email().toLowerCase(),

  // Drop-down selects — random each run
  codeStatus:               () => fakerEn.helpers.arrayElement([...CODE_STATUSES]),
  gender:                   () => fakerEn.helpers.arrayElement([...GENDERS]),
  maritalStatus:            () => fakerEn.helpers.arrayElement([...MARITAL_STATUSES]),
  occupation:               () => fakerEn.helpers.arrayElement([...OCCUPATIONS]),
  nationality:              () => fakerEn.helpers.arrayElement([...NATIONALITIES]),
  patientSystem:            () => fakerEn.helpers.arrayElement(['Center', 'Home']),
  isolationType:            () => fakerEn.helpers.arrayElement([...ISOLATION_TYPES]),
  referredHospital:         () => fakerEn.helpers.arrayElement([...REFERRED_HOSPITALS]),
  religion:                 () => fakerEn.helpers.arrayElement([...RELIGIONS]),
  preferredLanguage:        () => fakerEn.helpers.arrayElement([...PREFERRED_LANGUAGES]),

  // Boolean selects
  isEmployee:               () => fakerEn.datatype.boolean() ? '1' : '0',
  isVisitor:                () => fakerEn.datatype.boolean() ? '1' : '0',

  // Identity — always random
  dateOfBirth:              () => generateDateOfBirth(),
  nationalId:               () => generateNationalId(),
  governmentIdType:         () => 'national_id',

  // Emergency contact
  emergencyContactPerson:   () =>
    sanitizeEnglishName(`${fakerEn.person.firstName()} ${fakerEn.person.lastName()}`),
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {
  random_first_name:  () => sanitizeEnglishName(fakerEn.person.firstName()),
  random_last_name:   () => sanitizeEnglishName(fakerEn.person.lastName()),
  random_full_name:   () =>
    sanitizeEnglishName(`${fakerEn.person.firstName()} ${fakerEn.person.lastName()}`),
  random_phone:       () => generateSaudiPhoneNumber('local'),
  random_national_id: () => generateNationalId(),
  random_dob:         () => generateDateOfBirth(),
  random_email:       () => fakerEn.internet.email().toLowerCase(),
  random_ar_first:    () => fakerAr.person.firstName(),
  random_ar_last:     () => fakerAr.person.lastName(),
};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a patient JSON data file and return a fully resolved PatientData object.
 *
 * @param fileName  File name (e.g. `"minimal-patient.scenario.json"`). The file
 *                  is looked up in `config/patient-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const patient = getPatientData('minimal-patient.scenario.json');
 *   const patient = getPatientData('full-patient.scenario.json', { gender: 'Female' });
 */
export const getPatientData = createDataLoader<PatientData>({
  name: 'PatientData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'patient-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
