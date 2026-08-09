/**
 * =============================================================================
 * E2E Test: Employee Filter Component — Data-Driven
 * =============================================================================
 *
 * Validates the filter/search controls on the Employees list page
 * (`/employees`) using Playwright's data-driven testing pattern:
 *
 *   - Every scenario (input parameters + expected outcome) lives in
 *     `config/employee_filters.json` as an ARRAY of test-case objects.
 *   - This spec iterates the array and registers ONE Playwright test per case
 *     at collection time, grouped into `test.describe` blocks by `category`.
 *   - No test data is hardcoded here. `null` / `""` filter values mean
 *     "do not touch this field", which is how single-filter and null-value
 *     scenarios are expressed in the JSON.
 *
 * Real staging filter controls (verified via scripts/inspect-employee-filter.ts):
 *   Unlike the Patients list (inline GET form) and Visits list (modal GET
 *   form), the Employees page has TWO live search inputs with NO submit
 *   button. Both are Livewire `wire:model` fields that update the URL query
 *   string and re-render the table via AJAX as you type:
 *
 *     input[placeholder="Search by name, email, or mobile"]  → ?search=
 *     input[placeholder="Search by username"]                → ?username_filter=
 *
 *   Combined filters are AND-ed (verified: search=hossam&username_filter=hossam
 *   → 1 row; search=Wajd&username_filter=Wajd → 0 rows).
 *
 * Covered scenarios (driven by config/employee_filters.json):
 *   1. Happy path  — combined search + username (name match and email
 *      fragment match, AND semantics)
 *   2. Single filter — name search, email-fragment search, and username
 *      search individually
 *   3. Empty state — searches that guarantee zero results show the
 *      "No Data Available" message (single-row `<td colspan="100">`)
 *   4. Boundary — all-null and empty-string filter values
 *   5. Pagination — result assertions walk every page via the "Next" button.
 *      The employees list uses Laravel pagination rendered as Livewire
 *      `wire:click="nextPage('page')"` buttons (NOT GET links like the
 *      patients list), so the Next locator targets those. Staging holds 34
 *      employees at 10 per page → 4 pages.
 *   6. Reset — apply a filter, reset (goto /employees), and assert the full
 *      result list is restored. The baseline is captured AFTER an explicit
 *      reset, and restored rows are compared by stable employee ID (the
 *      leading number of each row), mirroring the patients spec.
 *   7. Full field coverage — the filter schema (search, username) is fully
 *      data-driven; every field is optional per case (null = skipped)
 *
 * Selectors prefer stable CSS selectors aligned to the real staging DOM via
 * scripts/inspect-employee-filter.ts (the page exposes no data-testid
 * attributes). The results table header is excluded from the data-row
 * locator, as is the "No Data Available" empty-state row.
 *
 * @see config/employee_filters.json — all test cases (input + expected output)
 * @see src/fixtures/auth.fixture.ts — auto-login before every test
 * @see src/pages/filter-list.page.ts — shared FilterListPage base (result
 *      inspection: pagination walk, settle waits, empty-state readers)
 */

import { type Locator, type Page } from '@playwright/test';
import { test, expect } from '../src/fixtures/auth.fixture';
import { FilterListPage } from '../src/pages/filter-list.page';
import employeeFilterCases from '../config/employee_filters.json';

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
    console.log(`[EmployeeFilter] ✅ Row contains "${text}"`);
  }
}

// =============================================================================
// Page Object — Employee Filter component
// =============================================================================

/**
 * Shape of the `filters` block in each JSON test case. Every field is
 * optional per case — `null`/`""` means "do not touch this filter".
 */
interface EmployeeFilters {
  search: string | null;    // ?search= — name, email, or mobile (live input)
  username: string | null;  // ?username_filter= — username (live input)
}

/**
 * EmployeeFilterPage — Page Object Model for the Employee filter/search
 * controls on the Employees list page.
 *
 * Extends the shared FilterListPage base (src/pages/filter-list.page.ts),
 * which provides the pagination walk, settle waits and empty-state readers
 * common to all list-page filter specs. This subclass supplies only the
 * page-specific filter interaction: the two Livewire live-search inputs.
 *
 * The two search inputs are Livewire live fields: typing updates the URL
 * query string and re-renders the table via AJAX (no submit button, no page
 * reload). Filling a field and waiting for the results to settle is
 * therefore the whole interaction. Navigating to /employees again acts as
 * the reset (the base class resetFilters()).
 *
 * Because two debounced Livewire updates run sequentially when both filters
 * are applied, this page raises the base settle wait (resultsRefreshSettleMs)
 * from 800 ms to 1200 ms.
 */
class EmployeeFilterPage extends FilterListPage {
  // ---------------------------------------------------------------------------
  // Locators — page-specific search inputs
  // ---------------------------------------------------------------------------
  readonly nameSearchInput: Locator;
  readonly usernameSearchInput: Locator;

  constructor(page: Page) {
    super(page, '/employees');

    // The Livewire live-search debounce adds up when both fields are filled in
    // one applyFilters() call — give the settle wait a little more headroom.
    this.resultsRefreshSettleMs = 1200;

    // Live search inputs (placeholders verified against staging DOM)
    this.nameSearchInput = page.locator(
      'input[placeholder="Search by name, email, or mobile"]',
    ).first();
    this.usernameSearchInput = page.locator(
      'input[placeholder="Search by username"]',
    ).first();
  }

  // ---------------------------------------------------------------------------
  // Filter interactions
  // ---------------------------------------------------------------------------

  /**
   * Set a single filter field — only when a value is present.
   * `null`, `undefined` or `""` values in the JSON mean "do not touch this
   * field". Both fields are plain text inputs wired to Livewire, so fill +
   * blur is the whole interaction (the blur commits the live update).
   */
  private async setField(locator: Locator, value: string | null | undefined): Promise<void> {
    if (value === null || value === undefined || value === '') return;

    await locator.waitFor({ state: 'visible', timeout: 10_000 });
    await locator.fill(value);
    await locator.blur(); // commit the change for the Livewire listener
  }

  /** Apply every filter defined in the JSON case (null = skipped). */
  async applyFilters(filters: EmployeeFilters): Promise<void> {
    await this.setField(this.nameSearchInput, filters.search);
    await this.setField(this.usernameSearchInput, filters.username);
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

test.describe('Employee Filter Component (Data-Driven)', () => {
  // Run all cases in this describe serially: every case queries the same
  // shared staging database through Livewire AJAX, so parallel execution
  // could cross-contaminate filter state and produce flaky failures.
  test.describe.configure({ mode: 'serial' });

  // Note: no beforeEach header-context sync here — the auth fixture's
  // autoLogin already ensures Branch/Location after login (and the context
  // persists across navigations). Same pattern as the other list-page specs.

  // Register tests at collection time — one `test()` per JSON case.
  const categories = [...new Set(employeeFilterCases.map((c) => c.category))];

  for (const category of categories) {
    test.describe(CATEGORY_LABELS[category] ?? category, () => {
      for (const testCase of employeeFilterCases.filter((c) => c.category === category)) {
        test(`${testCase.id}: ${testCase.description}`, async ({ page }) => {
          const employeeFilterPage = new EmployeeFilterPage(page);
          const { filters, expected } = testCase;

          console.log('═══════════════════════════════════════════════');
          console.log(`  ${testCase.id} — ${testCase.description}`);
          console.log(`  Expected outcome: ${expected.outcome}`);
          console.log('═══════════════════════════════════════════════');

          // 1. Navigate to the Employees list page
          await employeeFilterPage.goto();

          // 2. Apply the filters defined in the JSON case (null = skipped)
          await employeeFilterPage.applyFilters(filters);

          // 3. Assert the expected outcome (web-first assertions auto-retry)
          switch (expected.outcome) {
            case 'records': {
              // Wait for the first result row to render (web-first assertion)
              await expect(employeeFilterPage.resultRows.first()).toBeVisible({ timeout: 10_000 });

              // Walk every paginated page and collect all matching rows
              const allRowTexts = await employeeFilterPage.getAllResultRowTexts();

              // Total row count across ALL pages must meet the minimum
              expect(allRowTexts.length).toBeGreaterThanOrEqual(expected.minRows);
              console.log(`[EmployeeFilter] ✅ ${allRowTexts.length} row(s) returned`);

              // Every configured "rowContains" text must appear in at least one
              // row anywhere in the paginated result set
              expectRowsContain(allRowTexts, expected.rowContains);
              break;
            }

            case 'noRecords': {
              // Empty-state message must be shown (e.g. "No Data Available")
              await expect(employeeFilterPage.noRecordsMessage).toBeVisible({ timeout: 10_000 });
              const message = await employeeFilterPage.getNoRecordsText();
              expect(message.toLowerCase()).toContain(expected.noRecordsMessage.toLowerCase());
              console.log(`[EmployeeFilter] ✅ No-records message: "${message}"`);
              break;
            }

            case 'validationError': {
              // App must surface validation/error feedback gracefully
              await expect(employeeFilterPage.errorMessage).toBeVisible({ timeout: 10_000 });
              if (expected.validationMessage) {
                const message = await employeeFilterPage.getErrorText();
                expect(message.toLowerCase()).toContain(expected.validationMessage.toLowerCase());
              }
              console.log('[EmployeeFilter] ✅ Validation/error feedback shown for invalid input');
              break;
            }

            case 'resetRestoresRecords': {
              // 0. Reset first so the baseline is the TRUE full list (the
              //    plain /employees default view is the full list, but
              //    resetting explicitly keeps the invariant robust).
              await employeeFilterPage.resetFilters();
              await employeeFilterPage.waitForResultsSettled();

              // 1. Capture the unfiltered baseline across ALL pages
              const baseline = await employeeFilterPage.getAllResultRowTexts();
              console.log(`[EmployeeFilter] 📊 Baseline (unfiltered): ${baseline.length} row(s)`);

              // 2. Apply the filters and wait for the filtered results to
              //    render (empty state OR re-rendered rows — never stale ones)
              await employeeFilterPage.applyFilters(filters);
              await employeeFilterPage.waitForFilteredResults(baseline[0] ?? '');

              // 3. The filter must NARROW the baseline. The expected filtered
              //    state is config-driven via expected.filteredState:
              //      - "noRecords" → empty-state message shown (0 rows)
              //      - "records"   → at least one narrowed row returned
              const filtered = await employeeFilterPage.getAllResultRowTexts();
              console.log(`[EmployeeFilter] 📊 Filtered: ${filtered.length} row(s) (state: ${expected.filteredState})`);

              if (expected.filteredState === 'noRecords') {
                await expect(employeeFilterPage.noRecordsMessage).toBeVisible({ timeout: 10_000 });
                expect(filtered.length).toBe(0);
              } else {
                // Narrowing-but-nonempty: at least one row, and the rows must
                // actually match the filter (rowContains is checked here too)
                expect(filtered.length).toBeGreaterThanOrEqual(1);
                expectRowsContain(filtered, expected.rowContains);
              }
              expect(filtered.length).toBeLessThan(baseline.length);

              // 4. Reset and wait for data rows to return
              await employeeFilterPage.resetFilters();
              await expect(employeeFilterPage.resultRows.first()).toBeVisible({ timeout: 10_000 });

              // 5. Assert the full list is restored across pages: at least as
              //    many rows as the baseline, every baseline row still present,
              //    plus the case's minRows / rowContains requirements
              const restored = await employeeFilterPage.getAllResultRowTexts();
              console.log(`[EmployeeFilter] 📊 After reset: ${restored.length} row(s)`);

              expect(restored.length).toBeGreaterThanOrEqual(baseline.length);
              expect(restored.length).toBeGreaterThanOrEqual(expected.minRows);

              // Compare stable identifiers — the leading employee ID — rather
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
              console.log(`[EmployeeFilter] ✅ Full result list restored (${restored.length} >= baseline ${baseline.length})`);
              break;
            }

            default:
              throw new Error(`[EmployeeFilter] Unknown expected.outcome: "${expected.outcome}"`);
          }

          // 4. Document the result with a screenshot (never fails the test)
          await page.screenshot({
            path: `test-results/artifacts/employee-filter-${testCase.id}-${Date.now()}.png`,
            fullPage: true,
          }).catch(() => {});
        });
      }
    });
  }
});
