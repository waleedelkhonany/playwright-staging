/**
 * =============================================================================
 * Flow Sheet Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a Flow Sheet scenario JSON file from config/flow-sheet-scenarios/ and
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
 *   import { getFlowSheetData } from '../helpers/flow-sheet-data.loader';
 *
 *   const visitId = config.visitId;
 *   const flowSheet = getFlowSheetData('flow-sheet.scenario.json');
 *   await flowSheetPage.openVisitFlowSheet(visitId);
 *   await flowSheetPage.fillFlowSheetForm(flowSheet);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import { faker } from '@faker-js/faker';
import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { FlowSheetData } from '../data/flow-sheet.data';

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  // Every optional field defaults to empty → the page object skips it.
  // Only the two DYNAMIC free-text fields have real defaults (in case the
  // scenario ever marks them empty, they still resolve to something).
  dialysisComments:          () => faker.lorem.sentence(),
  vasAccessPostNurseComments: () => faker.lorem.paragraph(),
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  dialysisComments:          () => faker.lorem.sentence(),
  vasAccessPostNurseComments: () => faker.lorem.paragraph(),
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Flow Sheet scenario JSON file and return a fully resolved
 * FlowSheetData object.
 *
 * @param fileName  File name (e.g. `"flow-sheet.scenario.json"`). The file is
 *                  looked up in `config/flow-sheet-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const flowSheet = getFlowSheetData('flow-sheet.scenario.json');
 */
export const getFlowSheetData = createDataLoader<FlowSheetData>({
  name: 'FlowSheetData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'flow-sheet-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
