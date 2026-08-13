/**
 * =============================================================================
 * Dialysis Order Data Loader — JSON-driven test data with dynamic resolution
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
 * Scenarios:
 *   - dialysis-order.scenario.json            → static baseline (concrete option texts,
 *                                               orderType = Conventional Dialysis)
 *   - portable-dialysis-order.scenario.json   → static values with the OTHER orderType
 *                                               (Portable Low Dialysate Dialysis)
 *   - dynamic-dialysis-order.scenario.json    → every field DYNAMIC (different values
 *                                               and different select choices each run)
 *   - hdf-dialysis-order.scenario.json        → fixed Portable Low Dialysate Dialysis +
 *                                               Hemodiafiltration (HDF), everything else DYNAMIC
 *
 * DYNAMIC select values are drawn from the EXACT option texts rendered in the
 * staging modal (verified via scripts/inspect-physician-orders.ts on 2026-08-09),
 * with "Other" deliberately excluded so no conditional other_* inputs appear.
 *
 * Usage in tests:
 *
 *   import { getDialysisOrderData } from '../helpers/dialysis-order-data.loader';
 *
 *   const order = getDialysisOrderData('dynamic-dialysis-order.scenario.json');
 *   await physicianOrdersPage.fillDialysisOrderForm(order);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import { faker } from '@faker-js/faker';
import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { DialysisOrderData } from '../data/dialysis-order.data';

// =========================================================================
// Option sets — exact option texts as rendered in the staging modal.
// "Other" is excluded: concrete choices only, so no other_* inputs needed.
// =========================================================================

const ORDER_TYPES = [
  'Conventional Dialysis',
  'Portable Low Dialysate Dialysis',
] as const;

const MODALITIES = [
  'Hemodialysis (HD)',
  'Hemodiafiltration (HDF)',
] as const;

const VASCULAR_ACCESS_TYPES = [
  'AV-Fistula',
  'AV-Graft',
  'Central Venous Catheter (CVC) – Temporary',
  'Permacath',
] as const;

const ACCESS_SITES = ['Right', 'Left'] as const;
const NEEDLE_GAUGES = ['15G', '16G', '17G'] as const;
const DWELL_TYPES = ['Heparin', 'Normal Saline'] as const;
const FREQUENCIES = [
  'Twice per week',
  'Three times per week',
  'Four times per week',
  'Five times per week',
] as const;
const DURATIONS = ['3 hours', '3.5 hours', '4 hours', '4.5 hours', '5 hours'] as const;
const BLOOD_FLOW_RATES = [
  '200 mL/min', '250 mL/min', '300 mL/min',
  '350 mL/min', '400 mL/min', '450 mL/min', '500 mL/min',
] as const;
const DIALYSATE_TYPES = ['Bicarbonate', 'Lactate'] as const;
const LACTATE_PERCENTS = ['40%', '45%'] as const;
const DIALYSATE_SODIUMS = ['130 mmol/L', '135 mmol/L', '138 mmol/L', '140 mmol/L'] as const;
const POTASSIUMS = ['1 mmol/L', '2 mmol/L', '3 mmol/L'] as const;
const BICARBONATES = ['30 mmol/L', '35 mmol/L', '38 mmol/L', '40 mmol/L'] as const;
const CALCIUMS = ['1.25 mmol/L', '1.5 mmol/L', '1.75 mmol/L'] as const;
const TEMPERATURES = ['35.5°C', '36.0°C', '36.5°C', '37.0°C'] as const;
const ANTICOAGULATION_TYPES = [
  'Unfractionated Heparin (UFH)',
  'Low Molecular Weight Heparin (LMWH)',
  'Saline Flushes',
  'None / Free',
] as const;
const DIALYZER_TYPES = ['High Flux', 'Low Flux'] as const;
const DIALYZER_SURFACE_AREAS = [
  '1.0 m²', '1.2 m²', '1.4 m²', '1.5 m²', '1.6 m²',
  '1.7 m²', '1.8 m²', '2.0 m²', '2.2 m²',
] as const;

// --- Section 2 (Additional Information) ---
const DIALYSATE_VOLUMES = [
  '20L', '25L', '30L', '35L', '40L', '45L', '50L', '55L', '60L',
] as const;
const DIALYZER_CARTRIDGES = ['Cartridge 172', 'Cartridge 124'] as const;

// =========================================================================
// Helpers
// =========================================================================

const pick = <T extends readonly string[]>(options: T): string =>
  faker.helpers.arrayElement([...options]);

/** Random dry weight in kg (55–120), one decimal. */
function randomDryWeight(): string {
  return faker.number.float({ min: 55, max: 120, fractionDigits: 1 }).toFixed(1);
}

/** Random ultrafiltration in L (1.0–4.0), one decimal. */
function randomUf(): string {
  return faker.number.float({ min: 1.0, max: 4.0, fractionDigits: 1 }).toFixed(1);
}

/** Random dwell volume in mL (100–250). */
function randomDwellVolume(): string {
  return String(faker.number.int({ min: 100, max: 250 }));
}

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  orderType:              () => 'Conventional Dialysis',
  modality:               () => 'Hemodialysis (HD)',
  dryWeight:              () => '70',
  uf:                     () => '2.0',
  vascularAccessType:     () => 'AV-Fistula',
  accessSite:             () => 'Right',
  needleGauge:            () => '16G',
  dwellType:              () => 'Heparin',
  dwellVolumeArterial:    () => '150',
  dwellVolumeVenous:      () => '150',
  frequency:              () => 'Three times per week',
  duration:               () => '4 hours',
  bloodFlowRate:          () => '300 mL/min',
  dialysateType:          () => 'Bicarbonate',
  picar:                  () => '35',
  lactatePercent:         () => '40%',
  dialysateSodium:        () => '138 mmol/L',
  potassium:              () => '2 mmol/L',
  bicarbonate:            () => '35 mmol/L',
  calcium:                () => '1.5 mmol/L',
  temperature:            () => '36.0°C',
  anticoagulationType:    () => 'Unfractionated Heparin (UFH)',
  dialyzerType:           () => 'High Flux',
  dialyzerSurfaceArea:    () => '1.6 m²',
  mode:                   () => 'Hemodialysis (HD)',
  dialysateVolume:        () => '30L',
  dialyzerCartridge:      () => 'Cartridge 172',
  dialyzerCartridgeExtra: () => 'High Flux',
  electrolyteSodium:      () => '140 mmol/L',
  electrolytePotassium:   () => '2 mmol/L',
  electrolyteCalcium:     () => '1.5 mmol/L',
  electrolyteGlucose:     () => '1 g',
  dialysateTemperature:   () => '36.0°C',
  additionalInformation:  () => 'E2E test dialysis order — created by Playwright.',
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // --- Section 1: Dialysis Order Type ---
  orderType:              () => pick(ORDER_TYPES),
  modality:               () => pick(MODALITIES),
  dryWeight:              () => randomDryWeight(),
  uf:                     () => randomUf(),
  vascularAccessType:     () => pick(VASCULAR_ACCESS_TYPES),
  accessSite:             () => pick(ACCESS_SITES),
  needleGauge:            () => pick(NEEDLE_GAUGES),
  dwellType:              () => pick(DWELL_TYPES),
  dwellVolumeArterial:    () => randomDwellVolume(),
  dwellVolumeVenous:      () => randomDwellVolume(),
  frequency:              () => pick(FREQUENCIES),
  duration:               () => pick(DURATIONS),
  bloodFlowRate:          () => pick(BLOOD_FLOW_RATES),
  dialysateType:          () => pick(DIALYSATE_TYPES),
  picar:                  () => '35', // only one concrete choice in the modal
  lactatePercent:         () => pick(LACTATE_PERCENTS),
  dialysateSodium:        () => pick(DIALYSATE_SODIUMS),
  potassium:              () => pick(POTASSIUMS),
  bicarbonate:            () => pick(BICARBONATES),
  calcium:                () => pick(CALCIUMS),
  temperature:            () => pick(TEMPERATURES),
  anticoagulationType:    () => pick(ANTICOAGULATION_TYPES),
  dialyzerType:           () => pick(DIALYZER_TYPES),
  dialyzerSurfaceArea:    () => pick(DIALYZER_SURFACE_AREAS),

  // --- Section 2: Additional Information ---
  mode:                   () => 'Hemodialysis (HD)', // pre-selected in the modal
  dialysateVolume:        () => pick(DIALYSATE_VOLUMES),
  dialyzerCartridge:      () => pick(DIALYZER_CARTRIDGES),
  dialyzerCartridgeExtra: () => pick(DIALYZER_TYPES),
  electrolyteSodium:      () => '140 mmol/L', // only one concrete choice
  electrolytePotassium:   () => pick(POTASSIUMS),
  electrolyteCalcium:     () => '1.5 mmol/L', // only one concrete choice
  electrolyteGlucose:     () => '1 g',        // only one concrete choice
  dialysateTemperature:   () => pick(TEMPERATURES),
  additionalInformation:  () => `E2E test dialysis order — ${faker.lorem.sentence()}`,
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {
  random_order_type:        () => pick(ORDER_TYPES),
  random_modality:          () => pick(MODALITIES),
  random_vascular_access:   () => pick(VASCULAR_ACCESS_TYPES),
  random_access_site:       () => pick(ACCESS_SITES),
  random_needle_gauge:      () => pick(NEEDLE_GAUGES),
  random_dwell_type:        () => pick(DWELL_TYPES),
  random_frequency:         () => pick(FREQUENCIES),
  random_duration:          () => pick(DURATIONS),
  random_blood_flow_rate:   () => pick(BLOOD_FLOW_RATES),
  random_dialysate_type:    () => pick(DIALYSATE_TYPES),
  random_lactate_percent:   () => pick(LACTATE_PERCENTS),
  random_dialysate_sodium:  () => pick(DIALYSATE_SODIUMS),
  random_potassium:         () => pick(POTASSIUMS),
  random_bicarbonate:       () => pick(BICARBONATES),
  random_calcium:           () => pick(CALCIUMS),
  random_temperature:       () => pick(TEMPERATURES),
  random_anticoagulation:   () => pick(ANTICOAGULATION_TYPES),
  random_dialyzer_type:     () => pick(DIALYZER_TYPES),
  random_dialyzer_surface:  () => pick(DIALYZER_SURFACE_AREAS),
  random_dialysate_volume:  () => pick(DIALYSATE_VOLUMES),
  random_cartridge:         () => pick(DIALYZER_CARTRIDGES),
  random_dry_weight:        () => randomDryWeight(),
  random_uf:                () => randomUf(),
  random_dwell_volume:      () => randomDwellVolume(),
  random_notes:             () => `E2E test dialysis order — ${faker.lorem.sentence()}`,
};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Dialysis Order scenario JSON file and return a fully resolved
 * DialysisOrderData object.
 *
 * @param fileName  File name (e.g. `"dialysis-order.scenario.json"` or
 *                  `"dynamic-dialysis-order.scenario.json"`). The file is
 *                  looked up in `config/physician-order-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const order = getDialysisOrderData('dialysis-order.scenario.json');
 *   const order = getDialysisOrderData('dynamic-dialysis-order.scenario.json');
 */
const baseLoader = createDataLoader<DialysisOrderData>({
  name: 'DialysisOrder',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'physician-order-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});

/**
 * Read a Dialysis Order scenario JSON file and return a fully resolved
 * DialysisOrderData object.
 *
 * The Additional-Information dialyzer type (dialyzerCartridgeExtra, the
 * "Choose Dialyzer Type" / ExtraOption1 select) is kept in sync with the main
 * Dialyzer select (dialyzerType) by the server — the staging re-render resets
 * ExtraOption1 to whatever Dialyzer holds, so independent DYNAMIC values would
 * be overwritten and fail the page object's read-back verification. We align
 * them here so scenario files can safely mark both fields DYNAMIC.
 *
 * @param fileName  File name (e.g. `"dialysis-order.scenario.json"` or
 *                  `"dynamic-dialysis-order.scenario.json"`). The file is
 *                  looked up in `config/physician-order-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const order = getDialysisOrderData('dialysis-order.scenario.json');
 *   const order = getDialysisOrderData('dynamic-dialysis-order.scenario.json');
 */
export function getDialysisOrderData(
  fileName: string,
  overrides?: Partial<DialysisOrderData>,
): DialysisOrderData {
  const data = baseLoader(fileName, overrides);
  // Server-side coupling: ExtraOption1 mirrors the main Dialyzer select.
  if (data.dialyzerType && data.dialyzerCartridgeExtra !== data.dialyzerType) {
    console.log(
      `[DialysisOrder] Aligning dialyzerCartridgeExtra → "${data.dialyzerType}" ` +
      `(server keeps ExtraOption1 in sync with Dialyzer)`,
    );
    data.dialyzerCartridgeExtra = data.dialyzerType;
  }
  return data;
}
