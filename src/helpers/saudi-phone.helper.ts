import { faker } from '@faker-js/faker/locale/ar';

/**
 * Saudi Arabia mobile phone prefixes (STC, Mobily, Zain, etc.)
 */
const MOBILE_PREFIXES = ['55', '56', '57', '58', '59', '53', '54', '50'];

/**
 * Saudi Arabia mobile phone prefixes with +966 international code
 */
const INTERNATIONAL_PREFIXES = ['+9665', '+96655', '+96656', '+96657', '+96658', '+96659', '+96653', '+96654', '+96650'];

/**
 * Generate a random Saudi Arabia mobile phone number.
 *
 * @param format - Output format:
 *   - 'local'     (default) -> e.g., 0551234567
 *   - 'international'      -> e.g., +966551234567
 *   - 'spaced'             -> e.g., 055 123 4567
 * @returns A randomly generated Saudi phone number string.
 *
 * @example
 *   generateSaudiPhoneNumber()            // "0551234567"
 *   generateSaudiPhoneNumber('local')     // "0551234567"
 *   generateSaudiPhoneNumber('international') // "+966551234567"
 *   generateSaudiPhoneNumber('spaced')    // "055 123 4567"
 */
export function generateSaudiPhoneNumber(
  format: 'local' | 'international' | 'spaced' = 'local',
): string {
  const prefix = faker.helpers.arrayElement(MOBILE_PREFIXES);
  // Generate 7 random digits for the subscriber number
  const subscriber = faker.string.numeric({ length: 7 });

  switch (format) {
    case 'international':
      return `+966${prefix}${subscriber}`;

    case 'spaced':
      return `0${prefix} ${subscriber.slice(0, 3)} ${subscriber.slice(3)}`;

    case 'local':
    default:
      return `0${prefix}${subscriber}`;
  }
}

/**
 * Generate a random Saudi landline phone number.
 *
 * @returns e.g., 0111234567
 */
export function generateSaudiLandlineNumber(): string {
  const areaCodes = ['11', '12', '13', '14', '16', '17'];
  const areaCode = faker.helpers.arrayElement(areaCodes);
  const subscriber = faker.string.numeric({ length: 7 });
  return `0${areaCode}${subscriber}`;
}

/**
 * Generate a complete Saudi address for testing purposes.
 *
 * @returns An object with address fields
 */
export function generateSaudiAddress(): {
  street: string;
  city: string;
  district: string;
  buildingNumber: string;
  zipCode: string;
} {
  return {
    street: faker.location.street(),
    city: faker.helpers.arrayElement([
      'Riyadh', 'Jeddah', 'Makkah', 'Madinah',
      'Dammam', 'Khobar', 'Dhahran', 'Tabuk',
      'Buraidah', 'Taif', 'Abha', 'Hail',
    ]),
    district: faker.helpers.arrayElement([
      'Al Olaya', 'Al Malaz', 'Al Nakheel', 'Al Rawdah',
      'Al Hamra', 'Al Safa', 'Al Mohammadiyah',
      'Al Worood', 'Al Faisaliyah', 'Al Zahra',
    ]),
    buildingNumber: faker.string.numeric({ length: 4 }),
    zipCode: faker.string.numeric({ length: 5 }),
  };
}
