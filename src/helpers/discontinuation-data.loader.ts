/**
 * =============================================================================
 * Discontinuation Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a REFUSAL/DISCONTINUATION OF HEMODIALYSIS SESSION/S scenario JSON file
 * from config/discontinuation-scenarios/ and resolves each _fields entry using
 * the same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback (empty → field skipped)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static value, must match a real option)
 *
 * The target visit ID is NOT read from scenario files — it lives in
 * config/config.json (discontinuation.visitId) so every test uses the same
 * value (mirrors flowSheet.visitId / patientAssessment.visitId).
 *
 * Usage in tests:
 *
 *   import config from '../../config/config.json';
 *   import { getDiscontinuationData } from '../helpers/discontinuation-data.loader';
 *
 *   const visitId = config.discontinuation.visitId;
 *   const data = getDiscontinuationData('discontinuation.scenario.json');
 *   await discontinuationPage.openVisitDiscontinuation(visitId);
 *   await discontinuationPage.fillDiscontinuationForm(data);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import { faker } from '@faker-js/faker';
import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { DiscontinuationData } from '../data/discontinuation.data';

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  // Every optional field defaults to empty → the page object skips it.
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // The free-text English discontinuation reason gets a fresh sentence per run.
  discontinueReasonEn: () => faker.lorem.sentence(),
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Discontinuation scenario JSON file and return a fully resolved
 * DiscontinuationData object.
 *
 * @param fileName  File name (e.g. `"discontinuation.scenario.json"`). The
 *                  file is looked up in `config/discontinuation-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const data = getDiscontinuationData('discontinuation.scenario.json');
 */
export const getDiscontinuationData = createDataLoader<DiscontinuationData>({
  name: 'DiscontinuationData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'discontinuation-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
