/**
 * =============================================================================
 * E2E Test: Custom Reports — build, preview, save & manage (NEW FEATURE)
 * =============================================================================
 *
 * Full end-to-end workflow:
 *   1. Auto-login (via auth fixture)
 *   2. Open "My Reports" (/reports/custom-reports) and verify the page
 *   3. Open the Report Builder (?subject=sessions&filters[rangeMode]=custom)
 *   4. Fill the builder from the scenario payload: custom date range,
 *      system filter, and exactly the scenario's column checkboxes
 *   5. Submit → land on /reports/custom-reports/preview; assert the results
 *      table headers EQUAL the selected columns (order preserved)
 *   6. Assert the CSV export link exists and carries subject/filters/fields
 *   7. Fill "Save Report" (unique name, one_time, private) → redirect to My
 *      Reports with a success toast
 *   8. Assert the saved row appears in My Reports (type + visibility badge)
 *   9. Cleanup: delete the report through its row Delete button — a NATIVE
 *      confirm() dialog that must be accepted via page.on('dialog')
 *  10. A second, read-only variant covers the PATIENTS subject with the
 *      WEEKLY preset (dates disabled — the test must not touch them)
 *
 * The feature is plain server-rendered forms (no Livewire on these screens):
 * builder state rides in query params; preview carries the built report in
 * hidden inputs of the Save form.
 *
 * @see config/custom-report-scenarios/sessions-custom-range.scenario.json
 * @see config/custom-report-scenarios/patients-weekly-preset.scenario.json
 * @see src/pages/custom-reports.page.ts
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { CustomReportsPage } from '../src/pages/custom-reports.page';
import { getCustomReportData } from '../src/helpers/custom-report-data.loader';

test.describe('E2E: Custom Reports (build → preview → save → manage)', () => {

  // Two full form round-trips + list assertions per test — same rationale as
  // the other multi-step specs.
  test.setTimeout(180_000);

  let reportsPage: CustomReportsPage;

  test.beforeEach(async ({ page }) => {
    reportsPage = new CustomReportsPage(page);
  });

  test('should build a sessions report with a custom range, preview it, save it and delete it', async ({ page }) => {
    // =========================================================================
    // 1. Load configurable test parameters
    // =========================================================================
    const data = getCustomReportData('sessions-custom-range.scenario.json');
    const expectedFields = data.fields!.split(',').map((f) => f.trim());
    const reportName = data.saveReport!;

    console.log('═══════════════════════════════════════════════');
    console.log('  CUSTOM REPORTS TEST (sessions / custom range)');
    console.log(`  Subject:    ${data.subject}`);
    console.log(`  Range:      ${data.rangeMode} ${data.dateFrom} → ${data.dateTo}`);
    console.log(`  System:     ${data.systemFilter}`);
    console.log(`  Columns:    ${data.fields}`);
    console.log(`  Report:     ${reportName}`);
    console.log('═══════════════════════════════════════════════');

    // =========================================================================
    // 2. My Reports opens
    // =========================================================================
    console.log('\n📋 Step 1: Open My Reports...');
    await reportsPage.openMyReports();
    console.log('[Test] ✅ My Reports page loaded');

    // =========================================================================
    // 3. Builder for sessions + custom range
    // =========================================================================
    console.log('\n📋 Step 2: Open Report Builder (sessions, custom range)...');
    await reportsPage.openBuilder(data.subject!, data.rangeMode!);
    console.log('[Test] ✅ Builder opened');

    // =========================================================================
    // 4. Fill the builder section by section
    // =========================================================================
    console.log('\n📋 Step 3: Fill the builder (dates, filter, columns)...');
    const expectedColumns = await reportsPage.fillBuilderForm(data);
    expect(expectedColumns.length).toBe(expectedFields.length);
    console.log(`[Test] ✅ Builder filled — checked columns: ${JSON.stringify(expectedColumns)}`);

    // =========================================================================
    // 5. Preview — headers must equal the selected columns' labels
    // =========================================================================
    console.log('\n📋 Step 4: Preview the report...');
    const headers = await reportsPage.submitBuilderAndPreview();
    expect(
      headers,
      `preview columns should be [${expectedColumns.join(', ')}]`,
    ).toEqual(expectedColumns);
    console.log(`[Test] ✅ Preview table headers match: ${JSON.stringify(headers)}`);

    // =========================================================================
    // 6. Export links carry the built report
    // =========================================================================
    console.log('\n📋 Step 5: Verify CSV export link...');
    await reportsPage.verifyExportLinks([
      `subject=${data.subject}`,
      `filters%5BrangeMode%5D=${data.rangeMode}`,
      `fields%5B0%5D=${expectedFields[0]}`,
    ]);
    console.log('[Test] ✅ CSV export link present with the right params');

    // =========================================================================
    // 7. Save the report
    // =========================================================================
    console.log('\n📋 Step 6: Save the report...');
    await reportsPage.saveReport(data);
    const toastVisible = await reportsPage.isSuccessToastVisible(reportName);
    expect(toastVisible, 'success toast "{name}" has been saved.').toBeTruthy();
    console.log(`[Test] ✅ Saved — toast confirmed for "${reportName}"`);

    // =========================================================================
    // 8. Row appears in My Reports
    // =========================================================================
    console.log('\n📋 Step 7: Verify the saved row in My Reports...');
    await reportsPage.verifySavedReportRow(reportName, 'Sessions', 'Private');
    const savedId = await reportsPage.findSavedReportId(reportName);
    expect(savedId).toBeTruthy();
    console.log(`[Test] ✅ Row found — id: ${savedId}`);

    // =========================================================================
    // 9. Cleanup — delete through the UI (native confirm dialog)
    // =========================================================================
    console.log('\n📋 Step 8: Cleanup — delete the saved report...');
    await reportsPage.deleteSavedReport(reportName);
    console.log('[Test] ✅ Report deleted (row gone)');
    void page; // page comes from the fixture; interactions live in the POM

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ CUSTOM REPORT CREATED, SAVED & CLEANED UP');
    console.log(`  ✅ Columns verified: ${expectedFields.length}`);
    console.log(`  ✅ Report id: ${savedId}`);
    console.log('═══════════════════════════════════════════════');
  });

  test('should preview a patients report with the weekly preset without touching disabled dates', async ({ page }) => {
    // Read-only variant: preset range (disabled date inputs), no save.
    const data = getCustomReportData('patients-weekly-preset.scenario.json');
    const expectedFields = data.fields!.split(',').map((f) => f.trim());

    console.log('═══════════════════════════════════════════════');
    console.log('  CUSTOM REPORTS TEST (patients / weekly preset)');
    console.log(`  Subject: ${data.subject}, Range: ${data.rangeMode}`);
    console.log(`  Columns: ${data.fields}`);
    console.log('═══════════════════════════════════════════════');

    console.log('\n📋 Step 1: Open the Builder (patients, weekly preset)...');
    await reportsPage.openBuilder(data.subject!, data.rangeMode!);

    console.log('\n📋 Step 2: Fill the builder (columns only — dates are preset/disabled)...');
    const expectedColumns = await reportsPage.fillBuilderForm(data);
    expect(expectedColumns.length).toBe(expectedFields.length);

    console.log('\n📋 Step 3: Preview and assert the columns...');
    const headers = await reportsPage.submitBuilderAndPreview();
    expect(headers, 'weekly patients preview columns').toEqual(expectedColumns);
    console.log(`[Test] ✅ Preview table headers match: ${JSON.stringify(headers)}`);

    console.log('\n📋 Step 4: Verify CSV export link...');
    await reportsPage.verifyExportLinks([
      `subject=${data.subject}`,
      `filters%5BrangeMode%5D=${data.rangeMode}`,
    ]);
    console.log('[Test] ✅ Export links OK');
    void page;
  });
});
