/**
 * =============================================================================
 * E2E Test: Custom Reports — create a KEPT saved report (NO deletion)
 * =============================================================================
 *
 * Purpose:
 *   Builds a report from a fully JSON-editable scenario
 *   (config/custom-report-scenarios/sessions-saved-report.scenario.json),
 *   saves it, and INTENTIONALLY leaves it on staging — no cleanup. Use it to
 *   seed a real report for manual review, demos, or scheduled-delivery checks.
 *
 * Everything is editable from the scenario JSON alone:
 *   - subject / rangeMode / dateFrom / dateTo
 *   - branchFilter / systemFilter / visitStatusFilter (option texts)
 *   - fields (comma-separated column-key suffixes)
 *   - saveReport ("DYNAMIC" → unique name per run; or a fixed string)
 *   - frequency (one_time|weekly|monthly|quarterly)
 *   - visibility (private|public)
 *   - recipients (required by the server form)
 *
 * Workflow (same flow as custom-reports.spec.ts, minus the delete step):
 *   1. Auto-login (via auth fixture)
 *   2. Builder (?subject=sessions&filters[rangeMode]=custom) — dates editable
 *   3. Fill dates/filters/columns from the scenario
 *   4. Preview → assert table headers EQUAL the selected columns' labels
 *   5. Assert the CSV export link carries subject/rangeMode/fields
 *   6. Save Report → redirect + toast
 *   7. Assert the row in My Reports (type + visibility badge) and log its id
 *   8. DONE — the report stays on staging on purpose
 *
 * @see config/custom-report-scenarios/sessions-saved-report.scenario.json
 * @see src/pages/custom-reports.page.ts
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { CustomReportsPage } from '../src/pages/custom-reports.page';
import { getCustomReportData } from '../src/helpers/custom-report-data.loader';
import catalog from '../config/custom-report-scenarios/choose-fields.catalog.json';
import scenario from '../config/custom-report-scenarios/sessions-saved-report.scenario.json';

test.describe('E2E: Custom Reports — kept saved report (no delete)', () => {

  test.setTimeout(180_000);

  let reportsPage: CustomReportsPage;

  test.beforeEach(async ({ page }) => {
    reportsPage = new CustomReportsPage(page);
  });

  test('should create a sessions report from the scenario values and KEEP it (no deletion)', async () => {
    // =========================================================================
    // 1. Load configurable test parameters (all values from the scenario JSON)
    // =========================================================================
    const reportName = scenario._fields.saveReport === 'DYNAMIC'
      ? undefined // let the loader generate the unique name
      : scenario._fields.saveReport;

    // =========================================================================
    // 1b. Resolve the COLUMN CHECKLIST against the Choose-Fields catalog
    //     Every catalog key must appear exactly once in scenario.columns;
    //     true → include the column, false → leave it out.
    //     "selectAll": true short-circuits the checklist into "ALL".
    // =========================================================================
    const catalogKeys: string[] = Object.values(catalog._fields)
      .flat()
      .map((entry: any) => entry.key as string);

    let selectedFields: string;
    if (scenario.selectAll === true) {
      selectedFields = 'ALL';
      console.log(`[Columns] selectAll=true → ALL ${catalogKeys.length} choose-fields will be included`);
    } else {
      const checklistKeys = Object.values(scenario.columns ?? {})
        .flatMap((group: any) => Object.keys(group));
      const selected = Object.values(scenario.columns ?? {})
        .flatMap((group: any) => Object.entries(group))
        .filter(([, on]) => on === true)
        .map(([key]) => key);

      const unknown = checklistKeys.filter((k) => !catalogKeys.includes(k));
      const missing = catalogKeys.filter((k) => !checklistKeys.includes(k));
      expect(
        unknown,
        `Scenario checklist has key(s) NOT in choose-fields.catalog.json: ${JSON.stringify(unknown)}. ` +
        'Fix the typo or update the catalog.',
      ).toEqual([]);
      expect(
        missing,
        `Scenario checklist is MISSING catalog key(s): ${JSON.stringify(missing)}. ` +
        'Add them (the developer likely added new Choose Fields) so every option stays visible.',
      ).toEqual([]);

      selectedFields = selected.join(',');
      console.log(`[Columns] ${selected.length}/${catalogKeys.length} chosen: ${selectedFields || '(none)'}`);
    }

    const data = getCustomReportData('sessions-saved-report.scenario.json', {
      ...(reportName ? { saveReport: reportName } : {}),
      fields: selectedFields,
    });

    console.log('═══════════════════════════════════════════════');
    console.log('  CUSTOM REPORTS — KEPT REPORT');
    console.log(`  Subject:      ${data.subject}`);
    console.log(`  Range:        ${data.rangeMode} ${data.dateFrom} → ${data.dateTo}`);
    console.log(`  Branch:       ${data.branchFilter || '(all)'}`);
    console.log(`  System:       ${data.systemFilter || '(all)'}`);
    console.log(`  Visit Status: ${data.visitStatusFilter || '(all)'}`);
    console.log(`  Columns:      ${data.fields}`);
    console.log(`  Report Name:  ${data.saveReport}`);
    console.log(`  Frequency:    ${data.frequency}, Visibility: ${data.visibility}`);
    console.log(`  Recipients:   ${data.recipients}`);
    console.log('═══════════════════════════════════════════════');

    expect(data.saveReport, 'scenario must provide saveReport').toBeTruthy();
    expect(data.recipients, 'recipients is required by the server form').toBeTruthy();

    // =========================================================================
    // 2. Builder for the scenario subject + range mode
    // =========================================================================
    console.log('\n📋 Step 1: Open Report Builder...');
    await reportsPage.openBuilder(data.subject!, data.rangeMode!);
    console.log('[Test] ✅ Builder opened');

    // =========================================================================
    // 3. Fill everything from the scenario
    // =========================================================================
    console.log('\n📋 Step 2: Fill dates / filters / columns from the scenario...');
    const expectedColumns = await reportsPage.fillBuilderForm(data);
    console.log(`[Test] ✅ Builder filled — columns: ${JSON.stringify(expectedColumns)}`);

    // =========================================================================
    // 4. Preview — headers must equal the selected columns' labels
    // =========================================================================
    console.log('\n📋 Step 3: Preview the report...');
    const headers = await reportsPage.submitBuilderAndPreview();
    expect(headers, 'preview columns should match the scenario selection')
      .toEqual(expectedColumns);
    console.log(`[Test] ✅ Preview headers match: ${JSON.stringify(headers)}`);

    // =========================================================================
    // 5. Export link sanity
    // =========================================================================
    console.log('\n📋 Step 4: Verify CSV export link...');
    await reportsPage.verifyExportLinks([
      `subject=${data.subject}`,
      `filters%5BrangeMode%5D=${data.rangeMode}`,
    ]);
    console.log('[Test] ✅ CSV export link OK');

    // =========================================================================
    // 6. Save the report (KEPT — no delete step in this spec)
    // =========================================================================
    console.log('\n📋 Step 5: Save the report...');
    await reportsPage.saveReport(data);
    const toastVisible = await reportsPage.isSuccessToastVisible(data.saveReport!);
    expect(toastVisible, 'success toast "{name}" has been saved.').toBeTruthy();
    console.log(`[Test] ✅ Saved — toast confirmed for "${data.saveReport}"`);

    // =========================================================================
    // 7. Verify the row persists in My Reports
    // =========================================================================
    console.log('\n📋 Step 6: Verify the row in My Reports...');
    await reportsPage.verifySavedReportRow(
      data.saveReport!,
      'Sessions',
      data.visibility === 'public' ? 'Public' : 'Private',
    );
    const savedId = await reportsPage.findSavedReportId(data.saveReport!);
    expect(savedId).toBeTruthy();
    console.log(`[Test] ✅ Report KEPT on staging — id: ${savedId}`);

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ CUSTOM REPORT CREATED AND LEFT IN PLACE');
    console.log(`  ✅ Name: "${data.saveReport}"`);
    console.log(`  ✅ Id:   ${savedId}  (delete manually from My Reports if needed)`);
    console.log('═══════════════════════════════════════════════');
  });
});
