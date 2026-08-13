# Scenario Files — Test Data Configuration

This directory contains **scenario JSON files** — the single source of truth for all test data in the Playwright E2E suite. Each scenario file bundles **test parameters** and **form payload data** together so a test can be fully described by a single JSON file.

---

## Table of Contents

- [Directory Structure](#directory-structure)
- [File Format](#file-format)
  - [`_config` block](#_config-block)
  - [`_fields` block](#_fields-block)
- [Value Resolution Rules](#value-resolution-rules)
- [Available Scenario Files](#available-scenario-files)
- [Usage in Tests](#usage-in-tests)
  - [Appointment Test Example](#appointment-test-example)
  - [Patient Test Example](#patient-test-example)
  - [Custom Scenario Example](#custom-scenario-example)
- [Creating a New Scenario](#creating-a-new-scenario)
- [How the Loader Works](#how-the-loader-works)

---

## Directory Structure

```
config/
├── README.md                          ← this file
├── config.json                        ← global settings (headerContext, timeouts, etc.)
├── appointment-scenarios/             ← appointment form payloads + config
│   ├── full-appointment.scenario.json
│   ├── minimal-appointment.scenario.json
│   └── morning-appointment.scenario.json
├── physician-order-scenarios/         ← physician order form payloads + config
│   ├── dialysis-order.scenario.json
│   ├── dynamic-dialysis-order.scenario.json
│   ├── hdf-dialysis-order.scenario.json
│   └── lab-order.scenario.json
├── flow-sheet-scenarios/              ← flow sheet form payloads
│   └── flow-sheet.scenario.json
├── patient-assessment-scenarios/      ← patient assessment form payloads
│   └── patient-assessment.scenario.json
├── discontinuation-scenarios/         ← discontinue of hemodialysis form payloads
│   └── discontinuation.scenario.json
├── vascular-access-scenarios/         ← vascular access assessment form payloads
│   └── vascular-access.scenario.json
└── patient-scenarios/                 ← patient form payloads + config
    ├── full-patient.scenario.json
    ├── minimal-patient.scenario.json
    └── female-saudi-patient.scenario.json
```

---

## File Format

Every scenario file is a single JSON with three top-level keys:

```json
{
  "_description": "Human-readable explanation of what this scenario tests.",
  "_config": { /* test parameters — read directly by the test */ },
  "_fields":  { /* form payload — resolved by the generic loader */ }
}
```

### `_config` block

Holds **test parameters** that are not form fields but control how the test runs. Read directly by the test via a JSON import.

**Appointment `_config` example:**
```json
"_config": {
  "defaultDurationMinutes": 60
}
```

> **Note:** The target patient identifier is **not** stored in scenario files. It
> is defined once in `config/config.json` under `appointment.targetPatientIdentifier`
> so every appointment test targets the same patient — do not duplicate it here.

**Patient `_config` example:**
```json
"_config": {
  "staff": {
    "primaryTeamLeaderNurse": "Test Nurse",
    "primaryNurseName": "Test Nurse",
    "primaryPhysicianName": "Test_Doctor",
    "primarySocialWorkerName": "waad.albaqami"
  }
}
```

### `_fields` block

Holds the **actual form payload** — the data that gets filled into UI form fields. These values are resolved by the generic data loader (`src/helpers/data.loader.ts`). Each field supports one of the value types described below.

```
_fields entries → loader → resolved data object → page object → form
```

---

## Value Resolution Rules

Each field in `_fields` is resolved according to this table:

| Value in JSON | Behaviour | Example |
|---|---|---|
| `""` (empty string) or `null` | Falls back to a sensible default defined in the loader's `DEFAULT_GENERATORS` map | `"mobile": ""` → generates a random Saudi phone |
| `"DYNAMIC"` | Generates a fresh random value each test run via the loader's `DYNAMIC_GENERATORS` map | `"notes": "DYNAMIC"` → picks a random sentence |
| `"{{template}}"` | Resolves a named template placeholder from the loader's `TEMPLATE_RESOLVERS` map | `"givenNameEn": "{{random_first_name}}"` → faker first name |
| any other string | Used verbatim as a static value | `"gender": "Female"` → always "Female" |

**Available templates (appointments):**
| Template | Resolves to |
|---|---|
| `{{today_date}}` | Today's date in YYYY-MM-DD format |
| `{{current_time}}` | Current time in HH:MM format |
| `{{future_date}}` | Random future date within 30 days |
| `{{random_time}}` | Random business-hours time |
| `{{random_notes}}` | Random lorem-ipsum sentence |

**Available templates (patients):**
| Template | Resolves to |
|---|---|
| `{{random_first_name}}` | Random English first name (sanitized) |
| `{{random_last_name}}` | Random English last name (sanitized) |
| `{{random_full_name}}` | Random English full name |
| `{{random_phone}}` | Random Saudi mobile number |
| `{{random_national_id}}` | Random 10-digit national ID |
| `{{random_dob}}` | Random date of birth (age 18–70) |
| `{{random_email}}` | Random email address |
| `{{random_ar_first}}` | Random Arabic first name |
| `{{random_ar_last}}` | Random Arabic last name |

**Available templates (dialysis orders):**
| Template | Resolves to |
|---|---|
| `{{random_order_type}}` | Random order type (Conventional Dialysis / Portable Low Dialysate Dialysis) |
| `{{random_modality}}` | Random modality (Hemodialysis (HD) / Hemodiafiltration (HDF)) |
| `{{random_vascular_access}}` | Random vascular access (AV-Fistula / AV-Graft / CVC / Permacath) |
| `{{random_access_site}}` | Random access site (Right / Left) |
| `{{random_needle_gauge}}` | Random needle gauge (15G / 16G / 17G) |
| `{{random_dwell_type}}` | Random dwell type (Heparin / Normal Saline) |
| `{{random_frequency}}` | Random frequency (2–5 times per week) |
| `{{random_duration}}` | Random duration (3–5 hours) |
| `{{random_blood_flow_rate}}` | Random blood flow rate (200–500 mL/min) |
| `{{random_dialysate_type}}` | Random dialysate type (Bicarbonate / Lactate) |
| `{{random_lactate_percent}}` | Random lactate percent (40% / 45%) |
| `{{random_dialysate_sodium}}` | Random dialysate sodium (130–140 mmol/L) |
| `{{random_potassium}}` | Random potassium (1–3 mmol/L) |
| `{{random_bicarbonate}}` | Random bicarbonate (30–40 mmol/L) |
| `{{random_calcium}}` | Random calcium (1.25–1.75 mmol/L) |
| `{{random_temperature}}` | Random temperature (35.5–37.0°C) |
| `{{random_anticoagulation}}` | Random anticoagulation (UFH / LMWH / Saline Flushes / None) |
| `{{random_dialyzer_type}}` | Random dialyzer type (High Flux / Low Flux) |
| `{{random_dialyzer_surface}}` | Random dialyzer surface area (1.0–2.2 m²) |
| `{{random_dialysate_volume}}` | Random dialysate volume (20L–60L) |
| `{{random_cartridge}}` | Random cartridge (172 / 124) |
| `{{random_dry_weight}}` | Random dry weight in kg (55–120) |
| `{{random_uf}}` | Random ultrafiltration in L (1.0–4.0) |
| `{{random_dwell_volume}}` | Random dwell volume in mL (100–250) |
| `{{random_notes}}` | Random lorem-ipsum test note |

---

## Available Scenario Files

### Appointment Scenarios (`config/appointment-scenarios/`)

| File | Description |
|---|---|
| `full-appointment.scenario.json` | All fields populated with DYNAMIC values; used for standard create-appointment tests |
| `minimal-appointment.scenario.json` | Only appointmentDate; time and notes fall to defaults |
| `morning-appointment.scenario.json` | Fixed 09:00–10:00 slot; demonstrates static+dynamic mixing |

The target patient identifier and visit type are NOT in scenario files — they
live in `config/config.json` (`appointment.targetPatientIdentifier`,
`appointment.visitType`) so all appointment tests share one consistent value.
Pass the visit type as an override when loading the scenario.

### Physician Order Scenarios (`config/physician-order-scenarios/`)

| File | Description |
|---|---|
| `dialysis-order.scenario.json` | Dialysis Order modal payload — static baseline with concrete option texts (AV-Fistula, 36.0°C, etc.); loaded via `getDialysisOrderData()` |
| `dynamic-dialysis-order.scenario.json` | Dialysis Order modal payload — EVERY field is `DYNAMIC`, so each test run fills different values and different select choices (randomized from the exact staging option texts, excluding "Other") |
| `hdf-dialysis-order.scenario.json` | Dialysis Order modal payload — fixed Portable Low Dialysate Dialysis + Hemodiafiltration (HDF) combo with every other field `DYNAMIC`; exercises a different form branch than the conventional-HD baseline |
| `lab-order.scenario.json` | Lab Order form payload — lab company, collection-by, due date, two Lab Test options (Sodium (Na+), Hemoglobin) for the two test rows, free text; loaded via `getLabOrderData()` |

### Patient Scenarios (`config/patient-scenarios/`)

| File | Description |
|---|---|
| `full-patient.scenario.json` | All required + optional fields with DYNAMIC values; used for standard create-patient tests |
| `minimal-patient.scenario.json` | Only required fields; empty strings fall to defaults |
| `female-saudi-patient.scenario.json` | Static gender=Female, nationality=Saudi Arabian, maritalStatus=Married |

### Patient Assessment Scenario (`config/patient-assessment-scenarios/`)

| File | Description |
|---|---|
| `patient-assessment.scenario.json` | Patient Assessment form payload — static options matched to the staging radio values/labels + DYNAMIC medical/medication history sentences; loaded via `getPatientAssessmentData()`. Read-only vitals/pain/height/weight/designation fields (auto-filled from the Flow Sheet) are intentionally absent. The target visit ID is NOT here — it lives in `config/config.json` (`patientAssessment.visitId`). |

### Discontinuation Scenario (`config/discontinuation-scenarios/`)

| File | Description |
|---|---|
| `discontinuation.scenario.json` | REFUSAL/DISCONTINUATION OF HEMODIALYSIS SESSION/S form payload — bilingual: fills BOTH the English (`*_en`) and Arabic (`*_ar`) sides because the save() handler persists both. Static checkbox ids (`Discontinuation`, `Refusal`, `Hyperkalemia`, `Cardiac`, `Pulmonary`, `Acidosis` + Arabic equivalents), relationship select texts (`Spouse`, `Son`, `زوج/زوجة`, `ابن`), datetime-local signature timestamps, and DYNAMIC English discontinuation reason; loaded via `getDiscontinuationData()`. The read-only patient header and the signature-image upload (`uploadFile`) are intentionally absent. The target visit ID is NOT here — it lives in `config/config.json` (`discontinuation.visitId`). |

### Vascular Access Scenario (`config/vascular-access-scenarios/`)

| File | Description |
|---|---|
| `vascular-access.scenario.json` | VASCULAR ACCESS ASSESSMENT TOOL form payload — Arteriovenous Fistula (AVF) branch: access-type select (`Arteriovenous Fistula (AVF)`), AVF site select (`Right Radiocephalic AVF (Wrist)`), creation date, access-type checkbox, K. Needle Insertion scoring checkboxes (b_redness_0, b_swelling_0, c_thrill_10, c_temp_0, c_tenderness_0, d_bruit_20, e_function_clean_0), post-care (dressing applied Yes + date, tego changed No + date) and low-risk interventions (low_continue_assessment, low_dressing_technique, low_educate_access_care); loaded via `getVascularAccessData()`. The catheter bundle (f_*/g_*) is intentionally absent (AVF access). The computed total score and the signature-image upload are NOT part of the model. The target visit ID is NOT here — it lives in `config/config.json` (`vascularAccess.visitId`). |

---

## Usage in Tests

### Appointment Test Example

```typescript
import { test, expect } from '../src/fixtures/auth.fixture';
import { getAppointmentData } from '../src/helpers/appointment-data.loader';
import config from '../config/config.json';

test('should create an appointment', async ({ patientsPage }) => {
  // 1. Read shared config from config.json (single source of truth)
  const targetPatient = config.appointment.targetPatientIdentifier;
  const visitType = config.appointment.visitType;

  // 2. Load resolved form payload via the loader (visitType from config.json)
  const appointment = getAppointmentData('full-appointment.scenario.json', { visitType });

  // 3. Execute the workflow
  await patientsPage.navigateToPatients();
  const message = await patientsPage.createAppointment(targetPatient, appointment);

  // 4. Assert
  expect(message).toBeTruthy();
});
```

### Patient Test Example

```typescript
import { test, expect } from '../src/fixtures/auth.fixture';
import { getPatientData } from '../src/helpers/patient-data.loader';

test('should create a patient', async ({ patientsPage }) => {
  // Load resolved form payload via the loader
  const patient = getPatientData('full-patient.scenario.json');

  // Execute the workflow
  await patientsPage.navigateToPatients();
  await patientsPage.addPatient(patient);

  // Assert
  const successVisible = await patientsPage.isSuccessMessageVisible();
  expect(successVisible).toBe(true);
});
```

### Custom Scenario Example

Create a new file `config/appointment-scenarios/afternoon-appointment.scenario.json`:

```json
{
  "_description": "Afternoon slot scenario — static 14:00 time, dynamic notes.",
  "_config": {
    "defaultDurationMinutes": 60
  },
  "_fields": {
    "appointmentDate":   "{{future_date}}",
    "appointmentTime":   "14:00",
    "endTime":           "15:00",
    "assignedStaff":     "",
    "notes":             "DYNAMIC"
  }
}
```

The visit type is not part of the scenario — it comes from `config/config.json`
(`appointment.visitType`). Then use it in a test:

```typescript
const appointment = getAppointmentData('afternoon-appointment.scenario.json', {
  visitType: config.appointment.visitType,
});
// Target patient: config.appointment.targetPatientIdentifier from config.json
```

---

## Creating a New Scenario

1. **Create the JSON file** in the appropriate subdirectory under `config/`:
   - `config/appointment-scenarios/` for appointment tests
   - `config/patient-scenarios/` for patient tests
   - `config/physician-order-scenarios/` for physician order tests (dialysis / lab)

2. **Follow the structure:**
   ```json
   {
     "_description": "Brief explanation of what this scenario covers.",
     "_config": {
       "defaultDurationMinutes": 60
     },
     "_fields": {
       "field1": "STATIC_VALUE",
       "field2": "DYNAMIC",
       "field3": "{{template_name}}",
       "field4": ""
     }
   }
   ```

3. **Rules:**
   - Use `null` or `""` for fields where you want the loader's default
   - Use `"DYNAMIC"` for fields that should be randomized each run
   - Use `"{{template}}"` for specific generated values
   - Use any other string for fixed/static values
   - The target patient identifier is set once in `config/config.json`
     (`appointment.targetPatientIdentifier`) — never in a scenario file

4. **No trailing commas!** JSON is strict — a trailing comma will cause a `SyntaxError` at runtime.

5. **Import** the scenario file in your test and pass the filename (without path) to `getPatientData()` or `getAppointmentData()`.

---

## How the Loader Works

The generic loader lives at `src/helpers/data.loader.ts` and is used by both domain-specific loaders:

```
src/helpers/
├── data.loader.ts                   ← generic: createDataLoader<T>()
├── patient-data.loader.ts           ← patient: getPatientData()
├── appointment-data.loader.ts       ← appointment: getAppointmentData()
├── dialysis-order-data.loader.ts    ← dialysis order: getDialysisOrderData() (DYNAMIC + templates)
├── lab-order-data.loader.ts         ← lab order: getLabOrderData()
├── flow-sheet-data.loader.ts        ← flow sheet: getFlowSheetData()
├── patient-assessment-data.loader.ts ← patient assessment: getPatientAssessmentData()
├── discontinuation-data.loader.ts   ← discontinue of hemodialysis: getDiscontinuationData()
└── vascular-access-data.loader.ts   ← vascular access assessment: getVascularAccessData()
```

Each domain loader:
1. Defines `DEFAULT_GENERATORS` (fallback values for empty fields)
2. Defines `DYNAMIC_GENERATORS` (random generators for `"DYNAMIC"` values)
3. Defines `TEMPLATE_RESOLVERS` (named template → generator mapping)
4. Calls `createDataLoader<T>({ name, dataDir, defaults, dynamic, templates })`
5. Exports a function (`getPatientData` / `getAppointmentData`) that reads a scenario file, resolves `_fields` entries, and returns a typed data object

The `_config` block is NOT processed by the loader — it's read directly by the test via a standard JSON import. This keeps configuration simple and type-safe.
