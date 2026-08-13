/**
 * =============================================================================
 * Respiratory Triage Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a Respiratory Triage Checklist scenario JSON file from
 * config/respiratory-triage-scenarios/ and resolves each _fields entry using
 * the same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback (empty → field skipped)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static value, must match a real option)
 *
 * The target visit ID is NOT read from scenario files — it lives in
 * config/config.json (visitId) so every test uses the same value. The
 * patient ID comes from
 * the "Add New" href on the Respiratory Triage tab
 * (load/form/{patientId}/respiratory-triage?display=create).
 *
 * Usage in tests:
 *
 *   import config from '../../config/config.json';
 *   import { getRespiratoryTriageData } from '../helpers/respiratory-triage-data.loader';
 *
 *   const visitId = config.visitId;
 *   const data = getRespiratoryTriageData('respiratory-triage.scenario.json');
 *   await respiratoryTriagePage.openVisitRespiratoryTriage(visitId);
 *   await respiratoryTriagePage.fillRespiratoryTriageForm(data);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { RespiratoryTriageData } from '../data/respiratory-triage.data';

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  // Every optional field defaults to empty → the page object skips it.
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // Nothing is DYNAMIC in the baseline scenario — every field is a static
  // value matched to the real staging DOM.
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Respiratory Triage scenario JSON file and return a fully resolved
 * RespiratoryTriageData object.
 *
 * @param fileName  File name (e.g. `"respiratory-triage.scenario.json"`). The
 *                  file is looked up in `config/respiratory-triage-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const data = getRespiratoryTriageData('respiratory-triage.scenario.json');
 */
export const getRespiratoryTriageData = createDataLoader<RespiratoryTriageData>({
  name: 'RespiratoryTriageData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'respiratory-triage-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
