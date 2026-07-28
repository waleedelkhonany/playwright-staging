import { faker as fakerAr } from '@faker-js/faker/locale/ar';
import { faker as fakerEn } from '@faker-js/faker';
import { generateSaudiPhoneNumber } from '../helpers/saudi-phone.helper';

// =========================================================================
// Types
// =========================================================================

export interface PatientData {
  // Required: Arabic Names
  firstNameAr?: string;
  middleNameAr?: string;
  familyNameAr?: string;

  // Required: English Names
  givenNameEn?: string;
  middleNameEn?: string;
  familyNameEn?: string;

  // Required: Contact & Identity
  mobile?: string;
  codeStatus?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  occupation?: string;
  nationality?: string;
  patientSystem?: string;
  emergencyContactPerson?: string;
  emergencyContactNo?: string;
  governmentIdType?: string;
  nationalId?: string;

  // Required: Care Team
  primaryTeamLeaderNurse?: string;
  primaryNurseName?: string;
  primaryPhysicianName?: string;
  primarySocialWorkerName?: string;

  // Optional Fields
  oldMrn?: string;
  farabiFileNo?: string;
  secondaryMobile?: string;
  email?: string;
  isolationType?: string;
  firstEverHd?: string;
  dateOfMedicalAcceptance?: string;
  dateOfHomeSettingsAcceptance?: string;
  dateOfReferral?: string;
  dateOfFirstHhdTreatment?: string;
  referredHospital?: string;
  isCash?: string;
  sapProject?: string;
  isEmployee?: string;
  isVisitor?: string;
  idExpirationDate?: string;
  religion?: string;
  preferredLanguage?: string;
}

// =========================================================================
// Constants — MATCH actual select option texts from the form
// =========================================================================

const GENDERS = ['Male', 'Female'] as const;

const MARITAL_STATUSES = [
  'Married', 'Unmarried', 'Divorced', 'Widowed', 'Legally Separated',
] as const;

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
  'Full Code',
  'DNR (Do Not Resuscitate)',
  'DNI (Do Not Intubate)',
  'Limited/Modified Code',
  'Comfort Measures Only',
] as const;

const ISOLATION_TYPES = [
  'Standard Precautions',
  'Contact Isolation',
  'Droplet Isolation',
  'Airborne Isolation',
  'Protective Isolation',
  'Reverse Isolation',
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
  'King Abdulaziz Medical City',
  'King Faisal Specialist Hospital & Research Centre',
  'King Fahad Medical City',
  'King Fahad Hospital of the University',
  'Dallah Hospital',
  'Dr. Soliman Fakeeh Hospital',
  'King Abdullah Medical City',
  'Aseer Central Hospital',
  'Prince Sultan Military Medical City',
] as const;

// =========================================================================
// Helpers
// =========================================================================

function generateDateOfBirth(): string {
  return fakerEn.date.birthdate({ min: 18, max: 70, mode: 'age' })
    .toISOString()
    .split('T')[0];
}

function generateFutureDate(yearsFromNow: number = 5): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + fakerEn.number.int({ min: 1, max: yearsFromNow }));
  return date.toISOString().split('T')[0];
}

function generateNationalId(): string {
  return fakerEn.string.numeric({ length: 10 });
}

// =========================================================================
// Factory Functions
// =========================================================================

/** Sanitize an English name to contain only a-zA-Z and spaces (Laravel validation). */
function sanitizeEnglishName(name: string): string {
  return name.replace(/[^a-zA-Z\s]/g, '').trim() || 'Ahmed';
}

export function buildPatient(overrides?: Partial<PatientData>): PatientData {
  const firstNameAr = fakerAr.person.firstName();
  const middleNameAr = fakerAr.person.firstName();
  const familyNameAr = fakerAr.person.lastName();

  const givenNameEn = sanitizeEnglishName(fakerEn.person.firstName());
  const middleNameEn = sanitizeEnglishName(fakerEn.person.firstName());
  const familyNameEn = sanitizeEnglishName(fakerEn.person.lastName());

  const mobile = generateSaudiPhoneNumber('local');
  const emergencyContactNo = generateSaudiPhoneNumber('local');

  return {
    firstNameAr,
    middleNameAr,
    familyNameAr,
    givenNameEn,
    middleNameEn,
    familyNameEn,
    mobile,
    codeStatus: fakerEn.helpers.arrayElement([...CODE_STATUSES]),
    dateOfBirth: generateDateOfBirth(),
    gender: fakerEn.helpers.arrayElement([...GENDERS]),
    maritalStatus: fakerEn.helpers.arrayElement([...MARITAL_STATUSES]),
    occupation: fakerEn.helpers.arrayElement([...OCCUPATIONS]),
    nationality: fakerEn.helpers.arrayElement([...NATIONALITIES]),
    patientSystem: fakerEn.helpers.arrayElement(['Center', 'Home']),  // Auto-aligned by page object syncPatientSystemWithHeaderLocation()
    emergencyContactPerson: sanitizeEnglishName(`${fakerEn.person.firstName()} ${fakerEn.person.lastName()}`),
    emergencyContactNo,
    governmentIdType: 'national_id', // Radio button VALUE (not display text)
    nationalId: generateNationalId(),

    // Care Team — handled by select2 interaction in page object
    primaryTeamLeaderNurse: undefined,
    primaryNurseName: undefined,
    primaryPhysicianName: undefined,
    primarySocialWorkerName: undefined,

    // Optional fields
    email: fakerEn.internet.email().toLowerCase(),
    secondaryMobile: generateSaudiPhoneNumber('local'),
    isolationType: fakerEn.helpers.arrayElement([...ISOLATION_TYPES]),
    dateOfMedicalAcceptance: generateFutureDate(1),
    dateOfHomeSettingsAcceptance: generateFutureDate(1),
    dateOfReferral: generateFutureDate(1),
    referredHospital: fakerEn.helpers.arrayElement([...REFERRED_HOSPITALS]),
    isEmployee: fakerEn.datatype.boolean() ? '1' : '0',
    isVisitor: fakerEn.datatype.boolean() ? '1' : '0',
    idExpirationDate: generateFutureDate(10),
    religion: fakerEn.helpers.arrayElement([...RELIGIONS]),
    preferredLanguage: fakerEn.helpers.arrayElement([...PREFERRED_LANGUAGES]),

    ...overrides,
  };
}

export function buildMinimalPatient(overrides?: Partial<PatientData>): PatientData {
  return {
    firstNameAr: fakerAr.person.firstName(),
    middleNameAr: fakerAr.person.firstName(),
    familyNameAr: fakerAr.person.lastName(),
    givenNameEn: sanitizeEnglishName(fakerEn.person.firstName()),
    middleNameEn: sanitizeEnglishName(fakerEn.person.firstName()),
    familyNameEn: sanitizeEnglishName(fakerEn.person.lastName()),
    mobile: generateSaudiPhoneNumber('local'),
    codeStatus: 'Full Code',
    dateOfBirth: generateDateOfBirth(),
    gender: 'Male',
    maritalStatus: 'Married',
    occupation: 'Student',
    nationality: 'Saudi Arabian',
    patientSystem: 'Center',
    emergencyContactPerson: 'Emergency Contact',
    emergencyContactNo: generateSaudiPhoneNumber('local'),
    governmentIdType: 'national_id',
    nationalId: generateNationalId(),
    isolationType: 'No Isolation Required',
    // Additional fields the server may require for a successful save
    email: fakerEn.internet.email().toLowerCase(),
    referredHospital: 'King Abdulaziz Medical City',
    religion: 'Islam',
    preferredLanguage: 'English',
    // Boolean selects (Yes/No with values 1/0)
    isEmployee: '0',
    isVisitor: '0',
    ...overrides,
  };
}
