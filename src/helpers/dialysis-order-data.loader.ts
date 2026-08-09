/**
 * =============================================================================
 * Dialysis Order Data Loader — JSON-driven test data
 * =============================================================================
 *
 * Reads a Dialysis Order scenario JSON file from config/physician-order-scenarios/
 * and resolves its `_fields` entries using the generic loader's rules:
 *
 *   empty string ("")  →  default fallback value
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static hardcoded value)
 *
 * The dialysis order scenario is currently fully static (concrete option
 * texts from the staging modal), so no defaults/dynamic/template generators
 * are required yet — the maps exist for future scenarios that want DYNAMIC
 * values.
 *
 * Usage in tests:
 *
 *   import { getDialysisOrderData } from '../helpers/dialysis-order-data.loader';
 *
 *   const order = getDialysisOrderData('dialysis-order.scenario.json');
 *   await physicianOrdersPage.fillDialysisOrderForm(order);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { DialysisOrderData } from '../data/dialysis-order.data';

export const getDialysisOrderData = createDataLoader<DialysisOrderData>({
  name: 'DialysisOrder',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'physician-order-scenarios'),
  defaults: {},
  dynamic: {},
  templates: {},
});
