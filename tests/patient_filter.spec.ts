/**
 * =============================================================================
 * E2E Test: Patient Filter Component — Data-Driven
 * =============================================================================
 *
 * Validates the "Patient Filter" form on the Patients list page
 * (inline GET form `form.card-body.search.row`, NOT a modal — unlike the
 * Visits filter) using Playwright's data-driven testing pattern:
 *
 *   - Every scenario (input parameters + expected outcome) lives in
 *     `config/patient_filters.json` as an ARRAY of test-case objects.
 *   - This spec iterates the array and registers ONE Playwright test per case
 *     at collection time, grouped into `test.describe` blocks by `category`.
 *   - No test data is hardcoded here. `null` / `""` filter values mean
 *     "do not touch this field", which is how single-filter and null-value
 *     scenarios are expressed in the JSON.
 *
 * Real staging form fields (verified via scripts/inspect-patient-filter.ts):
 *   Text:   name, mobile, email, id (Patient ID), mrn, national_id (Gov. ID)
 *   Select2: status (active / inactive / deceased),
 *            referral_status (New Referral, Non Referral, ...)
 *   Submit: "Filter" button (`input[type="submit"][name="search"][value="Filter"]`)
 *   Reset:  no Clear link exists — navigating back to /patients shows the
 *           full default list (the reset behavior tested by the boundary cases)
 *
 * Covered scenarios (driven by config/patient_filters.json):
 *   1. Happy path  — multiple valid filters combined
 *   2. Single filter — each major field individually (patient ID, name, MRN,
 *      mobile, email, government ID, status, referral status)
 *   3. Empty state — filters that guarantee zero results show the
 *      "No Data Available" message (single-row `<td colspan="100">`)
 *   4. Boundary — all-null and empty-string filter values
 *   5. Pagination — result assertions walk every page via the "Next" button
 *      (plain `ul.pagination` with an `a[rel="next"]` link — NOT inside a
 *      `nav` element like the visits list), so minRows/rowContains see the
 *      full result set, not just page 1. The real staging list renders 30
 *      rows per page across ~8 pages, so the walk matters here.
 *   6. Reset — apply filters, reset (goto /patients), and assert the full
 *      result list is restored. The baseline is captured AFTER an explicit
 *      reset, mirroring the visits spec. Restored rows are compared by
 *      stable patient ID (the leading number of each row), since rows embed
 *      live text that can change between the two walks.
 *   7. "All" sentinel — on the Select2 filter fields (status, referralStatus)
 *      a JSON value of "All" explicitly selects the dropdown's placeholder
 *      ("Choose Status") option, i.e. clears that filter. The patient form
 *      does NOT pre-select any filter by default (unlike the visits form's
 *      status), so most cases simply leave these fields null.
 *   8. Full field coverage — the filter schema (name, mobile, email,
 *      patientId, mrn, nationalId, status, referralStatus) is fully
 *      data-driven; every field is optional per case (null = skipped)
 *
 * Selectors prefer stable CSS selectors aligned to the real staging DOM via
 * scripts/inspect-patient-filter.ts (the page exposes no data-testid
 * attributes). The results table renders its header as a <tr> with <th>
 * cells INSIDE tbody, plus a "No Data Available" empty-state row — both are
 * excluded from the data-row locator.
 *
 * @see config/patient_filters.json — all test cases (input + expected output)
 * @see src/fixtures/auth.fixture.ts — auto-login before every test
 * @see src/helpers/select2.helper.ts — Select2 dropdown interaction
 * @see src/pages/filter-list.page.ts — shared FilterListPage base (result
 *      inspection: pagination walk, settle waits, empty-state readers)
 */

import { type Locator, type Page } from '@playwright/test';
import { test, expect } from '../src/fixtures/auth.fixture';
import { FilterListPage } from '../src/pages/filter-list.page';
import { selectFromSelect2ByLocator } from '../src/helpers/select2.helper';
import patientFilterCases from '../config/patient_filters.json';

// =============================================================================
// Runtime helpers
// =============================================================================

/**
 * Assert that every text in `requiredTexts` appears in at least one of the
 * given result rows (case-insensitive), logging each match. Shared by the
 * `records` and `resetRestoresRecords` outcomes.
 */
function expectRowsContain(rows: string[], requiredTexts: string[]): void {
  for (const text of requiredTexts) {
    expect(
      rows.some((row) => row.toLowerCase().includes(text.toLowerCase())),
    ).toBeTruthy();
    console.log(`[PatientFilter] ✅ Row contains "${text}"`);
  }
}

// =============================================================================
// Page Object — Patient Filter component
// =============================================================================

/**
 * Shape of the `filters` block in each JSON test case. Every field is
 * optional per case — `null`/`""` means "do not touch this filter".
 *
 * Special value: on the Select2 fields (status, referralStatus) the string
 * "All" explicitly selects the dropdown's placeholder ("Choose Status")
 * option, i.e. clears that filter. Unlike the visits form, the patient form
 * does NOT pre-select any filter by default, so this sentinel is rarely needed.
 */
interface PatientFilters {
  name: string | null;            // name
  mobile: string | null;          // mobile
  email: string | null;           // email
  patientId: string | null;       // id (Patient ID)
  mrn: string | null;             // mrn
  nationalId: string | null;      // national_id (Government ID)
  status: string | null;          // status (Select2)
  referralStatus: string | null;  // referral_status (Select2)
}

/**
 * PatientFilterPage — Page Object Model for the Patient Filter form on the
 * Patients list page.
 *
 * Extends the shared FilterListPage base (src/pages/filter-list.page.ts),
 * which provides the pagination walk, settle waits and empty-state readers
 * common to all list-page filter specs. This subclass supplies only the
 * page-specific filter interaction: the inline GET filter form fields, the
 * Select2 dropdowns, and the "Filter" submit.
 *
 * The filter form is an inline GET form (`form.card-body.search.row`, no
 * action → submits to the current /patients URL). Submitting navigates with
 * the filter values as GET query params; navigating to /patients again acts
 * as the reset (the base class resetFilters()).
 *
 * Select2-enhanced dropdowns (status, referral status) are handled in
 * setField() via the shared src/helpers/select2.helper.ts.
 */
class PatientFilterPage extends FilterListPage {
  // ---------------------------------------------------------------------------
  // Locators — page-specific filter fields
  // ---------------------------------------------------------------------------
  readonly nameInput: Locator;
  readonly mobileInput: Locator;
  readonly emailInput: Locator;
  readonly patientIdInput: Locator;
  readonly mrnInput: Locator;
  readonly nationalIdInput: Locator;
  readonly statusField: Locator;
  readonly referralStatusField: Locator;
  readonly applyButton: Locator;

  constructor(page: Page) {
    super(page, '/patients');

    // Text filter inputs (name/id/placeholder verified against staging DOM)
    this.nameInput = page.locator('input[name="name"]').first();
    this.mobileInput = page.locator('input[name="mobile"]').first();
    this.emailInput = page.locator('input[name="email"]').first();
    this.patientIdInput = page.locator('input[name="id"]').first();
    this.mrnInput = page.locator('input[name="mrn"]').first();
    this.nationalIdInput = page.locator('input[name="national_id"]').first();

    // Select2 dropdowns — handled by setField() via selectFromSelect2ByLocator()
    this.statusField = page.locator('select[name="status"]').first();
    this.referralStatusField = page.locator('select[name="referral_status"]').first();

    // Submit button of the GET filter form ("Filter")
    this.applyButton = page.locator(
      'input[type="submit"][value="Filter"], input[name="search"][value="Filter"]',
    ).first();
  }

  // ---------------------------------------------------------------------------
  // Filter interactions
  // ---------------------------------------------------------------------------

  /**
   * Set a single filter field — only when a value is present.
   * `null`, `undefined` or `""` values in the JSON mean "do not touch this
   * field", which is how single-filter and null-value scenarios are expressed.
   *
   * Field type is detected automatically:
   *   - Select2 widget with value "All"  → select the placeholder option
   *                                        ("Choose Status"), clearing the filter
   *   - Select2 widget                   → selectFromSelect2ByLocator() from the
   *                                        shared src/helpers/select2.helper.ts
   *                                        (programmatic match, then UI fallback)
   *   - Native `<select>`                → selectOption by visible label
   *   - Text input                       → fill + blur
   */
  private async setField(locator: Locator, value: string | null | undefined): Promise<void> {
    if (value === null || value === undefined || value === '') return;

    // 'attached' (not 'visible'): Select2 converts the native <select> into a
    // hidden `select2-hidden-accessible` element that is never "visible". The
    // interaction methods below apply their own actionability waits.
    await locator.waitFor({ state: 'attached', timeout: 10_000 });

    const tagName = await locator.evaluate((el) => (el as HTMLElement).tagName);

    if (tagName === 'SELECT') {
      // "All" sentinel → clear back to the placeholder option
      if (value === 'All') {
        await locator.evaluate((el) => {
          const select = el as HTMLSelectElement;
          select.value = '';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          select.dispatchEvent(new Event('input', { bubbles: true }));
        });
        return;
      }

      const isSelect2 = await locator.evaluate((el) => {
        const select = el as HTMLSelectElement;
        return select.classList.contains('select2-hidden-accessible')
          || !!select.parentElement?.querySelector('.select2-container');
      }).catch(() => false);

      if (isSelect2) {
        await selectFromSelect2ByLocator(this.page, locator, value);
      } else {
        // Native dropdown — select by visible label
        await locator.selectOption({ label: value });
      }
    } else {
      // Text / autocomplete input
      await locator.fill(value);
      await locator.blur(); // commit the change for JS-framework listeners
    }
  }

  /** Apply every filter defined in the JSON case, then submit the form. */
  async applyFilters(filters: PatientFilters): Promise<void> {
    await this.setField(this.nameInput, filters.name);
    await this.setField(this.mobileInput, filters.mobile);
    await this.setField(this.emailInput, filters.email);
    await this.setField(this.patientIdInput, filters.patientId);
    await this.setField(this.mrnInput, filters.mrn);
    await this.setField(this.nationalIdInput, filters.nationalId);
    await this.setField(this.statusField, filters.status);
    await this.setField(this.referralStatusField, filters.referralStatus);

    // Submit via the "Filter" button (GET navigation with the query params)
    await this.applyButton.click();
    await this.waitForResultsRefresh();
  }
}

// =============================================================================
// Test suite — one Playwright test per JSON case, grouped by category
// =============================================================================

/** Human-readable labels for the category groups defined in the JSON config. */
const CATEGORY_LABELS: Record<string, string> = {
  'happy-path': 'Success Scenarios — Happy Path',
  'single-filter': 'Success Scenarios — Single Filter',
  'no-results': 'Edge Cases — No Results',
  'boundary': 'Edge Cases — Boundary & Reset',
};

test.describe('Patient Filter Component (Data-Driven)', () => {
  // Run all cases in this describe serially: every case submits the filter
  // form and queries the same shared staging database, so parallel execution
  // could cross-contaminate filter state and produce flaky failures.
  test.describe.configure({ mode: 'serial' });

  // Note: no beforeEach header-context sync here — the auth fixture's
  // autoLogin already ensures Branch/Location after login (and the context
  // persists across navigations). The other list-page spec (patients.spec.ts)
  // documents the same pattern.

  // Register tests at collection time — one `test()` per JSON case.
  const categories = [...new Set(patientFilterCases.map((c) => c.category))];

  for (const category of categories) {
    test.describe(CATEGORY_LABELS[category] ?? category, () => {
      for (const testCase of patientFilterCases.filter((c) => c.category === category)) {
        test(`${testCase.id}: ${testCase.description}`, async ({ page }) => {
          const patientFilterPage = new PatientFilterPage(page);
          const { filters, expected } = testCase;

          console.log('═══════════════════════════════════════════════');
          console.log(`  ${testCase.id} — ${testCase.description}`);
          console.log(`  Expected outcome: ${expected.outcome}`);
          console.log('═══════════════════════════════════════════════');

          // 1. Navigate to the Patients list page
          await patientFilterPage.goto();

          // 2. Apply the filters defined in the JSON case (null = skipped)
          await patientFilterPage.applyFilters(filters);

          // 3. Assert the expected outcome (web-first assertions auto-retry)
          switch (expected.outcome) {
            case 'records': {
              // Wait for the first result row to render (web-first assertion)
              await expect(patientFilterPage.resultRows.first()).toBeVisible({ timeout: 10_000 });

              // Walk every paginated page and collect all matching rows
              const allRowTexts = await patientFilterPage.getAllResultRowTexts();

              // Total row count across ALL pages must meet the minimum
              expect(allRowTexts.length).toBeGreaterThanOrEqual(expected.minRows);
              console.log(`[PatientFilter] ✅ ${allRowTexts.length} row(s) returned`);

              // Every configured "rowContains" text must appear in at least one
              // row anywhere in the paginated result set
              expectRowsContain(allRowTexts, expected.rowContains);
              break;
            }

            case 'noRecords': {
              // Empty-state message must be shown (e.g. "No Data Available")
              await expect(patientFilterPage.noRecordsMessage).toBeVisible({ timeout: 10_000 });
              const message = await patientFilterPage.getNoRecordsText();
              expect(message.toLowerCase()).toContain(expected.noRecordsMessage.toLowerCase());
              console.log(`[PatientFilter] ✅ No-records message: "${message}"`);
              break;
            }

            case 'validationError': {
              // App must surface validation/error feedback gracefully
              await expect(patientFilterPage.errorMessage).toBeVisible({ timeout: 10_000 });
              if (expected.validationMessage) {
                const message = await patientFilterPage.getErrorText();
                expect(message.toLowerCase()).toContain(expected.validationMessage.toLowerCase());
              }
              console.log('[PatientFilter] ✅ Validation/error feedback shown for invalid input');
              break;
            }

            case 'resetRestoresRecords': {
              // 0. Reset first so the baseline is the TRUE full list. The plain
              //    /patients default view is the full patient list, but resetting
              //    explicitly keeps the invariant robust to header-context
              //    scoping (same rationale as the visits spec).
              await patientFilterPage.resetFilters();
              await patientFilterPage.waitForResultsSettled();

              // 1. Capture the unfiltered baseline across ALL pages
              const baseline = await patientFilterPage.getAllResultRowTexts();
              console.log(`[PatientFilter] 📊 Baseline (unfiltered): ${baseline.length} row(s)`);

              // 2. Apply the filters and wait for the filtered results to
              //    render (empty state OR re-rendered rows — never stale ones)
              await patientFilterPage.applyFilters(filters);
              await patientFilterPage.waitForFilteredResults(baseline[0] ?? '');

              // 3. The filter must NARROW the baseline. The expected filtered
              //    state is config-driven via expected.filteredState:
              //      - "noRecords" → empty-state message shown (0 rows)
              //      - "records"   → at least one narrowed row returned
              const filtered = await patientFilterPage.getAllResultRowTexts();
              console.log(`[PatientFilter] 📊 Filtered: ${filtered.length} row(s) (state: ${expected.filteredState})`);

              if (expected.filteredState === 'noRecords') {
                await expect(patientFilterPage.noRecordsMessage).toBeVisible({ timeout: 10_000 });
                expect(filtered.length).toBe(0);
              } else {
                // Narrowing-but-nonempty: at least one row, and the rows must
                // actually match the filter (rowContains is checked here too)
                expect(filtered.length).toBeGreaterThanOrEqual(1);
                expectRowsContain(filtered, expected.rowContains);
              }
              expect(filtered.length).toBeLessThan(baseline.length);

              // 4. Reset and wait for data rows to return
              await patientFilterPage.resetFilters();
              await expect(patientFilterPage.resultRows.first()).toBeVisible({ timeout: 10_000 });

              // 5. Assert the full list is restored across pages: at least as
              //    many rows as the baseline, every baseline row still present,
              //    plus the case's minRows / rowContains requirements
              const restored = await patientFilterPage.getAllResultRowTexts();
              console.log(`[PatientFilter] 📊 After reset: ${restored.length} row(s)`);

              expect(restored.length).toBeGreaterThanOrEqual(baseline.length);
              expect(restored.length).toBeGreaterThanOrEqual(expected.minRows);

              // Compare stable identifiers — the leading patient ID — rather
              // than exact row text, which can change between the two
              // paginated walks. Falls back to the full text if no ID is found.
              const stableKey = (row: string): string => {
                const id = /^(\d+)/.exec(row.trim())?.[1];
                return id ?? row.trim();
              };
              const restoredKeys = restored.map(stableKey);
              for (const row of baseline) {
                expect(restoredKeys).toContain(stableKey(row));
              }
              expectRowsContain(restored, expected.rowContains);
              console.log(`[PatientFilter] ✅ Full result list restored (${restored.length} >= baseline ${baseline.length})`);
              break;
            }

            default:
              throw new Error(`[PatientFilter] Unknown expected.outcome: "${expected.outcome}"`);
          }

          // 4. Document the result with a screenshot (never fails the test)
          await page.screenshot({
            path: `test-results/artifacts/patient-filter-${testCase.id}-${Date.now()}.png`,
            fullPage: true,
          }).catch(() => {});
        });
      }
    });
  }
});
