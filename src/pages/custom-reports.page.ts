import { expect, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { CustomReportData } from '../data/custom-report.data';

/**
 * CustomReportsPage — page object for the NEW Custom Reports feature
 * (/reports/custom-reports).
 *
 * Three screens:
 *   - My Reports  `/reports/custom-reports`           — saved reports list
 *   - Builder     `/reports/custom-reports/builder`   — report designer (state
 *     in query params; plain form POST to /reports/custom-reports/preview)
 *   - Preview     `/reports/custom-reports/preview`   — results table + CSV/PDF/
 *     Excel exports + "Save Report" form (POST /reports/custom-reports)
 *
 * DOM notes (verified on staging via scripts/inspect-custom-reports.ts and
 * scripts/probe-custom-reports-*.ts):
 *   - Column checkboxes: `input[name="fields[]"]` with ids
 *     `field-{group}-{key}` — matched here by ID SUFFIX so scenarios stay
 *     stable across group renames.
 *   - Preset range modes (daily/weekly/monthly) DISABLE `filters[dateFrom]`
 *     and `filters[dateTo]`; only rangeMode=custom leaves them editable.
 *   - The submit button reads "Preview Report (N fields)".
 *   - Save requires name AND recipients (HTML5 required); frequency defaults
 *     to one_time, visibility to private.
 *   - Success save → redirect to My Reports + toast `"{name}" has been saved.`
 *   - Row Delete uses a NATIVE confirm() dialog → register page.on('dialog')
 *     BEFORE clicking (Playwright auto-dismisses dialogs otherwise).
 */
export class CustomReportsPage extends BasePage {
  private readonly listPath = '/reports/custom-reports';
  private readonly builderPath = '/reports/custom-reports/builder';

  constructor(page: Page) {
    super(page);
  }

  // =========================================================================
  // Navigation
  // =========================================================================

  /** Open the "My Reports" list. */
  async openMyReports(): Promise<void> {
    await this.page.goto(this.listPath, { waitUntil: 'domcontentloaded' });
    // Concrete elements instead of networkidle — the dashboard keeps
    // polling (alerts/Livewire) so network silence never reliably happens.
    await expect(this.page).toHaveURL(/\/reports\/custom-reports$/);
    await expect(this.page.getByRole('heading', { name: 'My Reports' })).toBeVisible();
    await expect(this.page.locator('table tbody tr').first()).toBeVisible();
  }

  /**
   * Open the Report Builder for a subject + range mode via QUERY PARAMS
   * (the subject cards / preset chips themselves are links that only set
   * these params — navigating directly is equivalent and deterministic).
   */
  async openBuilder(subject: string, rangeMode: string): Promise<void> {
    const url =
      `${this.builderPath}?subject=${encodeURIComponent(subject)}` +
      `&filters%5BrangeMode%5D=${encodeURIComponent(rangeMode)}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(`subject=${subject}`));
    // The builder form defines readiness for every fill action below.
    await expect(this.page.locator('form[action*="/preview"]')).toBeVisible();
  }

  // =========================================================================
  // Builder
  // =========================================================================

  /**
   * Fill the builder form section by section.
   * Empty values mean "do not touch" (preset-driven state is kept as-is).
   *
   * Column selection (`data.fields`):
   *   - ""                      → leave the current/preset selection as-is
   *   - "ALL" (any casing)      → check EVERY `fields[]` checkbox on the page
   *   - "key1,key2,..."         → uncheck everything, then check exactly these
   *                               keys (matched by ID-SUFFIX against stable ids
   *                               like `field-patient-info-patientId`)
   *
   * Returns the LABEL texts of all CHECKED boxes in DOM ORDER — the same order
   * the browser submits `fields[]` and the preview renders its headers — so
   * specs can assert `headers` against this list regardless of how the keys
   * were ordered in the scenario JSON.
   */
  async fillBuilderForm(data: CustomReportData): Promise<string[]> {
    // --- Date range (only editable when rangeMode=custom) ---
    if (data.dateFrom || data.dateTo) {
      const from = this.page.locator('input[name="filters[dateFrom]"]');
      const to = this.page.locator('input[name="filters[dateTo]"]');
      if (await from.isEnabled().catch(() => false)) {
        await from.fill(data.dateFrom ?? '');
      }
      if (await to.isEnabled().catch(() => false)) {
        await to.fill(data.dateTo ?? '');
      }
    }

    // --- Filters (selects by OPTION TEXT, like setSelectByOptionText) ---
    if (data.branchFilter) {
      await this.page
        .locator('select[name="filters[branchId]"]')
        .selectOption({ label: data.branchFilter });
    }
    if (data.systemFilter) {
      await this.page
        .locator('select[name="filters[system]"]')
        .selectOption({ label: data.systemFilter });
    }
    if (data.visitStatusFilter) {
      await this.page
        .locator('select[name="filters[visitStatus]"]')
        .selectOption({ label: data.visitStatusFilter });
    }

    // --- Columns: three modes ---
    if (data.fields !== undefined && data.fields !== '') {
      const checkedLabels: string[] = [];

      if (/^all$/i.test(data.fields.trim())) {
        // "ALL" → check every box (labels are collected in DOM order below).
        const boxes = this.page.locator('input[name="fields[]"]');
        const total = await boxes.count();
        if (total === 0) {
          throw new Error('[CustomReportsPage] fields=ALL but no fields[] checkboxes found');
        }
        await boxes.evaluateAll((els) => {
          els.forEach((b) => {
            if (!(b as HTMLInputElement).checked) (b as HTMLInputElement).click();
          });
        });
      } else {
        // Explicit keys → uncheck everything first, then check exactly the
        // wanted ones (id-suffix match). Guarantees the preview columns EQUAL
        // the scenario selection instead of preset + leftovers.
        const wanted = data.fields.split(',').map((k) => k.trim()).filter(Boolean);
        await this.page.locator('input[name="fields[]"]').evaluateAll((boxes) => {
          boxes.forEach((b) => {
            if ((b as HTMLInputElement).checked) (b as HTMLInputElement).click();
          });
        });
        for (const key of wanted) {
          const box = this.page.locator(`input[name="fields[]"][id$="${key}"]`);
          const count = await box.count();
          if (count === 0) {
            throw new Error(
              `[CustomReportsPage] Column checkbox not found for key "${key}" ` +
              `(ids look like field-patient-info-${key}). Check the scenario.`,
            );
          }
          if (count > 1) {
            const ids = await box.evaluateAll((els) => els.map((e) => e.id));
            throw new Error(
              `[CustomReportsPage] Ambiguous column key "${key}" — matches ${count} ` +
              `checkboxes: ${JSON.stringify(ids)}. Use a longer unique suffix.`,
            );
          }
          if (!(await box.isChecked())) await box.check();
        }
      }

      // Collect labels of ALL currently-checked boxes in DOM order — the
      // browser submits fields[] in DOM order and the preview renders its
      // headers in that same order, regardless of how we ticked them.
      checkedLabels.push(
        ...(await this.page.locator('input[name="fields[]"]:checked').evaluateAll((els) =>
          els.map((el) => {
            const id = el.id;
            if (!id) return '';
            const lbl = document.querySelector(`label[for="${id}"]`);
            return lbl ? lbl.textContent!.trim() : '';
          }),
        )),
      );
      return checkedLabels;
    }

    return [];
  }

  /**
   * Submit the builder → land on the Preview page.
   * Returns the column header texts of the results table.
   */
  async submitBuilderAndPreview(): Promise<string[]> {
    await Promise.all([
      this.page.waitForURL('**/reports/custom-reports/preview**', {
        timeout: this.navigationTimeout,
      }),
      this.page.getByRole('button', { name: /Preview Report/i }).click(),
    ]);
    // Concrete readiness signals instead of networkidle (dashboard polling).
    await expect(this.page.locator('table thead th').first()).toBeVisible();
    await this.waitForAnimation(1000); // table render settle
    return this.getPreviewHeaders();
  }

  /** Read the preview results-table headers. */
  async getPreviewHeaders(): Promise<string[]> {
    const headers = this.page.locator('.card table thead th, table thead th');
    const count = await headers.count();
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push((await headers.nth(i).innerText()).trim());
    return out;
  }

  /** Assert the CSV export link exists and carries the expected params. */
  async verifyExportLinks(expectParams: string[]): Promise<void> {
    const csvLink = this.page.locator('a[href*="/export/csv"]');
    await expect(csvLink).toBeVisible();
    const href = await csvLink.getAttribute('href');
    for (const p of expectParams) {
      expect(href, `CSV export should contain "${p}"`).toContain(p);
    }
  }

  // =========================================================================
  // Preview → Save Report
  // =========================================================================

  /**
   * Fill the Save Report form on the preview page (name*, recipients*,
   * frequency & visibility radios) and click "Save Report".
   * Empty fields keep the current/default value.
   */
  async saveReport(data: CustomReportData): Promise<void> {
    const form = this.page.locator('form[action*="custom-reports"]:has(input[name="name"])');

    if (data.saveReport) await form.locator('input[name="name"]').fill(data.saveReport);
    if (data.recipients) await form.locator('input[name="recipients"]').fill(data.recipients);
    if (data.frequency) {
      await form.locator(`input[name="frequency"][value="${data.frequency}"]`).check();
    }
    if (data.visibility) {
      await form.locator(`input[name="visibility"][value="${data.visibility}"]`).check();
    }

    await Promise.all([
      this.page.waitForURL(/\/reports\/custom-reports$/, { timeout: this.navigationTimeout }),
      this.page.getByRole('button', { name: /Save Report/i }).click(),
    ]);
    // Concrete readiness signal instead of networkidle (dashboard polling).
    await expect(this.page.getByRole('heading', { name: 'My Reports' })).toBeVisible();
  }

  /** True when a toast containing `"{name}" has been saved.` is visible. */
  async isSuccessToastVisible(reportName: string): Promise<boolean> {
    return this.page
      .locator(`text="${reportName}" has been saved.`)
      .first()
      .isVisible()
      .catch(() => false);
  }

  // =========================================================================
  // My Reports list
  // =========================================================================

  /** Find the row whose Name cell equals `reportName`; return its id. */
  async findSavedReportId(reportName: string): Promise<string | null> {
    const row = this.savedReportRow(reportName);
    if ((await row.count()) === 0) return null;
    const actions = await row.locator('form[action], a[href]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('action') ?? el.getAttribute('href') ?? ''),
    );
    const m = actions.join('|').match(/\/reports\/custom-reports\/(\d+)(?![/\w])/);
    return m ? m[1] : null;
  }

  /** The <tr> of the saved report inside the My Reports table. */
  private savedReportRow(reportName: string) {
    return this.page
      .locator('table tbody tr')
      .filter({ has: this.page.locator('a', { hasText: reportName }) })
      .first();
  }

  /** Assert a saved report exists in My Reports with Type + Status badges. */
  async verifySavedReportRow(reportName: string, type: string, visibility: string): Promise<void> {
    const row = this.savedReportRow(reportName);
    await expect(row).toBeVisible();
    expect(await row.innerText(), 'row should contain the report type').toContain(type);
    expect(await row.innerText(), 'row should contain the visibility badge').toContain(visibility);
  }

  /**
   * Delete a saved report through its row Delete button.
   * The button sits in a POST form with a NATIVE `confirm()` dialog — the
   * handler MUST be registered before the click (Playwright would otherwise
   * auto-dismiss it and silently cancel the delete).
   */
  async deleteSavedReport(reportName: string): Promise<void> {
    const row = this.savedReportRow(reportName);
    await expect(row).toBeVisible();

    this.page.once('dialog', (dialog) => void dialog.accept());
    await row.locator('form[action*="custom-reports"] button[title="Delete"]').click();

    await this.waitForAnimation(1500);
    await expect(this.savedReportRow(reportName)).toHaveCount(0);
  }
}
