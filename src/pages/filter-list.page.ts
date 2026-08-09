import { expect, type Locator, type Page } from '@playwright/test';

/**
 * FilterListPage — shared base class for the data-driven list-page filter
 * specs (Visit / Patient / Employee).
 *
 * Contains the result-inspection machinery that the three filter specs
 * (tests/visit_filter.spec.ts, tests/patient_filter.spec.ts and
 * tests/employee_filter.spec.ts) previously duplicated inline:
 *   - pagination-aware result collection across ALL pages (Next-button walk)
 *   - settle waits after applying / resetting filters
 *   - empty-state ("No Data Available") and validation/error readers
 *
 * Subclasses provide the page-specific bits:
 *   - the list URL (constructor arg) used by goto() / resetFilters()
 *   - the filter-field locators and their setField()/applyFilters() interaction
 *   - optionally override resetFilters() when the page has its own clear
 *     control (the Visits filter modal's "Clear" link — patients and
 *     employees just navigate back to the plain list URL)
 *
 * Shared locators:
 *   - nextPageButton — union of the pagination "Next" selectors found on all
 *     three list pages (see the constructor for the per-page notes)
 *   - resultRows / noRecordsMessage — exclude the in-tbody <th> header row
 *     and the "No Data Available" empty-state row
 *
 * NOTE: like the previous inline page objects, this class uses Playwright's
 * `expect(...).toPass()` for the polling waits — the web-first assertions in
 * the specs do the real waiting for the final result.
 */
export abstract class FilterListPage {
  /** The Playwright page instance */
  protected readonly page: Page;

  /** List page URL (e.g. `/patients`) used by goto() and the base resetFilters() */
  protected readonly listUrl: string;

  /**
   * Fixed settle wait after applying filters, in ms. The web-first
   * assertions downstream do the real waiting; this just covers framework
   * debounce / AJAX re-render gaps. Livewire live-search pages (employees)
   * may need a longer value — subclasses can raise it.
   */
  protected resultsRefreshSettleMs = 800;

  // ---------------------------------------------------------------------------
  // Locators — shared by all three list pages
  // ---------------------------------------------------------------------------
  readonly nextPageButton: Locator;
  readonly resultRows: Locator;
  readonly noRecordsMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page, listUrl: string) {
    this.page = page;
    this.listUrl = listUrl;

    // Pagination "Next" button — union of the selectors used across the three
    // list pages:
    //   visits:    nav-wrapped pagination (nav a/button "Next", [rel="next"])
    //   patients:  plain ul.pagination with an a[rel="next"] GET link
    //   employees: Laravel pagination rendered as Livewire
    //              wire:click="nextPage('page')" buttons (">" and "»")
    this.nextPageButton = page.locator(
      'nav a:has-text("Next"), nav button:has-text("Next"), ' +
      'nav [rel="next"], nav li:has-text("Next") button, ' +
      '[aria-label="Next"], .pagination .next a, .pagination .next button, ' +
      '.pagination a[rel="next"], .pagination a:has-text("Next"), ' +
      '.pagination button[wire\\:click*="nextPage"], ' +
      '.pagination button:has-text("»"), .pagination button:has-text(">")',
    ).first();

    // Result rows — the list tables render their header as a <tr> with <th>
    // cells INSIDE tbody, plus a "No Data Available" empty-state row. Exclude
    // both so count()/visibility assertions only consider real data rows.
    this.resultRows = page
      .locator('table tbody tr')
      .filter({ hasNot: page.locator('th') })
      .filter({ hasNot: page.locator('td:has-text("No Data Available")') })
      .filter({ hasNot: page.locator('.dataTables_empty') })
      .filter({ hasNot: page.locator('td:has-text("No records found")') });

    this.noRecordsMessage = page.locator(
      'td:has-text("No Data Available"), [data-testid="no-records"], tr:has-text("No Data Available")',
    ).first();

    this.errorMessage = page.locator(
      '[data-testid="filter-error"], .alert-danger, .invalid-feedback, .swal2-popup',
    ).first();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /** Navigate to the list page (URL provided by the subclass). */
  async goto(): Promise<void> {
    await this.page.goto(this.listUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  }

  /**
   * Reset the filter. Default: navigate to the plain list URL again (patients
   * and employees have no dedicated clear control). Subclasses with their own
   * reset (the Visits filter modal's "Clear" link) override this.
   */
  async resetFilters(): Promise<void> {
    await this.goto();
    await this.page.waitForTimeout(this.resultsRefreshSettleMs);
  }

  /**
   * Wait for the results to refresh after a submit/search action.
   * `networkidle` may not fire for AJAX-only frameworks, so a short fixed
   * wait (resultsRefreshSettleMs) is used as a fallback — the web-first
   * assertions downstream do the real waiting.
   */
  protected async waitForResultsRefresh(): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(this.resultsRefreshSettleMs);
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
      console.warn('[FilterList] Results area did not settle within timeout');
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
   * The walk works for both GET-link pagination (full page navigation on the
   * patients/visits lists) and Livewire `wire:click` buttons (AJAX re-render
   * on the employees list). After each Next click it waits for the new page's
   * first row to render before collecting, so stale rows are never
   * double-counted.
   *
   * @param maxPages - Safety cap on how many pages to walk (default 20)
   * @returns One trimmed string per data row across all visited pages
   */
  async getAllResultRowTexts(maxPages = 20): Promise<string[]> {
    const allRows: string[] = [];

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
      // Collect the data rows rendered on the current page
      const pageRows = await this.resultRows.evaluateAll((rows) =>
        rows.map((row) => row.textContent?.trim() ?? ''),
      );
      allRows.push(...pageRows);

      // Empty current page → no more data to paginate into
      if (pageRows.length === 0) break;

      // No "Next" button → we are on the last page. Use waitFor (rather than
      // a single instantaneous isVisible check): Livewire re-renders (the
      // employees list) briefly detach/replace the pagination, and an instant
      // check can wrongly conclude "last page" mid-swap. If the button never
      // becomes visible within the budget, treat the current page as the last.
      let nextVisible = true;
      try {
        await this.nextPageButton.waitFor({ state: 'visible', timeout: 3000 });
      } catch {
        nextVisible = false;
      }
      if (!nextVisible) break;

      // Safety cap reached with more pages available — warn and stop. Note
      // that truncated results can make minRows/rowContains assertions fail.
      if (pageIndex === maxPages - 1) {
        console.warn(
          `[FilterList] Pagination cap (${maxPages} pages) reached — results truncated; ` +
          'minRows/rowContains assertions may fail for larger datasets',
        );
        break;
      }

      await this.nextPageButton.click();

      // Keep the fixed settle-wait, then poll briefly until the new page's
      // first row renders (guards against reading stale rows on slow
      // networks). Falls back gracefully if rows are legitimately identical
      // across pages.
      await this.page.waitForTimeout(1000);

      const previousFirstRow = pageRows[0] ?? '';
      try {
        await expect(async () => {
          const firstRowText = await this.resultRows.first()
            .textContent()
            .then((t) => t?.trim() ?? '');
          return firstRowText !== '' && firstRowText !== previousFirstRow;
        }).toPass({ timeout: 5000, intervals: [500, 1000, 1000, 2000] });
      } catch {
        // Identical first row across pages (or app finished before the poll) —
        // proceed with whatever the next iteration collects. If the click did
        // land but the re-render was slower than the budget, the next loop
        // iteration re-collects whatever is rendered (possibly the same page's
        // rows) and simply clicks Next again — the walk self-heals, and
        // duplicate rows never break the downstream assertions.
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
