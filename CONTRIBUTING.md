# Contributing to CareConnect KSA E2E Tests

This document outlines the conventions, patterns, and workflows for contributing to the Playwright E2E test suite for CareConnect KSA (staging).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Architecture Overview](#architecture-overview)
- [Test Structure](#test-structure)
- [Scenario File Pattern (The Unified Approach)](#scenario-file-pattern-the-unified-approach)
  - [JSON File Anatomy](#json-file-anatomy)
  - [`_config` Block](#_config-block)
  - [`_fields` Block](#_fields-block)
  - [Value Resolution Rules](#value-resolution-rules)
  - [Available Templates](#available-templates)
- [Writing a New Test](#writing-a-new-test)
  - [Step 1: Create a Scenario File](#step-1-create-a-scenario-file)
  - [Step 2: Write the Test](#step-2-write-the-test)
  - [Step 3: Add Console Logging and Assertions](#step-3-add-console-logging-and-assertions)
- [Running Tests](#running-tests)
- [Debugging](#debugging)
- [Best Practices](#best-practices)
- [File Reference](#file-reference)

---

## Project Overview

This repository contains **Playwright E2E tests** for the CareConnect KSA healthcare management system (staging environment). Tests cover:

- **Patient CRUD** — creating patients with full, minimal, and custom data
- **Appointment lifecycle** — creating, viewing, confirming care team, and check-in

Tests use a **JSON-driven data approach**: test data lives in scenario JSON files (`.scenario.json`) under `config/`, not in TypeScript factories. This makes test data visible, editable, and reusable without touching code.

---

## Prerequisites

- **Node.js** >= 18 (LTS recommended)
- **npm** >= 9
- **Google Chrome** or Chromium (for headed/headless test execution)
- Access to the CareConnect KSA staging environment

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install --with-deps

# 3. Configure environment
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```
BASE_URL=https://your-staging-instance.com
APP_USERNAME=your-username
APP_PASSWORD=your-password
HEADLESS=false   # Set to true for CI, false for development
```

---

## Architecture Overview

```
config/
├── config.json                          ← Global settings (headerContext, timeouts, staff)
├── README.md                            ← Scenario file documentation
├── appointment-scenarios/
│   ├── full-appointment.scenario.json
│   ├── minimal-appointment.scenario.json
│   └── morning-appointment.scenario.json
├── physician-order-scenarios/
│   ├── dialysis-order.scenario.json
│   ├── dynamic-dialysis-order.scenario.json
│   ├── hdf-dialysis-order.scenario.json
│   └── lab-order.scenario.json
└── patient-scenarios/
    ├── full-patient.scenario.json
    ├── minimal-patient.scenario.json
    └── female-saudi-patient.scenario.json

src/
├── data/
│   ├── patient.data.ts                  ← PatientData type definition
│   └── appointment.data.ts              ← AppointmentData type definition
├── helpers/
│   ├── data.loader.ts                   ← Generic loader: createDataLoader<T>()
│   ├── patient-data.loader.ts           ← getPatientData()
│   ├── appointment-data.loader.ts       ← getAppointmentData()
│   ├── header-context.helper.ts         ← ensureHeaderContext()
│   ├── saudi-phone.helper.ts            ← Saudi phone number generation
│   └── login.helper.ts                  ← Login flow
├── pages/
│   ├── patients.page.ts                 ← Patient page object (form fill, search, etc.)
│   ├── appointment-detail.page.ts       ← Appointment modal interactions
│   ├── visits.page.ts                   ← Visit details page
│   ├── header.page.ts                   ← Header navigation
│   ├── employees.page.ts                ← Employees page
│   └── login.page.ts                    ← Login page
└── fixtures/
    └── auth.fixture.ts                  ← Auto-login + page objects fixture

tests/
├── patients.spec.ts                     ← Patient CRUD tests
├── create-appointment.spec.ts           ← Appointment creation tests
├── create-view-checkin-appointment.spec.ts  ← Combined lifecycle test
├── view-and-checkin-appointment.spec.ts ← View & check-in test
├── physician-orders.spec.ts             ← Create Dialysis Order test
├── lab-order.spec.ts                    ← Create Lab Order test
└── header-context.spec.ts               ← Header context tests
```

### Data Flow

```
.scenario.json
  ├─ _config   → imported directly by test  → test params (targetPatientId, etc.)
  └─ _fields   → loaded by getPatientData()  → resolved data object → page object → form
                       or getAppointmentData()
```

The `_config` block is **not processed by the loader** — tests import it directly via standard JSON import. The `_fields` block is processed by the generic `createDataLoader<T>()` which resolves `"DYNAMIC"`, `"{{template}}"`, and empty values.

---

## Test Structure

A well-structured test follows this pattern:

### Appointment Test

```typescript
import { test, expect } from '../src/fixtures/auth.fixture';
import { getAppointmentData } from '../src/helpers/appointment-data.loader';
import config from '../config/config.json';

test('should create an appointment', async ({ patientsPage }) => {
  // 1. Read the target patient from config.json (single source of truth)
  const targetPatient = config.appointment.targetPatientIdentifier;

  // 2. Load resolved form payload
  const appointment = getAppointmentData('full-appointment.scenario.json');

  // 3. Console log the test data
  console.log(`Target: ${targetPatient}, Visit: ${appointment.visitType}`);

  // 4. Execute the workflow
  await patientsPage.navigateToPatients();
  const message = await patientsPage.createAppointment(targetPatient, appointment);

  // 5. Assert success
  expect(message).toBeTruthy();
  console.log(`✅ Appointment created: ${message}`);
});
```

### Patient Test

```typescript
import { test, expect } from '../src/fixtures/auth.fixture';
import { getPatientData } from '../src/helpers/patient-data.loader';

test('should create a patient', async ({ patientsPage }) => {
  // Load resolved form payload
  const patient = getPatientData('full-patient.scenario.json');

  // Console log key data
  console.log(`Creating patient: ${patient.givenNameEn} ${patient.familyNameEn}`);

  // Execute workflow
  await patientsPage.navigateToPatients();
  await patientsPage.addPatient(patient);

  // Assert success
  const success = await patientsPage.isSuccessMessageVisible();
  expect(success).toBe(true);
});
```

---

## Scenario File Pattern (The Unified Approach)

All test data is managed through **scenario files** — JSON files that bundle test parameters and form payload data together.

### JSON File Anatomy

Every scenario file follows this structure:

```json
{
  "_description": "What this scenario tests and any special notes.",
  "_config": {
    "defaultDurationMinutes": 60
  },
  "_fields": {
    "visitType":         "DYNAMIC",
    "appointmentDate":   "{{future_date}}",
    "appointmentTime":   "09:00",
    "endTime":           "10:00",
    "assignedStaff":     "",
    "notes":             "DYNAMIC"
  }
}
```

The target patient identifier is defined once in `config/config.json`
(`appointment.targetPatientIdentifier`) so all appointment tests use the same
patient — do not duplicate it in scenario files.

### `_config` Block

Holds **test parameters** that control how the test runs but are not form fields. Read directly by the test via JSON import.

**Appointment `_config`:**
```json
"_config": {
  "defaultDurationMinutes": 60          // End time = start time + this
}
```

The patient to search for comes from `config/config.json`
(`appointment.targetPatientIdentifier`).

**Patient `_config`:**
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

### `_fields` Block

Holds the **actual form payload** — the data that gets filled into UI form fields. These are resolved by the generic data loader.

### Value Resolution Rules

| Value in JSON | Behaviour | Example |
|---|---|---|
| `""` (empty string) or `null` | Falls back to a sensible default defined in the loader's `DEFAULT_GENERATORS` map | `"mobile": ""` → generates a random Saudi phone |
| `"DYNAMIC"` | Generates a fresh random value each test run | `"visitType": "DYNAMIC"` → picks a random visit type |
| `"{{template}}"` | Resolves a named template placeholder | `"givenNameEn": "{{random_first_name}}"` → faker first name |
| any other string | Used verbatim as a static value | `"gender": "Female"` → always "Female" |

### Available Templates

**Appointment templates:**

| Template | Resolves to |
|---|---|
| `{{today_date}}` | Today's date (YYYY-MM-DD) |
| `{{current_time}}` | Current time (HH:MM) |
| `{{future_date}}` | Random future date within 30 days |
| `{{random_time}}` | Random business-hours time |
| `{{random_notes}}` | Random lorem-ipsum sentence |
| `{{random_visit_type}}` | Random visit type |

**Patient templates:**

| Template | Resolves to |
|---|---|
| `{{random_first_name}}` | Random English first name |
| `{{random_last_name}}` | Random English last name |
| `{{random_full_name}}` | Random English full name |
| `{{random_phone}}` | Random Saudi mobile number |
| `{{random_national_id}}` | Random 10-digit national ID |
| `{{random_dob}}` | Random date of birth (age 18–70) |
| `{{random_email}}` | Random email address |
| `{{random_ar_first}}` | Random Arabic first name |
| `{{random_ar_last}}` | Random Arabic last name |

---

## Writing a New Test

### Step 1: Create a Scenario File

Create a new JSON file in the appropriate directory under `config/`:

```
config/appointment-scenarios/my-new-scenario.scenario.json
```

Follow the structure above. Reference existing scenario files for examples.

### Step 2: Write the Test

Create a new `.spec.ts` file in `tests/` or add a test to an existing file.

The test should:
1. **Import** the scenario JSON for `_config` values
2. **Call** `getPatientData()` or `getAppointmentData()` with the scenario filename
3. **Navigate** to the page using the page object
4. **Execute** the workflow using the page object methods
5. **Assert** success using `expect()`

### Step 3: Add Console Logging and Assertions

Always log the test data being used — this makes debugging failures much easier:

```typescript
console.log('═══════════════════════════════════════════════');
console.log('  MY SCENARIO');
console.log(`  Field: ${data.field}`);
console.log('═══════════════════════════════════════════════');
```

---

## Running Tests

```bash
# Run all tests (headless)
npm test

# Run all tests (headed — visible browser)
npm run test:headed

# Run a specific test file
npx playwright test tests/patients.spec.ts

# Run a specific test by name
npx playwright test -g "should create a patient"

# Run tests in debug mode (with Playwright Inspector)
npm run test:debug

# Run tests with Chromium only
npm run test:chrome

# Generate tests with Playwright Codegen
npm run codegen

# View the HTML report after a run
npm run report
```

### Configuration

| Setting | How to set |
|---|---|
| Base URL | `BASE_URL` in `.env` |
| Credentials | `APP_USERNAME` / `APP_PASSWORD` in `.env` |
| Headless/Headed | `HEADLESS` in `.env` or `headless` in `config/config.json` |
| Timeouts | `NAVIGATION_TIMEOUT` / `ELEMENT_TIMEOUT` in `.env` or `config/config.json` |
| Header context (Branch/Location) | `headerContext` in `config/config.json` |

---

## Debugging

### Playwright Inspector

```bash
npx playwright test --debug
```

### Console Logs

Tests log key data to the console. Check the test output for:
- Patient names, mobile numbers, and identifiers
- Appointment visit types, dates, and times
- Success/failure messages from the application

### Artifacts

After a test run, check `test-results/artifacts/` for:
- **Screenshots** (captured on validation errors)
- **Videos** (full test recording)
- **Traces** (step-by-step Playwright trace for debugging)

To open a trace:
```bash
npx playwright show-trace test-results/artifacts/trace.zip
```

### Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `SyntaxError: Expected double-quoted property name in JSON` | Trailing comma in a `.scenario.json` file | Remove the trailing comma — JSON is strict |
| `Cannot find module '../../config/...'` | Wrong import path | Tests are in `tests/`, so paths start with `../` |
| `BASE_URL is not set` | Missing `.env` file | Copy `.env.example` to `.env` and fill in values |
| Header context mismatch | Wrong Branch/Location in `config/config.json` | Update `headerContext.targetBranch` and `targetLocation` |

---

## Best Practices

### 1. Use Scenario Files for Test Data

**Do** ✅
```typescript
const patient = getPatientData('my-scenario.scenario.json');
```

**Don't** ❌
```typescript
const patient = {
  firstNameAr: fakerAr.person.firstName(),
  givenNameEn: fakerEn.person.firstName(),
  // ...
};
```

### 2. Keep `_config` Minimal

Only put values in `_config` that:
- Are consumed directly by the test (not by the page object or loader)
- Vary between scenarios
- Are not form fields

### 3. Name Scenario Files Descriptively

Use names that describe the scenario, not just the data shape:

- ✅ `morning-appointment.scenario.json` — describes the *scenario*
- ✅ `female-saudi-patient.scenario.json` — describes the *constraints*
- ❌ `appointment-data.json` — too generic
- ❌ `test-data.json` — meaningless

### 4. No Trailing Commas in JSON

```json
// ❌ Invalid — trailing comma after last field
{ "a": "1", "b": "2", }

// ✅ Valid — no trailing comma
{ "a": "1", "b": "2" }
```

### 5. Use `_description` in Scenario Files

Always include a `_description` field explaining what the scenario tests. This serves as inline documentation for future contributors.

### 6. Prefer the `auth.fixture`

Use `import { test, expect } from '../src/fixtures/auth.fixture'` instead of the default Playwright `test` — it provides auto-login and pre-instantiated page objects (`patientsPage`, etc.).

### 7. Use `ensureHeaderContext` in `beforeEach`

When writing new test files that interact with the header (Branch/Location), add a `beforeEach` that calls `ensureHeaderContext(page)`:

```typescript
test.beforeEach(async ({ page }) => {
  await ensureHeaderContext(page);
});
```

This is already done for all appointment tests. Patient tests rely on the auth fixture for header context sync.

### 8. Keep Imports Clean

Remove unused imports. If a scenario JSON is imported solely for `_config` values and those values are not yet used by the test, document the import pattern in a comment rather than keeping dead imports:

```typescript
// Import scenario when _config values are needed:
// import scenario from '../config/patient-scenarios/my-scenario.scenario.json';
```

---

## File Reference

| File | Purpose |
|---|---|
| `config/config.json` | Global settings: header context, timeouts, staff names, locale, target patient identifier |
| `config/README.md` | Detailed documentation of the scenario file pattern |
| `config/appointment-scenarios/*.json` | Appointment test data files |
| `config/patient-scenarios/*.json` | Patient test data files |
| `src/helpers/data.loader.ts` | Generic JSON data loader (`createDataLoader<T>()`) |
| `src/helpers/patient-data.loader.ts` | Patient-specific loader (`getPatientData()`) |
| `src/helpers/appointment-data.loader.ts` | Appointment-specific loader (`getAppointmentData()`) |
| `src/helpers/header-context.helper.ts` | Header context verification and switching |
| `src/helpers/saudi-phone.helper.ts` | Saudi phone number generation utilities |
| `src/fixtures/auth.fixture.ts` | Auto-login fixture with page object injection |
| `src/pages/patients.page.ts` | Patient page object — form filling, search, appointments |
| `src/pages/appointment-detail.page.ts` | Appointment detail modal — confirm, check-in |
| `src/pages/physician-orders.page.ts` | Physician Orders → Dialysis Order & Lab Order creation |
| `src/data/dialysis-order.data.ts` | DialysisOrderData interface |
| `src/helpers/dialysis-order-data.loader.ts` | Loads Dialysis Order scenarios with DYNAMIC generators + templates (`getDialysisOrderData()`) |
| `config/physician-order-scenarios/dialysis-order.scenario.json` | Dialysis Order form payload (static baseline) |
| `config/physician-order-scenarios/dynamic-dialysis-order.scenario.json` | Dialysis Order payload — all fields DYNAMIC (random values/choices each run) |
| `config/physician-order-scenarios/hdf-dialysis-order.scenario.json` | Dialysis Order payload — fixed Portable + HDF, rest DYNAMIC |
| `tests/physician-orders.spec.ts` | E2E tests — create a Dialysis Order (loops over all 3 scenarios) |
| `src/data/lab-order.data.ts` | LabOrderData interface |
| `src/helpers/lab-order-data.loader.ts` | Loads `lab-order.scenario.json` (`getLabOrderData()`) |
| `config/physician-order-scenarios/lab-order.scenario.json` | Lab Order form payload |
| `tests/lab-order.spec.ts` | E2E test — create a Lab Order |
| `src/pages/visits.page.ts` | Visit details page verification |
| `playwright.config.ts` | Playwright runner configuration |
| `.env.example` | Environment variable template |
