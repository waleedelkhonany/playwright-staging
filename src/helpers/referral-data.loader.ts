/**
 * =============================================================================
 * Referral Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a Referral scenario JSON file from config/referral-scenarios/ and
 * resolves each _fields entry using the same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback (empty → field skipped)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static value, must match a real option)
 *
 * The target visit ID is NOT read from scenario files — it lives in
 * config/config.json (visitId) so every test uses the same value.
 *
 * Usage in tests:
 *
 *   import config from '../../config/config.json';
 *   import { getReferralData } from '../helpers/referral-data.loader';
 *
 *   const visitId = config.visitId;
 *   const data = getReferralData('referral.scenario.json');
 *   await referralPage.openVisitReferral(visitId);
 *   await referralPage.fillReferralForm(data);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { ReferralData } from '../data/referral.data';

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  // Every optional field defaults to empty → the page object skips it.
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // Nothing is DYNAMIC in the baseline scenario — every field is a static
  // option/label matched to the real staging DOM. Add entries here if a
  // scenario ever uses "DYNAMIC" (e.g. a free-text reason/comment).
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Referral scenario JSON file and return a fully resolved
 * ReferralData object.
 *
 * @param fileName  File name (e.g. `"referral.scenario.json"`). The file is
 *                  looked up in `config/referral-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const data = getReferralData('referral.scenario.json');
 */
export const getReferralData = createDataLoader<ReferralData>({
  name: 'ReferralData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'referral-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
