/**
 * =============================================================================
 * E2E Test: Visit Filter Component — Data-Driven
 * =============================================================================
 *
 * Validates the "Visit Filter" component on the Visits list page
 * (GET form inside modal `#filterModal`, toggled by the "Visits Filter"
 * button) using Playwright's data-driven testing pattern:
 *
 *   - Every scenario (input parameters + expected outcome) lives in
 *     `config/visit_filters.json` as an ARRAY of test-case objects.
 *   - This spec iterates the array and registers ONE Playwright test per case
 *     at collection time, grouped into `test.describe` blocks by `category`.
 *   - No test data is hardcoded here. Even dates use `{{template}}`
 *     placeholders (e.g. `{{today}}`, `{{daysAgo:30}}`) that are resolved at
 *     runtime — mirroring the `{{template}}` convention of src/helpers/data.loader.ts.
 *   - `null` / `""` filter values mean "do not touch this field", which is how
 *     single-filter and null-value scenarios are expressed in the JSON.
 *
 * Real staging form fields (verified via scripts/inspect-visit-filter.ts):
 *   Text:  patient_name, patient_mrn, nurse_name, doctor_name, driver_name
 *   Select2: visit_type_id, status, insurance_company_id, date_preset
 *   Date:  date_from / date_to (flatpickr — hidden until date_preset = "custom")
 *   Submit: "Filters" button · Reset: "Clear" link (/visits?status=)
 *
 * Covered scenarios (driven by config/visit_filters.json):
 *   1. Happy path  — multiple valid filters combined
 *   2. Single filter — each major field individually (patient name, patient
 *      MRN, nurse, doctor, visit type, status, insurance, date preset, date
 *      range)
 *   3. Empty state — filters that guarantee zero results show the
 *      "No Data Available" message
 *   4. Boundary — invalid/reversed date range, all-null and empty-string
 *      filter values
 *   5. Pagination — result assertions walk every page via the "Next" button
 *      (pattern reused from PatientsPage.openLatestAppointmentByStatus), so
 *      minRows/rowContains see the full result set, not just page 1. The real
 *      staging list currently renders all rows on one page, so the walk stops
 *      after page 1 — the support is there for when it paginates.
 *   6. Reset — apply filters, click Reset/Clear, and assert the full result
 *      list is restored (baseline row set present again, across all paginated
 *      pages). The filtered state is config-driven via expected.filteredState:
 *      "noRecords" filters (e.g. non-existent patient) or narrowing "records"
 *      filters (e.g. a real nurse name) are both supported.
 *
 *      The baseline is captured AFTER an explicit Clear, because the plain
 *      /visits default view is restricted (header context / a default filter)
 *      and can return FEWER rows than a real filter — the narrowing invariant
 *      "filtered < baseline" only holds against the true full list. Restored
 *      rows are compared by stable visit ID, since rows embed live
 *      elapsed-time text that changes between the two walks.
 *   7. "All" sentinel — on the Select2 filter fields (visitType, status,
 *      insuranceCompany, datePreset) a JSON value of "All" explicitly selects
 *      the dropdown's "All" option (e.g. status=all), clearing that filter.
 *      This matters because the real form pre-selects status = "in progress",
 *      so pure single-filter cases must set "status": "All" to avoid
 *      unintentionally filtering by status.
 *   8. Full field coverage — the filter schema (patientName, patientMrn,
 *      nurseName, doctorName, driverName, visitType, status, insuranceCompany,
 *      datePreset, dateFrom, dateTo) is fully data-driven; every field is
 *      optional per case (null = skipped)
 *
 * Selectors prefer `data-testid` attributes and fall back to resilient
 * CSS/role selectors, matching the pattern used across src/pages/*.page.ts.
 * The locators were aligned against the real staging DOM via
 * scripts/inspect-visit-filter.ts.
 *
 * @see config/visit_filters.json — all test cases (input + expected output)
 * @see src/fixtures/auth.fixture.ts — auto-login before every test
 * @see src/helpers/header-context.helper.ts — branch/location sync
 * @see src/helpers/select2.helper.ts — Select2 dropdown interaction
 */

import { type Locator, type Page } from '@playwright/test';
import { test, expect } from '../src/fixtures/auth.fixture';
import { selectFromSelect2ByLocator } from '../src/helpers/select2.helper';
import visitFilterCases from '../config/visit_filters.json';

// =============================================================================
// Runtime helpers
// =============================================================================

/**
 * Resolve date template placeholders from the JSON config into concrete
 * YYYY-MM-DD strings so filter dates never go stale between runs:
 *
 *   "{{today}}"      → today (local timezone)
 *   "{{yesterday}}"  → yesterday
 *   "{{tomorrow}}"   → tomorrow
 *   "{{daysAgo:30}}" → 30 days before today
 *
 * Non-template values are returned unchanged; null/empty resolve to undefined
 * (meaning "no date filter"). Same timezone-safe approach as appointment.data.ts.
 */
function resolveDateTemplate(raw: string | null | undefined): string | undefined {
  if (raw === null || raw === undefined || raw.trim() === '') return undefined;

  const match = /^{{(.+)}}$/.exec(raw.trim());
  if (!match) return raw.trim();

  const token = match[1];
  const date = new Date();

  if (token === 'today') {
    // no-op — today is the default
  } else if (token === 'yesterday') {
    date.setDate(date.getDate() - 1);
  } else if (token === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else {
    const daysAgo = /^daysAgo:(\d+)$/.exec(token);
    if (daysAgo) {
      date.setDate(date.getDate() - Number(daysAgo[1]));
    } else {
      console.warn(`[VisitFilter] Unknown date template "{{${token}}}" — using raw value`);
      return raw.trim();
    }
  }

  // Local-timezone-safe YYYY-MM-DD
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().split('T')[0];
}

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
    console.log(`[VisitFilter] ✅ Row contains "${text}"`);
  }
}

// =============================================================================
// Page Object — Visit Filter component
// =============================================================================

/**
 * Shape of the `filters` block in each JSON test case. Every field is
 * optional per case — `null`/`""` means "do not touch this filter".
 *
 * Special value: on the Select2 fields (visitType, status, insuranceCompany,
 * datePreset) the string "All" explicitly selects the dropdown's "All"
 * option (e.g. status=all), i.e. clears that filter. This matters because
 * the real form pre-selects status = "in progress", so single-filter cases
 * must set `"status": "All"` to avoid unintentionally filtering by status.
 */
interface VisitFilters {
  patientName: string | null;       // patient_name
  patientMrn: string | null;        // patient_mrn
  nurseName: string | null;         // nurse_name
  doctorName: string | null;        // doctor_name
  driverName: string | null;        // driver_name
  visitType: string | null;         // visit_type_id (Select2)
  status: string | null;            // status (Select2)
  insuranceCompany: string | null;  // insurance_company_id (Select2)
  datePreset: string | null;        // date_preset (Select2)
  dateFrom: string | null;          // date_from (visible after Custom Range preset)
  dateTo: string | null;            // date_to
}

/**
 * VisitFilterPage — Page Object Model for the Visit Filter component.
 *
 * Kept lightweight and self-contained in this spec for now; extract to
 * src/pages/visit-filter.page.ts if the suite grows.
 *
 * The real filter form is a GET form inside Bootstrap modal `#filterModal`,
 * opened by the "Visits Filter" button. The `date_from`/`date_to` inputs are
 * hidden unless the "Custom Range" date preset is selected (its inline
 * `onchange` reveals them), so applyFilters() selects that preset first
 * whenever a date range is configured.
 *
 * Selector strategy (consistent with src/pages/*.page.ts):
 *   - Preferred: `data-testid` attributes
 *   - Fallback:  resilient CSS selectors (aligned to the real staging DOM)
 *
 * Select2-enhanced dropdowns (status, visit type, insurance, date preset) are
 * handled automatically in setField() via the shared src/helpers/select2.helper.ts.
 *
 * Result inspection walks paginated pages (Next-button pattern from
 * PatientsPage.openLatestAppointmentByStatus), so row count and text
 * assertions cover the entire result set rather than only the current page.
 */
class VisitFilterPage {
  /** The Playwright page instance */
  readonly page: Page;

  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------
  readonly filterModalButton: Locator;
  readonly patientNameInput: Locator;
  readonly patientMrnInput: Locator;
  readonly nurseNameInput: Locator;
  readonly doctorNameInput: Locator;
  readonly driverNameInput: Locator;
  readonly visitTypeField: Locator;
  readonly statusField: Locator;
  readonly insuranceCompanyField: Locator;
  readonly datePresetField: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly applyButton: Locator;
  readonly nextPageButton: Locator;
  readonly resetButton: Locator;
  readonly resultRows: Locator;
  readonly noRecordsMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Opens the Bootstrap modal (#filterModal) containing the GET filter form.
    // NOTE: keep this distinct from the "Filters" submit button — Playwright's
    // substring `:has-text("Filter")` matches both, so the submit locator must
    // not rely on it.
    this.filterModalButton = page.locator(
      'button:has-text("Visits Filter"), [data-bs-target="#filterModal"]',
    ).first();

    this.patientNameInput = page.locator(
      '[data-testid="filter-patient-name"], input[name="patient_name"]',
    ).first();

    this.patientMrnInput = page.locator(
      '[data-testid="filter-patient-mrn"], input[name="patient_mrn"]',
    ).first();

    this.nurseNameInput = page.locator(
      '[data-testid="filter-nurse-name"], input[name="nurse_name"]',
    ).first();

    this.doctorNameInput = page.locator(
      '[data-testid="filter-doctor-name"], input[name="doctor_name"]',
    ).first();

    this.driverNameInput = page.locator(
      '[data-testid="filter-driver-name"], input[name="driver_name"]',
    ).first();

    // Select2 dropdowns — handled by setField() via selectFromSelect2ByLocator()
    this.visitTypeField = page.locator(
      '[data-testid="filter-visit-type"], select[name="visit_type_id"]',
    ).first();

    this.statusField = page.locator(
      '[data-testid="filter-status"], select[name="status"]',
    ).first();

    this.insuranceCompanyField = page.locator(
      '[data-testid="filter-insurance-company"], select[name="insurance_company_id"]',
    ).first();

    this.datePresetField = page.locator(
      '[data-testid="filter-date-preset"], select[name="date_preset"]',
    ).first();

    // flatpickr date inputs — hidden until date_preset = "custom" is selected
    this.dateFromInput = page.locator(
      '[data-testid="filter-date-from"], input[name="date_from"]',
    ).first();

    this.dateToInput = page.locator(
      '[data-testid="filter-date-to"], input[name="date_to"]',
    ).first();

    // Submit button of the GET filter form ("Filters"). Scoped to the modal
    // container: the page header also renders a hidden `type="submit"`
    // button (the logout form), and `.first()` on a page-wide locator would
    // grab it instead. The modal toggle is type="button" (never matches).
    this.applyButton = page.locator(
      '#filterModal button[type="submit"], #filterModal button:has-text("Filters"), [data-testid="filter-apply"]',
    ).first();

    // Pagination "Next" button — same resilient selector set as
    // PatientsPage.openLatestAppointmentByStatus()
    this.nextPageButton = page.locator(
      'nav a:has-text("Next"), nav button:has-text("Next"), ' +
      'nav [rel="next"], nav li:has-text("Next") button, ' +
      '[aria-label="Next"], .pagination .next a, .pagination .next button',
    ).first();

    // "Clear" link in the modal footer — resets to the full list (also
    // scoped to the modal to avoid matching any page-wide "Clear" text)
    this.resetButton = page.locator(
      '[data-testid="filter-reset"], #filterModal a:has-text("Clear"), #filterModal button:has-text("Clear"), button:has-text("Reset")',
    ).first();

    // Result rows — the real table renders its header as a <tr> with <th>
    // cells INSIDE tbody, plus a "No Data Available" empty-state row. Exclude
    // both so count()/visibility assertions only consider real data rows.
    this.resultRows = page
      .locator('[data-testid="results-table"] tbody tr, table tbody tr')
      .filter({ hasNot: page.locator('th') })
      .filter({ hasNot: page.locator('[data-testid="no-records"]') })
      .filter({ hasNot: page.locator('.dataTables_empty') })
      .filter({ hasNot: page.locator('td:has-text("No Data Available")') })
      .filter({ hasNot: page.locator('td:has-text("No records found")') });

    this.noRecordsMessage = page.locator(
      '[data-testid="no-records"], td:has-text("No Data Available"), td:has-text("No records found"), .dataTables_empty, tr:has-text("No records found")',
    ).first();

    this.errorMessage = page.locator(
      '[data-testid="filter-error"], .alert-danger, .invalid-feedback, .swal2-popup',
    ).first();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /** Navigate to the Visits list page. */
  async goto(): Promise<void> {
    await this.page.goto('/visits', { waitUntil: 'networkidle', timeout: 30_000 });
  }

  // ---------------------------------------------------------------------------
  // Filter interactions
  // ---------------------------------------------------------------------------

  /** Open the Bootstrap filter modal (#filterModal) that contains the form. */
  private async openFilterModal(): Promise<void> {
    await this.filterModalButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.filterModalButton.click();
    await this.page.waitForTimeout(800);
  }

  /**
   * Set a single filter field — only when a value is present.
   * `null`, `undefined` or `""` values in the JSON mean "do not touch this
   * field", which is how single-filter and null-value scenarios are expressed.
   *
   * Field type is detected automatically:
   *   - Select2 widget    → selectFromSelect2ByLocator() from the shared
   *                         src/helpers/select2.helper.ts (programmatic
   *                         match, then UI search + click)
   *   - Native `<select>` → selectOption by visible label
   *   - Text/date input   → fill + blur
   */
  private async setField(locator: Locator, value: string | null | undefined): Promise<void> {
    if (value === null || value === undefined || value === '') return;

    // 'attached' (not 'visible'): Select2 converts the native <select> into a
    // hidden `select2-hidden-accessible` element that is never "visible". The
    // interaction methods below (selectOption/fill/evaluate) apply their own
    // actionability waits.
    await locator.waitFor({ state: 'attached', timeout: 10_000 });

    const tagName = await locator.evaluate((el) => (el as HTMLElement).tagName);

    if (tagName === 'SELECT') {
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
      // Text / date / autocomplete input
      await locator.fill(value);
      await locator.blur(); // commit the change for JS-framework listeners
    }
  }

  /** Apply every filter defined in the JSON case, then submit the form. */
  async applyFilters(filters: VisitFilters): Promise<void> {
    // 1. The filter form lives inside the modal — open it first
    await this.openFilterModal();

    // 2. Date range inputs are hidden until the "Custom Range" date preset is
    //    selected (its inline onchange reveals the dateFrom/dateTo groups).
    const usesDateRange = resolveDateTemplate(filters.dateFrom) !== undefined
      || resolveDateTemplate(filters.dateTo) !== undefined;
    if (usesDateRange) {
      await selectFromSelect2ByLocator(this.page, this.datePresetField, 'Custom Range');
      await this.dateFromInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }

    // 3. Set the configured fields (null = skipped)
    await this.setField(this.patientNameInput, filters.patientName);
    await this.setField(this.patientMrnInput, filters.patientMrn);
    await this.setField(this.nurseNameInput, filters.nurseName);
    await this.setField(this.doctorNameInput, filters.doctorName);
    await this.setField(this.driverNameInput, filters.driverName);
    await this.setField(this.visitTypeField, filters.visitType);
    await this.setField(this.statusField, filters.status);
    await this.setField(this.insuranceCompanyField, filters.insuranceCompany);
    if (filters.datePreset && !usesDateRange) {
      await this.setField(this.datePresetField, filters.datePreset);
    }
    await this.setField(this.dateFromInput, resolveDateTemplate(filters.dateFrom));
    await this.setField(this.dateToInput, resolveDateTemplate(filters.dateTo));

    // 4. Submit via the "Filters" button (GET navigation)
    await this.applyButton.click();
    await this.waitForResultsRefresh();
  }

  /**
   * Click the Reset/Clear link and wait for the results to refresh back to
   * the unfiltered full list. (The Clear link lives inside the modal, so it
   * must be reopened after the GET submit reloads the page.)
   */
  async resetFilters(): Promise<void> {
    await this.openFilterModal();
    await this.resetButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.resetButton.click();
    await this.waitForResultsRefresh();
  }

  /**
   * Wait for the results to refresh after a submit action (Apply/Reset).
   * `networkidle` may not fire for AJAX-only frameworks, so a short fixed
   * wait is used as a fallback — the web-first assertions downstream do the
   * real waiting.
   */
  private async waitForResultsRefresh(): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(800);
  }

  // ---------------------------------------------------------------------------
  // Result inspection
  // ---------------------------------------------------------------------------

  /**
   * Wait until the results area has rendered — either data rows or the
   * "No Data Available" empty-state message — so row collection never reads a
   * table that has not loaded yet. Tolerant of an empty database (no rows AND
   * no empty-state message just logs a warning and proceeds).
   */
  async waitForResultsSettled(timeout = 10_000): Promise<void> {
    await Promise.race([
      this.resultRows.first().waitFor({ state: 'visible', timeout }),
      this.noRecordsMessage.waitFor({ state: 'visible', timeout }),
    ]).catch(() => {
      console.warn('[VisitFilter] Results area did not settle within timeout');
    });
  }

  /**
   * Wait until the results table settles after applying filters: either the
   * empty-state message appears or the first data row's text no longer matches
   * the pre-filter first row. Guards against collecting stale pre-filter rows.
   * Falls back gracefully if the first row is legitimately identical across
   * the two states — downstream assertions surface any genuine mismatch.
   */
  async waitForFilteredResults(previousFirstRow: string, timeout = 10_000): Promise<void> {
    try {
      await expect(async () => {
        const emptyVisible = await this.noRecordsMessage.isVisible().catch(() => false);
        const firstRowText = await this.resultRows.first()
          .textContent()
          .then((t) => t?.trim() ?? '');
        return emptyVisible || (firstRowText !== '' && firstRowText !== previousFirstRow);
      }).toPass({ timeout, intervals: [500, 1000, 2000, 2000] });
    } catch {
      // Timed out waiting for a visible change — downstream assertions surface
      // any genuine mismatch.
    }
  }

  /**
   * Collect result-row texts across ALL paginated pages by walking the
   * "Next" pagination button until it disappears or `maxPages` is reached.
   *
   * Reuses the pagination interaction pattern from
   * PatientsPage.openLatestAppointmentByStatus() so minRows/rowContains
   * assertions see the full dataset, not just the current page. After each
   * Next click it waits for the new page's first row to render before
   * collecting, so stale rows are never double-counted.
   *
   * @param maxPages - Safety cap on how many pages to walk (default 10)
   * @returns One trimmed string per data row across all visited pages
   */
  async getAllResultRowTexts(maxPages = 10): Promise<string[]> {
    const allRows: string[] = [];

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
      // Collect the data rows rendered on the current page
      const pageRows = await this.resultRows.evaluateAll((rows) =>
        rows.map((row) => row.textContent?.trim() ?? ''),
      );
      allRows.push(...pageRows);

      // Empty current page → no more data to paginate into
      if (pageRows.length === 0) break;

      // No "Next" button → we are on the last page
      const nextVisible = await this.nextPageButton
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (!nextVisible) break;

      // Safety cap reached with more pages available — warn and stop. Note
      // that truncated results can make minRows/rowContains assertions fail.
      if (pageIndex === maxPages - 1) {
        console.warn(
          `[VisitFilter] Pagination cap (${maxPages} pages) reached — results truncated; ` +
          'minRows/rowContains assertions may fail for larger datasets',
        );
        break;
      }

      await this.nextPageButton.click();

      // Keep the fixed settle-wait from the openLatestAppointmentByStatus
      // pattern, then poll briefly until the new page's first row renders
      // (guards against reading stale rows on slow networks). Falls back
      // gracefully if rows are legitimately identical across pages.
      await this.page.waitForTimeout(1000);

      const previousFirstRow = pageRows[0] ?? '';
      try {
        await expect(async () => {
          const firstRowText = await this.resultRows.first()
            .textContent()
            .then((t) => t?.trim() ?? '');
          return firstRowText !== '' && firstRowText !== previousFirstRow;
        }).toPass({ timeout: 3000, intervals: [250, 500, 1000] });
      } catch {
        // Identical first row across pages (or app finished before the poll) —
        // proceed with whatever the next iteration collects.
      }
    }

    return allRows;
  }

  /** Text of the "no records found" message, if visible. */
  async getNoRecordsText(): Promise<string> {
    return (await this.noRecordsMessage.textContent())?.trim() ?? '';
  }

  /** Text of the validation/error feedback, if visible. */
  async getErrorText(): Promise<string> {
    return (await this.errorMessage.textContent())?.trim() ?? '';
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
  'boundary': 'Edge Cases — Boundary & Null Values',
};

test.describe('Visit Filter Component (Data-Driven)', () => {
  // Run all cases in this describe serially: every case submits the filter
  // form and queries the same shared staging database, so parallel execution
  // could cross-contaminate filter state and produce flaky failures.
  test.describe.configure({ mode: 'serial' });

  // Note: no beforeEach header-context sync here — the auth fixture's
  // autoLogin already ensures Branch/Location after login (and the context
  // persists across navigations). The other list-page spec (patients.spec.ts)
  // documents the same pattern. Calling ensureHeaderContext() before the
  // first navigation can race the app's post-login redirect.

  // Register tests at collection time — one `test()` per JSON case.
  const categories = [...new Set(visitFilterCases.map((c) => c.category))];

  for (const category of categories) {
    test.describe(CATEGORY_LABELS[category] ?? category, () => {
      for (const testCase of visitFilterCases.filter((c) => c.category === category)) {
        test(`${testCase.id}: ${testCase.description}`, async ({ page }) => {
          const visitFilterPage = new VisitFilterPage(page);
          const { filters, expected } = testCase;

          console.log('═══════════════════════════════════════════════');
          console.log(`  ${testCase.id} — ${testCase.description}`);
          console.log(`  Expected outcome: ${expected.outcome}`);
          console.log('═══════════════════════════════════════════════');

          // 1. Navigate to the Visits list page
          await visitFilterPage.goto();

          // 2. Apply the filters defined in the JSON case (null = skipped)
          await visitFilterPage.applyFilters(filters);

          // 3. Assert the expected outcome (web-first assertions auto-retry)
          switch (expected.outcome) {
            case 'records': {
              // Wait for the first result row to render (web-first assertion)
              await expect(visitFilterPage.resultRows.first()).toBeVisible({ timeout: 10_000 });

              // Walk every paginated page and collect all matching rows
              const allRowTexts = await visitFilterPage.getAllResultRowTexts();

              // Total row count across ALL pages must meet the minimum
              expect(allRowTexts.length).toBeGreaterThanOrEqual(expected.minRows);
              console.log(`[VisitFilter] ✅ ${allRowTexts.length} row(s) returned`);

              // Every configured "rowContains" text must appear in at least one
              // row anywhere in the paginated result set
              expectRowsContain(allRowTexts, expected.rowContains);
              break;
            }

            case 'noRecords': {
              // Empty-state message must be shown (e.g. "No Data Available")
              await expect(visitFilterPage.noRecordsMessage).toBeVisible({ timeout: 10_000 });
              const message = await visitFilterPage.getNoRecordsText();
              expect(message.toLowerCase()).toContain(expected.noRecordsMessage.toLowerCase());
              console.log(`[VisitFilter] ✅ No-records message: "${message}"`);
              break;
            }

            case 'validationError': {
              // App must surface validation/error feedback gracefully
              await expect(visitFilterPage.errorMessage).toBeVisible({ timeout: 10_000 });
              if (expected.validationMessage) {
                const message = await visitFilterPage.getErrorText();
                expect(message.toLowerCase()).toContain(expected.validationMessage.toLowerCase());
              }
              console.log('[VisitFilter] ✅ Validation/error feedback shown for invalid input');
              break;
            }

            case 'resetRestoresRecords': {
              // 0. Reset first so the baseline is the TRUE full list, not the
              //    page's default (restricted) view. The plain /visits list
              //    can be scoped by header context / a default filter, and a
              //    real filter can then return MORE rows than it (which would
              //    break the narrowing assertion below).
              await visitFilterPage.resetFilters();
              await visitFilterPage.waitForResultsSettled();

              // 1. Capture the unfiltered baseline across ALL pages
              const baseline = await visitFilterPage.getAllResultRowTexts();
              console.log(`[VisitFilter] 📊 Baseline (unfiltered): ${baseline.length} row(s)`);

              // 2. Apply the filters and wait for the filtered results to
              //    render (empty state OR re-rendered rows — never stale ones)
              await visitFilterPage.applyFilters(filters);
              await visitFilterPage.waitForFilteredResults(baseline[0] ?? '');

              // 3. The filter must NARROW the baseline. The expected filtered
              //    state is config-driven via expected.filteredState:
              //      - "noRecords" → empty-state message shown (0 rows)
              //      - "records"   → at least one narrowed row returned
              const filtered = await visitFilterPage.getAllResultRowTexts();
              console.log(`[VisitFilter] 📊 Filtered: ${filtered.length} row(s) (state: ${expected.filteredState})`);

              if (expected.filteredState === 'noRecords') {
                await expect(visitFilterPage.noRecordsMessage).toBeVisible({ timeout: 10_000 });
                expect(filtered.length).toBe(0);
              } else {
                // Narrowing-but-nonempty: at least one row, and the rows must
                // actually match the filter (rowContains is checked here too)
                expect(filtered.length).toBeGreaterThanOrEqual(1);
                expectRowsContain(filtered, expected.rowContains);
              }
              expect(filtered.length).toBeLessThan(baseline.length);

              // 4. Click Reset/Clear and wait for data rows to return
              await visitFilterPage.resetFilters();
              await expect(visitFilterPage.resultRows.first()).toBeVisible({ timeout: 10_000 });

              // 5. Assert the full list is restored across pages: at least as
              //    many rows as the baseline, every baseline row still present,
              //    plus the case's minRows / rowContains requirements
              const restored = await visitFilterPage.getAllResultRowTexts();
              console.log(`[VisitFilter] 📊 After reset: ${restored.length} row(s)`);

              expect(restored.length).toBeGreaterThanOrEqual(baseline.length);
              expect(restored.length).toBeGreaterThanOrEqual(expected.minRows);

              // Live staging rows embed ticking elapsed-time text (e.g. "66h
              // 06:28"), so compare stable identifiers — the leading visit ID
              // — rather than exact row text, which changes between the two
              // paginated walks. Falls back to the full text if no ID is
              // found.
              const stableKey = (row: string): string => {
                const id = /^(\d+)/.exec(row.trim())?.[1];
                return id ?? row.trim();
              };
              const restoredKeys = restored.map(stableKey);
              for (const row of baseline) {
                expect(restoredKeys).toContain(stableKey(row));
              }
              expectRowsContain(restored, expected.rowContains);
              console.log(`[VisitFilter] ✅ Full result list restored (${restored.length} >= baseline ${baseline.length})`);
              break;
            }

            default:
              throw new Error(`[VisitFilter] Unknown expected.outcome: "${expected.outcome}"`);
          }

          // 4. Document the result with a screenshot (never fails the test)
          await page.screenshot({
            path: `test-results/artifacts/visit-filter-${testCase.id}-${Date.now()}.png`,
            fullPage: true,
          }).catch(() => {});
        });
      }
    });
  }
});
