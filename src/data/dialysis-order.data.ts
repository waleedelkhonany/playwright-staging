// =========================================================================
// Dialysis Order — data type
// =========================================================================
//
// Data model for the "Dialysis Order" creation modal opened from the
// Physician Orders → Dialysis Order tab on the Patient detail page.
//
// The modal contains two sections:
//   1. "Dialysis Order Type"  — the main prescription (selects #0..#23)
//   2. "Additional Information" — a fuller duplicate set (selects #24..#48)
//
// Field values are the OPTION TEXTS exactly as rendered in the modal
// (e.g. "AV-Fistula", "36.0°C", "1.6 m²"). Concrete values (not "Other")
// are used deliberately so no conditional "other_*" inputs are required.
//
// Test data lives in config/physician-order-scenarios/dialysis-order.scenario.json
// and is loaded via src/helpers/dialysis-order-data.loader.ts (getDialysisOrderData).

export interface DialysisOrderData {
  // --- Section 1: Dialysis Order Type ---
  /** "Conventional Dialysis" | "Portable Low Dialysate Dialysis" */
  orderType: string;
  /** "Hemodialysis (HD)" | "Hemodiafiltration (HDF)" | "Other" */
  modality: string;
  /** Dry weight in Kg (text input) */
  dryWeight: string;
  /** Ultrafiltration in L (text input) */
  uf: string;
  /** "AV-Fistula" | "AV-Graft" | "Central Venous Catheter (CVC) – Temporary" | "Permacath" | "Other" */
  vascularAccessType: string;
  /** "Right" | "Left" | "Other" */
  accessSite: string;
  /** "15G" | "16G" | "17G" | "Other" */
  needleGauge: string;
  /** "Heparin" | "Normal Saline" | "Other" */
  dwellType: string;
  dwellVolumeArterial: string;
  dwellVolumeVenous: string;
  /** "Twice per week" | "Three times per week" | "Four times per week" | "Five times per week" | "Other" */
  frequency: string;
  /** "3 hours" | "3.5 hours" | "4 hours" | "4.5 hours" | "5 hours" | "Other" */
  duration: string;
  /** "200 mL/min" .. "500 mL/min" | "Other" */
  bloodFlowRate: string;
  /** "Bicarbonate" | "Lactate" | "Other" */
  dialysateType: string;
  /** "35" | "Other" */
  picar: string;
  /** "40%" | "45%" | "Other" */
  lactatePercent: string;
  /** "130 mmol/L" | "135 mmol/L" | "138 mmol/L" | "140 mmol/L" | "Other" */
  dialysateSodium: string;
  /** "1 mmol/L" | "2 mmol/L" | "3 mmol/L" | "Other" */
  potassium: string;
  /** "30 mmol/L" | "35 mmol/L" | "38 mmol/L" | "40 mmol/L" | "Other" */
  bicarbonate: string;
  /** "1.25 mmol/L" | "1.5 mmol/L" | "1.75 mmol/L" | "Other" */
  calcium: string;
  /** "35.5°C" | "36.0°C" | "36.5°C" | "37.0°C" | "Other" */
  temperature: string;
  /** "Unfractionated Heparin (UFH)" | "Low Molecular Weight Heparin (LMWH)" | "Saline Flushes" | "None / Free" */
  anticoagulationType: string;
  /** "High Flux" | "Low Flux" | "Other" */
  dialyzerType: string;
  /** "1.0 m²" .. "2.2 m²" | "Other" */
  dialyzerSurfaceArea: string;

  // --- Section 2: Additional Information ---
  /** Pre-selected "Hemodialysis (HD)" — kept for explicitness */
  mode: string;
  /** "20L" .. "60L" | "Other" */
  dialysateVolume: string;
  /** "Cartridge 172" | "Cartridge 124" | "Other" */
  dialyzerCartridge: string;
  /** Extra dialyzer type ("High Flux" | "Low Flux" | "Other") */
  dialyzerCartridgeExtra: string;
  /** "140 mmol/L" | "Other" */
  electrolyteSodium: string;
  /** "1 mmol/L" | "2 mmol/L" | "3 mmol/L" | "Other" */
  electrolytePotassium: string;
  /** "1.5 mmol/L" | "Other" */
  electrolyteCalcium: string;
  /** "1 g" | "Other" */
  electrolyteGlucose: string;
  /** "35.5°C" | "36.0°C" | "36.5°C" | "37.0°C" | "Other" */
  dialysateTemperature: string;
  /** Free-text instructions */
  additionalInformation: string;
}

