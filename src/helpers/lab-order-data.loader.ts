/**
 * =============================================================================
 * Lab Order Data Loader — JSON-driven test data
 * =============================================================================
 *
 * Reads a Lab Order scenario JSON file from config/physician-order-scenarios/
 * and resolves its `_fields` entries using the generic loader's rules:
 *
 *   empty string ("")  →  default fallback value
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static hardcoded value)
 *
 * The lab order scenario is currently fully static (concrete option texts
 * from the staging form), so no defaults/dynamic/template generators are
 * required yet — the maps exist for future scenarios that want DYNAMIC
 * values.
 *
 * Usage in tests:
 *
 *   import { getLabOrderData } from '../helpers/lab-order-data.loader';
 *
 *   const order = getLabOrderData('lab-order.scenario.json');
 *   await physicianOrdersPage.fillLabOrderForm(order);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { LabOrderData } from '../data/lab-order.data';

export const getLabOrderData = createDataLoader<LabOrderData>({
  name: 'LabOrder',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'physician-order-scenarios'),
  defaults: {},
  dynamic: {},
  templates: {},
});
