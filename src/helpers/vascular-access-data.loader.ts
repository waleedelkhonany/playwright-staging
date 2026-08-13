/**
 * =============================================================================
 * Vascular Access Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a VASCULAR ACCESS ASSESSMENT TOOL scenario JSON file from
 * config/vascular-access-scenarios/ and resolves each _fields entry using the
 * same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback (empty → field skipped)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static value, must match a real option)
 *
 * The target visit ID is NOT read from scenario files — it lives in
 * config/config.json (vascularAccess.visitId) so every test uses the same
 * value (mirrors flowSheet.visitId / patientAssessment.visitId /
 * discontinuation.visitId).
 *
 * Usage in tests:
 *
 *   import config from '../../config/config.json';
 *   import { getVascularAccessData } from '../helpers/vascular-access-data.loader';
 *
 *   const visitId = config.vascularAccess.visitId;
 *   const data = getVascularAccessData('vascular-access.scenario.json');
 *   await vascularAccessPage.openVisitVascularAccess(visitId);
 *   await vascularAccessPage.fillVascularAccessForm(data);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { VascularAccessData } from '../data/vascular-access.data';

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  // Every optional field defaults to empty → the page object skips it.
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // Nothing is DYNAMIC in the baseline scenario — every field is a static
  // option matched to the real staging DOM. Add entries here if a scenario
  // ever uses "DYNAMIC" (e.g. a free-text date/comment).
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Vascular Access scenario JSON file and return a fully resolved
 * VascularAccessData object.
 *
 * @param fileName  File name (e.g. `"vascular-access.scenario.json"`). The
 *                  file is looked up in `config/vascular-access-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const data = getVascularAccessData('vascular-access.scenario.json');
 */
export const getVascularAccessData = createDataLoader<VascularAccessData>({
  name: 'VascularAccessData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'vascular-access-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
