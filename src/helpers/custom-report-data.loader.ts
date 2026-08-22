/**
 * =============================================================================
 * Custom Report Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a Custom Report scenario JSON file from config/custom-report-scenarios/
 * and resolves each _fields entry using the same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback (empty → field skipped)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static value, must match a real option)
 *
 * Usage in tests:
 *
 *   import { getCustomReportData } from '../helpers/custom-report-data.loader';
 *   const data = getCustomReportData('sessions-custom-range.scenario.json');
 *   await customReportsPage.openBuilder(data.subject!, data.rangeMode!);
 *   ...
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import * as path from 'path';
import { faker } from '@faker-js/faker';
import { createDataLoader } from './data.loader';
import type { CustomReportData } from '../data/custom-report.data';

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  // Every optional field defaults to empty → the page object skips it.
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // Saved-report display name must be UNIQUE per run so list assertions and
  // cleanup are unambiguous even if a previous run left rows behind.
  saveReport: () => `E2E Custom Report ${Date.now()}`,
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {
  // "{{today_plus_30}}" → a date ~30 days ahead, YYYY-MM-DD (future-proof
  // custom ranges that never go stale).
  today_plus_30: () => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  },
  // "{{today_minus_7}}" → a week ago, YYYY-MM-DD.
  today_minus_7: () => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  },
};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Custom Report scenario JSON file and return a fully resolved
 * CustomReportData object.
 *
 * @param fileName  File name (e.g. `"sessions-custom-range.scenario.json"`).
 *                  The file is looked up in `config/custom-report-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const data = getCustomReportData('sessions-custom-range.scenario.json');
 */
export const getCustomReportData = createDataLoader<CustomReportData>({
  name: 'CustomReportData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'custom-report-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});

// Re-exported for specs that want to build names without a scenario file.
export { faker };
