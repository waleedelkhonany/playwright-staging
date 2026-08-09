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
│   └── create-appointment.spec.ts            # Create appointment workflows
│
├── src/
│   ├── pages/                 # Page Object Models (POM)
│   │   ├── base.page.ts       # Base class for all page objects
│   │   ├── login.page.ts      # Login page interactions
│   │   ├── patients.page.ts   # Patients module (search, create, appointments)
│   │   ├── header.page.ts     # Top navigation (Branch/Location selectors)
│   │   ├── visits.page.ts     # Visit details/edit page verification
│   │   ├── appointment-detail.page.ts  # Appointment modal confirmation & check-in
│   │   └── employees.page.ts  # Employee management page
│   │
│   ├── fixtures/              # Test fixtures and shared state
│   │   └── auth.fixture.ts    # Auto-login + page object injection
│   │
│   ├── helpers/               # Utility functions and data loaders
│   │   ├── patient-data.loader.ts       # Patient data generation from scenarios
│   │   ├── appointment-data.loader.ts   # Appointment data generation
│   │   ├── header-context.helper.ts     # Branch/Location context management
│   │   ├── login.helper.ts              # Login automation logic
│   │   ├── patient-data.loader.ts       # Patient data generator
│   │   └── appointment-data.loader.ts   # Appointment data generator
│   │
│   └── data/                  # Test data definitions
│       ├── patient.data.ts    # Patient data type definitions
│       └── appointment.data.ts  # Appointment data type definitions
│
├── config/
│   ├── config.json            # Global configuration (headers, locales)
│   ├── README.md              # Configuration documentation
│   └── appointment-scenarios/  # Appointment scenario files
│       ├── full-appointment.scenario.json     # Full appointment test data
│       ├── morning-appointment.scenario.json  # Morning slot appointment
│       └── minimal-appointment.scenario.json  # Minimal fields only
│   └── patient-scenarios/      # Patient scenario files
│       ├── full-patient.scenario.json         # Full patient data
│       ├── minimal-patient.scenario.json      # Minimal fields only
│       └── female-saudi-patient.scenario.json # Saudi female scenario
│
├── scripts/                   # Diagnostic/debugging scripts
│   ├── diagnose-patient-save.ts       # Diagnose patient save issues
│   ├── investigate-patient-form.ts    # Investigate form structure
│   └── extract-form-fields.ts         # Extract form field definitions
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

### 2. Page Object Models (`src/pages/*.ts`)

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
Employee management interactions (POM for staff list operations).

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

---

### 6. Scenario Files

**Appointment Scenarios (`config/appointment-scenarios/*.scenario.json`):**
Structure:
```json
{
  "_config": { "defaultDurationMinutes": 60 },
  "visitType": "Initial Visit",
  "appointmentDate": "{{future_date}}",
  "appointmentTime": "{{dynamic_time}}",
  "endTime": "{{endTime_60m_later}}",
  "notes": "DYNAMIC"
}
```
The target patient identifier is read from `config/config.json`
(`appointment.targetPatientIdentifier`), shared by all appointment tests.

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
