# CareConnect KSA (Staging) - Playwright E2E Test Map

**Project**: `careconnect-ksa-e2e`  
**Type**: Playwright End-to-End Testing Framework  
**Target Environment**: CareConnect KSA Staging  
**Test Runner**: npm scripts (`npm run test`)

---

## Project Structure

```
.
├── tests/                     # E2E test specifications (.ts files)
│   ├── view-and-checkin-appointment.spec.ts  # View & Check-in appointment workflow
│   ├── patients.spec.ts                      # Patient CRUD operations
│   ├── create-view-checkin-appointment.spec.ts  # Combined create/view/check-in flow
│   ├── create-appointment.spec.ts            # Create appointment workflows
│   ├── physician-orders.spec.ts              # Create Dialysis Order workflow
│   ├── lab-order.spec.ts                     # Create Lab Order workflow
│   ├── flow-sheet.spec.ts                    # Fill the Flow Sheet form of a visit
│   ├── patient-assessment.spec.ts            # Fill the Patient Assessment form of a visit
│   ├── discontinuation.spec.ts               # Fill the Discontinue Of Hemodialysis form of a visit
│   ├── vascular-access.spec.ts               # Fill the Vascular Access Assessment form of a visit
│   ├── employee-create.spec.ts               # Create employee workflow
│   ├── visit_filter.spec.ts                  # Data-driven Visit Filter tests
│   ├── patient_filter.spec.ts                # Data-driven Patient Filter tests
│   └── employee_filter.spec.ts               # Data-driven Employee Filter tests
│
├── src/
│   ├── pages/                 # Page Object Models (POM)
│   │   ├── base.page.ts       # Base class for all page objects
│   │   ├── login.page.ts      # Login page interactions
│   │   ├── patients.page.ts   # Patients module (search, create, appointments)
│   │   ├── header.page.ts     # Top navigation (Branch/Location selectors)
│   │   ├── visits.page.ts     # Visit details/edit page verification
│   │   ├── flow-sheet.page.ts # Flow Sheet form (Visits → edit → Flow Sheet tab)
│   │   ├── patient-assessment.page.ts # Patient Assessment form (Visits → edit → load/visit-form/{id}/patient-assessment)
│   │   ├── discontinuation.page.ts # Discontinue Of Hemodialysis form (Visits → edit → load/visit-form/{id}/dis-of-hemodialysis)
│   │   ├── vascular-access.page.ts # Vascular Access Assessment form (Visits → edit → load/visit-form/{id}/vascular-access-assessment)
│   │   ├── appointment-detail.page.ts  # Appointment modal confirmation & check-in
│   │   ├── employees.page.ts  # Employee management (create form aligned to staging DOM)
│   │   └── filter-list.page.ts  # Shared base for list-page filter specs
│   │
│   ├── fixtures/              # Test fixtures and shared state
│   │   └── auth.fixture.ts    # Auto-login + page object injection
│   │
│   ├── helpers/               # Utility functions and data loaders
│   │   ├── patient-data.loader.ts       # Patient data generation from scenarios
│   │   ├── employee-data.loader.ts      # Employee data generation from scenarios
│   │   ├── appointment-data.loader.ts   # Appointment data generation
│   │   ├── flow-sheet-data.loader.ts    # Flow Sheet form data generation
│   │   ├── patient-assessment-data.loader.ts # Patient Assessment form data generation
│   │   ├── discontinuation-data.loader.ts # Discontinue Of Hemodialysis form data generation
│   │   ├── vascular-access-data.loader.ts # Vascular Access Assessment form data generation
│   │   ├── header-context.helper.ts     # Branch/Location context management
│   │   ├── login.helper.ts              # Login automation logic
│   │   ├── patient-data.loader.ts       # Patient data generator
│   │   └── appointment-data.loader.ts   # Appointment data generator
│   │
│   └── data/                  # Test data definitions
│       ├── patient.data.ts    # Patient data type definitions
│       ├── employee.data.ts   # Employee data type + buildEmployee factory
│       └── appointment.data.ts  # Appointment data type definitions
│
├── config/
│   ├── config.json            # Global configuration (headers, locales)
│   ├── README.md              # Configuration documentation
│   ├── visit_filters.json     # Data-driven Visit Filter test cases
│   ├── patient_filters.json   # Data-driven Patient Filter test cases
│   ├── employee_filters.json  # Data-driven Employee Filter test cases
│   ├── appointment-scenarios/  # Appointment scenario files
│   │   ├── full-appointment.scenario.json     # Full appointment test data
│   │   ├── morning-appointment.scenario.json  # Morning slot appointment
│   │   └── minimal-appointment.scenario.json  # Minimal fields only
│   ├── flow-sheet-scenarios/        # Flow Sheet form payload
│   │   └── flow-sheet.scenario.json        # Full Flow Sheet payload (static options + DYNAMIC comments)
│   ├── patient-assessment-scenarios/ # Patient Assessment form payload
│   │   └── patient-assessment.scenario.json # Full Patient Assessment payload (static options + DYNAMIC history)
│   ├── discontinuation-scenarios/  # Discontinue Of Hemodialysis form payload
│   │   └── discontinuation.scenario.json # Full bilingual (EN+AR) Discontinuation payload
│   ├── vascular-access-scenarios/  # Vascular Access Assessment form payload
│   │   └── vascular-access.scenario.json # AVF-branch payload (access select + scoring + post-care + interventions)
│   ├── physician-order-scenarios/  # Physician order scenario files
│   │   ├── dialysis-order.scenario.json       # Dialysis Order modal payload (static baseline)
│   │   ├── dynamic-dialysis-order.scenario.json  # All fields DYNAMIC (random values/choices)
│   │   ├── hdf-dialysis-order.scenario.json   # Fixed Portable + HDF, rest DYNAMIC
│   │   └── lab-order.scenario.json            # Lab Order form payload
│   ├── patient-scenarios/      # Patient scenario files
│   │   ├── full-patient.scenario.json         # Full patient data
│   │   ├── minimal-patient.scenario.json      # Minimal fields only
│   │   └── female-saudi-patient.scenario.json # Saudi female scenario
│   └── employee-scenarios/     # Employee scenario files
│       ├── full-employee.scenario.json        # Full employee data (licensed title: Nurse)
│       └── minimal-employee.scenario.json     # Minimal fields (non-licensed title: Driver)
│
├── scripts/                   # Diagnostic/debugging scripts
│   ├── diagnose-patient-save.ts       # Diagnose patient save issues
│   ├── investigate-patient-form.ts    # Investigate form structure
│   ├── extract-form-fields.ts         # Extract form field definitions
│   ├── inspect-visit-filter.ts        # Dump Visit Filter DOM on staging
│   ├── inspect-flow-sheet.ts          # Dump Flow Sheet workflow DOM (Visits → edit → tab)
│   ├── inspect-patient-assessment.ts  # Dump Patient Assessment workflow DOM (Visits → edit → load URL)
│   ├── inspect-discontinuation.ts     # Dump Discontinue Of Hemodialysis tab/workflow DOM (Visits → edit → tabs)
│   ├── inspect-discontinuation-form.ts # Dump Discontinue Of Hemodialysis form DOM (load URL)
│   ├── probe-discontinuation-save.ts  # Smoke-test Discontinue Of Hemodialysis save end-to-end
│   ├── probe-discontinuation-readback.ts # Verify persisted Discontinuation values after save
│   ├── inspect-vascular-access.ts     # Dump Vascular Access Assessment form DOM (load URL)
│   ├── diagnose-vascular-access.ts    # Diagnose wire:model vs wire:model.live bindings
│   ├── probe-vascular-access-save.ts  # Smoke-test Vascular Access save end-to-end
│   ├── probe-vascular-access-readback.ts # Verify persisted Vascular Access values after save
│   ├── debug-visit-filter-tc01.ts     # Smoke-test Visit Filter case TC-01
│   ├── inspect-patient-filter.ts      # Dump Patient Filter DOM on staging
│   ├── probe-patient-filter.ts        # Probe patient list pagination/empty state
│   ├── probe-patient-filter-2.ts      # Verify patient filter values
│   ├── inspect-employee-filter.ts     # Dump Employee Filter DOM on staging
│   ├── inspect-employee-create.ts     # Dump Employee create form DOM on staging
│   ├── probe-employee-create.ts       # Smoke-test employee creation end-to-end
│   ├── probe-employee-filter.ts       # Probe employee search behavior
│   ├── probe-employee-filter-2.ts     # Verify employee filter values
│   └── probe-employee-filter-3.ts     # Verify employee combos + pagination
│
├── .env.example               # Environment template (BASE_URL required)
├── package.json               # Project dependencies & scripts
└── playwright.config.ts       # Playwright configuration
```

---

## Key Components

### 1. Test Specifications (`tests/*.spec.ts`)

| File | Description |
|------|-------------|
| `view-and-checkin-appointment.spec.ts` | Full appointment lifecycle: select patient → navigate to appointments → open latest "New" appointment → confirm care team → check-in → redirect to visit page |
| `patients.spec.ts` | Patient CRUD operations: create full patient, create minimal patient, create Saudi female patient with specific constraints |
| `create-view-checkin-appointment.spec.ts` | Combined workflow: create appointment within test → view it → confirm care team → check-in → verify redirect |
| `create-appointment.spec.ts` | Create appointments for existing patients (full, minimal, morning-time slot scenarios) |
| `physician-orders.spec.ts` | Create a Dialysis Order via Physician Orders → Dialysis Order tab (runs 3 scenarios: static baseline, all-DYNAMIC, and HDF-variant) |
| `lab-order.spec.ts` | Create a Lab Order via Physician Orders → Labs & Imaging → Create Lab Order form |
| `flow-sheet.spec.ts` | Fill the Flow Sheet form of the target visit (ID from config.json `flowSheet.visitId`, default 981): Visits directory → edit icon under Actions → Flow Sheet tab → fill every section → Save → assert the "Flow sheet saved successfully!" popup and persisted values |
| `patient-assessment.spec.ts` | Fill the Patient Assessment form of the target visit (ID from config.json `patientAssessment.visitId`, default 1005): Visits directory → edit icon under Actions → Patient Assessment form (`/load/visit-form/{id}/patient-assessment`, opened by the "Patient Assessment" tab) → fill every section → Save (`wire:click="save"`) → assert the URL gains `?row_id={id}` and persisted values |
| `discontinuation.spec.ts` | Fill the REFUSAL/DISCONTINUATION OF HEMODIALYSIS SESSION/S form of the target visit (ID from config.json `discontinuation.visitId`, default 1005): Visits directory → edit icon under Actions → Discontinue Of Hemodialysis form (`/load/visit-form/{id}/dis-of-hemodialysis`, opened by the "Discontinue Of Hemodialysis" tab) → fill every section in English AND Arabic → Save (`wire:click="save"`) → assert the URL gains `?row_id={id}` and persisted values |
| `vascular-access.spec.ts` | Fill the VASCULAR ACCESS ASSESSMENT TOOL form of the target visit (ID from config.json `vascularAccess.visitId`, default 1005): Visits directory → edit icon under Actions → Vascular Access Assessment form (`/load/visit-form/{id}/vascular-access-assessment`, opened by the "VASCULAR ACCESS ASSESSMENT TOOL" tab) → fill access type (AVF branch), scoring checkboxes, post-care (dressing/tego), low-risk interventions → Save (`wire:click="save"`) → assert the URL gains `?row_id={id}` and persisted values |
| `employee-create.spec.ts` | Create an employee via the `/employees/create` Livewire form: fill Main Info (incl. the SCFHS/NPHIES license section for licensed titles), wait for the server-validated "Create" button, assert the success redirect to `/employees/{id}/edit` |
| `visit_filter.spec.ts` | Data-driven Visit Filter tests (config/visit_filters.json): happy path, single filters, empty state, boundary & reset |
| `patient_filter.spec.ts` | Data-driven Patient Filter tests (config/patient_filters.json): name/MRN/mobile/email/ID/status filters, empty state, boundary & reset |
| `employee_filter.spec.ts` | Data-driven Employee Filter tests (config/employee_filters.json): live name/email/mobile + username searches, empty state, boundary & reset |

### 2. Page Object Models (`src/pages/*.ts`)

> **Note:** The three filter specs each keep a lightweight filter-specific
> POM (e.g. `PatientFilterPage`) inline in the spec file. The shared
> result-inspection logic (pagination walk, settle waits, empty-state readers)
> lives in the common `FilterListPage` base in `src/pages/filter-list.page.ts`,
> which all three extend.

#### BasePage (`base.page.ts`)
Shared utilities:
- Navigation helpers (`goto`, `reload`)
- Element waiting (`waitForElementVisible`, `waitForPageLoad`)
- Interactions (`click`, `fill`, `selectByLabel/Value`)
- Utility methods (`getText`, `isVisible`, `takeScreenshot`)
- Alert handling (`acceptDialog`, `dismissDialog`)
- Conditional alert dismissal (`dismissAllergiesAlertIfPresent`)

#### LoginPage (`login.page.ts`)
- Username/password inputs
- Login button, remember checkbox, error messages
- Auto-navigate to login page
- Login execution and success verification

#### PatientsPage (`patients.page.ts`)
**Patient Search & Selection:**
- Navigate to Patients section
- Search by patient ID
- Filter table rows by text
- Select patient from search results

**Patient Creation:**
- Open add patient form
- Fill text inputs (Arabic/English names, contact info, DOB, IDs)
- Fill date inputs (medical acceptance, home settings, referral)
- Set select dropdowns (code status, isolation type, referred hospital, gender, nationality, etc.)
- Set radio buttons (government ID type)
- Select staff via Select2 AJAX dropdowns
- Save patient form

**Appointment Management:**
- Click "Create Appointment" button
- Fill appointment modal (date, time, end time, notes)
- Save appointment
- Navigate to Encounters → Appointments tab
- Open latest appointment by status ("New")

**Utility Methods:**
- `fillIfDefined(locator, value)` - Fill only if value is not null/undefined
- `setSelectByOptionText(tag, index, optionText)` - Set select via JavaScript (reliable for Select2/flatpickr)
- `setRadioValue(name, value)` - Set radio button
- `fillPatientForm(patient)` - Complete patient form with dynamic data
- `syncPatientSystemWithHeaderLocation()` - Auto-sync Patient System with header Location
- `discoverStaffSelectName(patterns)` - Find Select2 element by name patterns
- `selectFromSelect2(selectName, searchText)` - Select from Select2-enhanced dropdown (programmatic → UI fallback)

#### HeaderPage (`header.page.ts`)
**Readers:**
- `getSelectedBranch()` - Get current branch text
- `getSelectedLocation()` - Get current location/system text

**Writers:**
- `selectBranch(branchName)` - Select branch by visible text
- `selectLocation(locationName)` - Select location by visible text
- `ensureContext(targetBranch, targetLocation)` - Ensure header matches targets (idempotent)

**Verifiers:**
- `verifyBranch(expectedBranch)` - Verify current branch
- `verifyLocation(expectedLocation)` - Verify current location
- `verifyHeaderContext(expectedBranch, expectedLocation)` - Verify both simultaneously

**Readers:**
- `getAvailableBranchOptions()` - List all available branches
- `getAvailableLocationOptions()` - List all locations

#### FlowSheetPage (`flow-sheet.page.ts`)
Flow Sheet form on the visit edit page:
- `openVisitFlowSheet(visitId)` — open `/visits`, find the row by visit ID, click the
  edit icon (`fa-pen-to-square` inside `a[title="Edit"]`) under the Actions column,
  then click the "Flow Sheet" tab (`#flowsheet`)
- `fillFlowSheetForm(data)` — fill every section (Outside Dialysis, Pain Assessment,
  Fall Risk, Pre/Post Vascular Access, Alarms Test, Vitals, Nursing Action, Dialysis
  Parameters) via native value setters + events (works for `wire:model`, `wire:model.defer`
  and name-only `meta[...]` fields); empty values are skipped
- `saveFlowSheet()` — click Save (`wire:click="save"`), assert the "Flow sheet
  saved successfully!" SweetAlert2 popup (throws with the server message on a
  "Validation failed" popup)
- `verifySavedValues(data)` — read back representative fields after the save
  re-render to prove persistence

#### PatientAssessmentPage (`patient-assessment.page.ts`)
Patient Assessment form on the visit edit page (the "Patient Assessment" tab
opens `/load/visit-form/{id}/patient-assessment` in a new tab; the POM navigates
there directly):
- `openVisitPatientAssessment(visitId)` — open `/visits`, find the row by visit ID,
  click the edit icon (`fa-pen-to-square` inside `a[title="Edit"]`) under the Actions
  column, then navigate to the Patient Assessment form
- `fillPatientAssessmentForm(data)` — fill every section (Patient Information,
  Assessment, Medical History, Surgical History, Social History, Referral, History
  Given By) via native value setters + events on `wire:model="data.*"` bindings;
  empty values are skipped; read-only vitals/pain/height/weight/designation fields
  (auto-filled from the Flow Sheet) are not mapped
- `savePatientAssessment()` — click Save (`wire:click="save"`), wait for the URL to
  gain `?row_id={id}` (the save signal — no SweetAlert on this form), return the row id
- `verifySavedValues(data)` — read back representative fields after the save
  re-render to prove persistence

#### DiscontinuationPage (`discontinuation.page.ts`)
REFUSAL/DISCONTINUATION OF HEMODIALYSIS SESSION/S form on the visit edit page
(the "Discontinue Of Hemodialysis" tab opens
`/load/visit-form/{id}/dis-of-hemodialysis` in a new tab; the POM navigates
there directly):
- `openVisitDiscontinuation(visitId)` — open `/visits`, find the row by visit ID,
  click the edit icon (`fa-pen-to-square` inside `a[title="Edit"]`) under the Actions
  column, then navigate to the Discontinue Of Hemodialysis form
- `fillDiscontinuationForm(data)` — fill every section in English (`*_en`) AND
  Arabic (`*_ar`) (Reason/Refusal checkboxes + textareas, Witness Information,
  Reason unable to sign, Relative Information, Doctor Information, Interpreter
  Information) via native value setters + events on `wire:model="data.*"` bindings;
  empty values are skipped; the read-only patient header and the signature-image
  upload (`uploadFile`) are not mapped
- `saveDiscontinuation()` — click Save (`wire:click="save"`), wait for the URL to
  gain `?row_id={id}` (the save signal — no SweetAlert on this form), return the row id
- `verifySavedValues(data)` — read back representative fields (EN + AR) after the
  save re-render to prove persistence

#### VascularAccessPage (`vascular-access.page.ts`)
VASCULAR ACCESS ASSESSMENT TOOL form on the visit edit page (the "VASCULAR
ACCESS ASSESSMENT TOOL" tab opens `/load/visit-form/{id}/vascular-access-assessment`
in a new tab; the POM navigates there directly):
- `openVisitVascularAccess(visitId)` — open `/visits`, find the row by visit ID,
  click the edit icon (`fa-pen-to-square` inside `a[title="Edit"]`) under the Actions
  column, then navigate to the Vascular Access Assessment form
- `fillVascularAccessForm(data)` — fill the Access Type (AVF branch: select + site +
  date + checkbox), K. Needle Insertion scoring checkboxes (b_*/c_*/d_*/e_*),
  Post-care (dressing/tego radios + dates) and low-risk Interventions via native
  value setters + events; locators match BOTH `wire:model` and `wire:model.live`
  bindings (the form mixes the two); empty values are skipped; the computed total
  score and the signature upload are not mapped
- `saveVascularAccess()` — click Save (`wire:click="save"`), wait for the URL to
  gain `?row_id={id}` (the save signal — no SweetAlert on this form), return the row id
- `verifySavedValues(data)` — read back representative fields after the save
  re-render to prove persistence

#### VisitsPage (`visits.page.ts`)
Visit details/edit page verification:
- Locate visit form container
- Find visit status indicator ("in progress", "Checked-In")
- Find action buttons (Start Procedure, Check-Out, Check-Out Without SAP Order)
- Handle patient alerts modal (allergies, contamination)
- Read success toast messages

**Main Method:**
- `verifyVisitPageLoaded()` - Verify URL pattern (`/visits/{id}/edit`), status visibility, action buttons

#### AppointmentDetailPage (`appointment-detail.page.ts`)
Appointment detail modal interactions:
- Wait for modal to be visible
- Confirm care team members (bulk "Confirm Appointment" button OR individual "Confirm" buttons)
- Click "Check-In" button
- Handle SweetAlert2 success popup or toast notification
- Detect automatic redirect to visit page

**Main Methods:**
- `verifyCareTeamConfirmed()` - Verify/confirm all care team, return count of "Confirmed" badges
- `performCheckIn()` - Perform check-in, return success message or empty string

#### EmployeesPage (`employees.page.ts`)
Employee management POM aligned to the real staging DOM (verified via
`scripts/inspect-employee-create.ts`):

**Employee Creation (`/employees/create`):**
- The "Add New" link on `/employees` navigates to the create form — a Livewire
  component (no modal). All locators target the `wire:model.live` attributes
  directly (e.g. `input[wire\:model\.live="name"]`).
- `fillEmployeeForm(employee)` fills Name, Title, Status, Gender, Marital
  status, Nationality, ID Type radio (via evaluate — Playwright `check()` does
  not reliably commit Livewire radios), National ID, expiration/DOB dates
  (flatpickr text inputs), Religion, Language, and — for LICENSED titles —
  the SCFHS License Number / Expiry Date and NPHIES Provider ID once the
  hidden license section is revealed.
- `waitForCreateEnabled()` polls until the "Create" button (which sits
  OUTSIDE the `<form>` and is disabled until the server-side computed property
  `isFormValidForCreation` returns true) becomes enabled.
- `saveEmployee()` clicks Create → waits for the `employee-created` event →
  SweetAlert "Employee Created Successfully!" → redirect to
  `/employees/{id}/edit` (~3s), and returns the edit URL.

**List page:** `searchEmployee()` targets the live "Search by name, email, or
mobile" input; `getEmployeeList()` reads the result table rows.

#### FilterListPage (`filter-list.page.ts`)
Shared base class for the list-page filter specs (Visit / Patient / Employee):
- Result-row collection across ALL paginated pages (Next-button walk)
- Settle waits after applying/resetting filters
- Empty-state (`"No Data Available"`) and validation/error readers
- Pagination "Next" locator covering GET-link and Livewire `wire:click` variants

Subclasses supply the list URL and the page-specific filter interaction
(`setField` / `applyFilters`), and may override `resetFilters()` (the Visits
spec does — its reset is the modal's "Clear" link, not a plain navigation).

---

### 3. Fixtures (`src/fixtures/auth.fixture.ts`)

**AutoLogin Fixture:**
Runs automatically before every test (`auto: true`):
1. Login with default credentials (via `loginAsDefaultUser()`)
2. Ensure header context matches `config.json` targets:
   - Read `headerContext.targetBranch` and `headerContext.targetLocation` from config
   - Wait for `<select>` elements to be hydrated (Livewire)
   - Call `ensureHeaderContext()` which checks and switches branch/location if needed

**Injected Page Objects:**
- `loginPage` - LoginPage instance
- `patientsPage` - PatientsPage instance
- `employeesPage` - EmployeesPage instance
- `headerPage` - HeaderPage instance

All page objects are pre-instantiated, so tests only need:
```typescript
import { test } from '../src/fixtures/auth.fixture';

test('add a patient', async ({ patientsPage }) => {
  await patientsPage.navigateToPatients();
  // ... your test steps
});
```

---

### 4. Helpers (`src/helpers/*.ts`)

#### `patient-data.loader.ts`
Generates patient data from scenario JSON files:
- Reads DYNAMIC fields for fresh random values each run (Arabic/English names, Saudi phone numbers, dates)
- Reads static fields for fixed constraints (gender, nationality, marital status)
- Left empty problematic fields to avoid validation errors

#### `appointment-data.loader.ts`
Generates appointment data from scenario JSON files:
- DYNAMIC fields → random future date, notes each run
- Static fields → fixed visit type, time slots, etc.

#### `employee-data.loader.ts`
Generates employee data from scenario JSON files
(`config/employee-scenarios/`):
- DYNAMIC fields → random name/gender plus timestamp-derived UNIQUE values for
  `nationalId`, `scfhsLicenseNumber` and `nphiesProviderId` (the server
  validates uniqueness on all three — stale values cause save failures)
- Static fields → fixed title, status, nationality, religion, etc.

#### `header-context.helper.ts`
Header context management:
- `ensureHeaderContext(page)` - Sync header to config targets (read from `config.json.headerContext`)

---

### 5. Configuration Files

#### `config/config.json`
```json
{
  "headless": true,
  "saudiPhone": { ... },
  "staff": { ... },
  "locale": "ar-SA",
  "timezone": "Asia/Riyadh",
  "appointment": {
    "targetPatientIdentifier": "121"
  },
  "headerContext": {
    "targetBranch": "Main Branch",
    "targetLocation": "In Center"
  }
}
```

#### `playwright.config.ts`
- Test directory: `./tests`
- Execution mode: headless (configurable via HEADLESS env var)
- Base URL: from `process.env.BASE_URL` (mandatory in `.env`)
- Timeouts: navigation=30s, element=10s
- Trace mode: `on-first-retry` (or configurable via TRACE_MODE env var)
- Screenshots: `only-on-failure` (configurable via SCREENSHOT_MODE env var)
- Video recording: `retain-on-failure` (configurable via VIDEO_MODE env var)
- Projects: chromium with fixed viewport (1366x768), ar-SA locale, Asia/Riyadh timezone

#### Filter Test Cases (`config/*_filters.json`)
Each of the three filter specs is driven by an ARRAY of test-case objects in
its own config file — one Playwright test is registered per case at collection
time, grouped into `test.describe` blocks by `category`:

- `visit_filters.json` → `tests/visit_filter.spec.ts` — Visit Filter modal
  (patient name/MRN, nurse/doctor/driver, visit type, status, insurance,
  date preset & range)
- `patient_filters.json` → `tests/patient_filter.spec.ts` — Patients list GET
  form (name, mobile, email, patient ID, MRN, government ID, status,
  referral status)
- `employee_filters.json` → `tests/employee_filter.spec.ts` — Employees list
  live searches (`search`, `username_filter`)

Shared case structure:
```json
{
  "id": "TC-01",
  "description": "What this case verifies",
  "category": "happy-path | single-filter | no-results | boundary",
  "filters": { "<field>": "value or null" },
  "expected": {
    "outcome": "records | noRecords | validationError | resetRestoresRecords",
    "minRows": 1,
    "noRecordsMessage": "No Data Available",
    "validationMessage": "",
    "rowContains": ["text expected in at least one result row"],
    "filteredState": "records | noRecords"
  }
}
```
`null` / `""` filter values mean "do not touch this field". The visit filter
config also supports `{{today}}` / `{{yesterday}}` / `{{daysAgo:30}}` date
placeholders resolved at runtime so dates never go stale.

---

### 6. Scenario Files

**Appointment Scenarios (`config/appointment-scenarios/*.scenario.json`):**
Structure:
```json
{
  "_config": { "defaultDurationMinutes": 60 },
  "appointmentDate": "{{future_date}}",
  "appointmentTime": "{{dynamic_time}}",
  "endTime": "{{endTime_60m_later}}",
  "notes": "DYNAMIC"
}
```
The target patient identifier and visit type are read from `config/config.json`
(`appointment.targetPatientIdentifier`, `appointment.visitType`), shared by all
appointment tests — pass the visit type as a loader override.

**Patient Scenarios (`config/patient-scenarios/*.scenario.json`):**
Structure:
```json
{
  "_config": { "staff": { ... } },
  "firstNameAr": "DYNAMIC",
  "familyNameAr": "{{faker_name_ar_Egypt}}",
  "gender": "Female",           // static
  "nationality": "Saudi Arabian", // static
  "maritalStatus": "Married",    // static
  ...
}
```

---

## Data Flow

### Patient Creation Flow:
```
1. Scenario JSON (config/patient-scenarios/*.scenario.json)
   ↓
2. getPatientData() reads DYNAMIC fields for random values
   ↓
3. PatientsPage.fillPatientForm(patient)
   - Text inputs via fillIfDefined()
   - Select dropdowns via setSelectByOptionText() (index-based, reliable)
   - Staff selects via selectFromSelect2() (programmatic → UI fallback)
   - Patient System auto-synced to header Location
   ↓
4. saveAppointment() / save patient form
   ↓
5. Success toast appears
```

### Employee Creation Flow:
```
1. Scenario JSON (config/employee-scenarios/full-employee.scenario.json)
   ↓
2. getEmployeeData() resolves DYNAMIC fields (name + UNIQUE ID fields)
   ↓
3. EmployeesPage.navigateToEmployees() → click "Add New" → /employees/create
   ↓
4. fillEmployeeForm(employee)
   - wire:model.live text/date inputs via fill()
   - Selects (title/status/gender/nationality/...) via selectOption({ label })
   - ID Type radio via evaluate (reliable for Livewire)
   - Licensed title (Nurse) reveals SCFHS/NPHIES license section → fill it
   ↓
5. waitForCreateEnabled() — disabled until server-side isFormValidForCreation
   ↓
6. Click "Create" → dispatchBeforeSave() → Livewire call('save')
   ↓
7. Server dispatches `employee-created` → SweetAlert (~3s) →
   redirect to /employees/{id}/edit
   ↓
8. Assert edit URL + the created employee's name is pre-filled on the edit page
   ↓
9. Search the Employees list by name (live search → ?search=) →
   assert the new employee appears in the results
```

### Appointment Creation Flow:
```
1. Scenario JSON (config/appointment-scenarios/*.scenario.json)
   ↓
2. getAppointmentData() reads DYNAMIC fields
   ↓
3. PatientsPage.fillAppointmentForm(appointment)
   ↓
4. save appointment
   ↓
5. Navigate to Encounters → Appointments tab
   ↓
6. Open latest "New" appointment via patientsPage.openLatestAppointmentByStatus()
   ↓
7. AppointmentDetailPage.verifyCareTeamConfirmed() (bulk OR individual confirm)
   ↓
8. AppointmentDetailPage.performCheckIn()
   ↓
9. Redirect to /visits/{id}/edit
```

### Header Context Sync Flow:
```
1. AuthFixture.autoLogin runs before each test
2. Reads config.json.headerContext.targetBranch & targetLocation
3. Waits for <select> elements (Livewire hydration)
4. Calls ensureHeaderContext(page):
   - Gets current branch/location via JS evaluation
   - Compares with targets
   - Switches any that don't match via selectBranch() / selectLocation()
5. Returns when header matches config targets
```

---

## Execution

**Run all tests:**
```bash
npm run test
```

**Run with visible browser:**
```bash
npm run test:headed
```

**Debug mode:**
```bash
npm run test:debug
```

**Chromium only:**
```bash
npm run test:chrome
```

**Generate report:**
```bash
npm run report
```

---

## Key Design Patterns

1. **Hybrid Page Object Model:**
   - Text/date inputs: Playwright locators (placeholders, names)
   - Select dropdowns: JavaScript evaluate (avoids locator issues with Select2/flatpickr)
   - Radio buttons: JavaScript evaluate

2. **Web-First Assertions:**
   - Uses `expect().toBeVisible()` with auto-retry
   - Extended timeouts handle Livewire re-renders + Bootstrap animations
   - Handles transient DOM mutations gracefully

3. **Scenario-Driven Testing:**
   - Test data lives in JSON scenario files
   - DYNAMIC markers generate fresh random values each run
   - Static fields enforce consistent constraints

4. **Auto-Login Fixture:**
   - All tests get pre-authenticated automatically
   - Header context synced after login
   - Tests can request any page object directly

5. **Staff Selection Handling:**
   - Programmatic option selection first (fast)
   - Falls back to UI interaction if options not pre-populated
   - Handles Select2 AJAX loading gracefully

6. **Data-Driven Filter Tests:**
   - One Playwright test per JSON case in `config/*_filters.json`, grouped by `category`
   - Outcomes: `records`, `noRecords`, `validationError`, `resetRestoresRecords`
   - Pagination-aware result walking (Next button) so assertions cover the full result set
   - Reset cases capture the baseline after an explicit reset and compare restored rows by stable ID
   - Locators aligned to the real staging DOM via `scripts/inspect-*-filter.ts`

---

## Environment Variables

Copy `.env.example` to `.env` and set:
```bash
BASE_URL=https://staging.careconnectksa.com  # Required!
HEADLESS=true                                 # Override config.json
NAVIGATION_TIMEOUT=30000                      # Navigation timeout override
ELEMENT_TIMEOUT=10000                         # Element wait timeout override
TRACE_MODE=on-first-retry                     # Playwright trace mode (default: on-first-retry)
SCREENSHOT_MODE=only-on-failure               # Screenshot policy (default: only-on-failure)
VIDEO_MODE=retain-on-failure                  # Video recording policy (default: retain-on-failure)
```

---

## Notes & Pitfalls

1. **Patient System Sync:** Patient System (#15 select) MUST align with header Location (#1 select). The `syncPatientSystemWithHeaderLocation()` method auto-corrects mismatches.

2. **Select2 Staff Selection:** Uses two-phase approach (programmatic → UI fallback). Always call after opening dropdown to avoid "execution context destroyed" errors.

3. **Conditional Allergies Alert:** Dismissed via `dismissAllergiesAlertIfPresent()` before any patient detail page interactions. Only appears for patients with registered allergies/contamination.

4. **Livewire Re-renders:** Web-first assertions handle transient button detachment after confirm actions. Use `waitForModalVisible()` instead of `isModalVisible()` when waiting.

5. **Select Indexes Are Unstable:** Flatpickr adds new selects on date picker open. Always use name-based or JS evaluation for select targeting, never DOM indices.

6. **Header Context Persistence:** Once set after login, persists across tests in same session via auth fixture. No need to re-sync unless branching to different config targets.
