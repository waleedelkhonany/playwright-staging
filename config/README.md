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
| `"DYNAMIC"` | Generates a fresh random value each test run via the loader's `DYNAMIC_GENERATORS` map | `"visitType": "DYNAMIC"` → picks a random visit type |
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
| `{{random_visit_type}}` | Random visit type from the available options |

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

---

## Available Scenario Files

### Appointment Scenarios (`config/appointment-scenarios/`)

| File | Description |
|---|---|
| `full-appointment.scenario.json` | All fields populated with DYNAMIC values; used for standard create-appointment tests |
| `minimal-appointment.scenario.json` | Only visitType + appointmentDate; time and notes fall to defaults |
| `morning-appointment.scenario.json` | Fixed 09:00–10:00 slot with "Initial Visit" type; demonstrates static+dynamic mixing |

### Patient Scenarios (`config/patient-scenarios/`)

| File | Description |
|---|---|
| `full-patient.scenario.json` | All required + optional fields with DYNAMIC values; used for standard create-patient tests |
| `minimal-patient.scenario.json` | Only required fields; empty strings fall to defaults |
| `female-saudi-patient.scenario.json` | Static gender=Female, nationality=Saudi Arabian, maritalStatus=Married |

---

## Usage in Tests

### Appointment Test Example

```typescript
import { test, expect } from '../src/fixtures/auth.fixture';
import { getAppointmentData } from '../src/helpers/appointment-data.loader';
import config from '../config/config.json';

test('should create an appointment', async ({ patientsPage }) => {
  // 1. Read the target patient from config.json (single source of truth)
  const targetPatient = config.appointment.targetPatientIdentifier;

  // 2. Load resolved form payload via the loader
  const appointment = getAppointmentData('full-appointment.scenario.json');

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
  "_description": "Afternoon slot scenario — static 14:00 time, specific visit type, dynamic notes.",
  "_config": {
    "defaultDurationMinutes": 60
  },
  "_fields": {
    "visitType":         "Treatment Nurse Visit",
    "appointmentDate":   "{{future_date}}",
    "appointmentTime":   "14:00",
    "endTime":           "15:00",
    "assignedStaff":     "",
    "notes":             "DYNAMIC"
  }
}
```

Then use it in a test:

```typescript
const appointment = getAppointmentData('afternoon-appointment.scenario.json');
// Target patient: config.appointment.targetPatientIdentifier from config.json
```

---

## Creating a New Scenario

1. **Create the JSON file** in the appropriate subdirectory under `config/`:
   - `config/appointment-scenarios/` for appointment tests
   - `config/patient-scenarios/` for patient tests

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
└── appointment-data.loader.ts       ← appointment: getAppointmentData()
```

Each domain loader:
1. Defines `DEFAULT_GENERATORS` (fallback values for empty fields)
2. Defines `DYNAMIC_GENERATORS` (random generators for `"DYNAMIC"` values)
3. Defines `TEMPLATE_RESOLVERS` (named template → generator mapping)
4. Calls `createDataLoader<T>({ name, dataDir, defaults, dynamic, templates })`
5. Exports a function (`getPatientData` / `getAppointmentData`) that reads a scenario file, resolves `_fields` entries, and returns a typed data object

The `_config` block is NOT processed by the loader — it's read directly by the test via a standard JSON import. This keeps configuration simple and type-safe.
