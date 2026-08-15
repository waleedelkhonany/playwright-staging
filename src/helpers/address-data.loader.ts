/**
 * =============================================================================
 * Address Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a merged address scenario JSON file from config/address-scenarios/ and
 * resolves each _fields entry using the same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback value
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static hardcoded value)
 *
 * The target patient identifier is NOT read from scenario files — it lives in
 * config/config.json (appointment.targetPatientIdentifier), the single source
 * of truth shared by every patient test.
 *
 * Usage in tests:
 *
 *   import config from '../../config/config.json';
 *   import { getAddressData } from '../helpers/address-data.loader';
 *
 *   const address = getAddressData('full-address.scenario.json');
 *   await patientsPage.addAddress(config.appointment.targetPatientIdentifier, address);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import { faker } from '@faker-js/faker';
import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { AddressData } from '../data/address.data';

// =========================================================================
// Helpers
// =========================================================================

/**
 * Generate a unique street address. A short timestamp suffix guarantees the
 * address is unique per run so the saved row can be asserted in the list.
 */
function generateUniqueStreetAddress(): string {
  return `${faker.location.streetAddress()} ${Date.now().toString().slice(-6)}`;
}

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  address:    () => generateUniqueStreetAddress(),
  area:       () => 'Riyadh',
  city:       () => 'Riyadh',
  isDefault:  () => undefined,
  mapAddress: () => undefined,
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  address:    () => generateUniqueStreetAddress(),
  area:       () => faker.helpers.arrayElement(['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam']),
  city:       () => faker.location.city(),
  // isDefault/mapAddress intentionally omitted: optional — resolved via
  // defaults or overrides only. DYNAMIC would not make sense for them.
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {
  random_city: () => faker.location.city(),
};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read an address JSON data file and return a fully resolved AddressData object.
 *
 * @param fileName  File name (e.g. `"full-address.scenario.json"`). The file
 *                  is looked up in `config/address-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const address = getAddressData('full-address.scenario.json');
 *   const address = getAddressData('full-address.scenario.json', { isDefault: true });
 */
export const getAddressData = createDataLoader<AddressData>({
  name: 'AddressData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'address-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
