/**
 * Inspect the Patients list page / Patient Filter form on staging.
 *
 * Logs in, navigates to the Patients list page (via the sidebar link, exactly
 * like the tests do), and dumps the filter-relevant DOM: forms, inputs/selects
 * (name/id/placeholder/data-testid), buttons, the data-testid inventory,
 * Select2 widget presence, the results table (header + first rows),
 * pagination, and the empty-result state — so the PatientFilterPage locators
 * in tests/patient_filter.spec.ts can be aligned to the real staging markup.
 *
 * Run: npx tsx scripts/inspect-patient-filter.ts
 * Credentials are loaded from .env (see .env.example).
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    // 1. Login
    console.log('=== 1. LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);
    console.log(`URL after login: ${page.url()}`);

    // 2. Navigate to Patients via the sidebar link (like the tests do)
    console.log('\n=== 2. NAVIGATE TO PATIENTS (sidebar link) ===');
    await page.locator('a').filter({ hasText: /patients/i }).first().click();
    await page.waitForTimeout(4000);
    console.log(`Patients URL: ${page.url()}`);

    // 3. Forms on the page
    console.log('\n=== FORMS ===');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f) => ({
        id: f.id || '',
        className: f.className || '',
        action: f.getAttribute('action') || '',
        method: f.getAttribute('method') || '',
      }));
    });
    forms.forEach((f) => console.log(`  form id="${f.id}" class="${f.className}" action="${f.action}" method="${f.method}"`));

    // 4. Inputs & selects (with name/id/placeholder/testid + select2 flag).
    //    NOTE: keep callbacks as single inline arrows — named const-arrow
    //    helpers inside page.evaluate trigger a tsx `__name is not defined`
    //    error when serialized into the browser.
    console.log('\n=== INPUTS & SELECTS ===');
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('input, select')).map((el) => ({
        tag: el.tagName,
        name: el.getAttribute('name') || '',
        id: el.id || '',
        type: el.getAttribute('type') || '',
        placeholder: el.getAttribute('placeholder') || '',
        testid: el.getAttribute('data-testid') || '',
        visible: el.offsetParent !== null,
        select2: el.classList.contains('select2-hidden-accessible')
          || !!el.parentElement?.querySelector('.select2-container'),
      }));
    });
    fields.forEach((f) => {
      if (f.name || f.id || f.placeholder || f.testid) {
        console.log(
          `  <${f.tag}> name="${f.name}" id="${f.id}" type="${f.type}" ` +
          `ph="${f.placeholder}" testid="${f.testid}" visible=${f.visible} select2=${f.select2}`,
        );
      }
    });

    // 5. Filter-ish buttons
    console.log('\n=== FILTER-ISH BUTTONS ===');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'))
        .map((b) => (b.textContent?.trim() || b.getAttribute('value') || '').replace(/\s+/g, ' '))
        .filter((t) => /filter|apply|search|reset|clear|patient/i.test(t))
        .slice(0, 20);
    });
    buttons.forEach((b) => console.log(`  "${b}"`));

    // 6. data-testid inventory
    console.log('\n=== DATA-TESTIDS ===');
    const testids = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid]'))
        .map((el) => el.getAttribute('data-testid'))
        .filter((t, i, a): t is string => !!t && a.indexOf(t) === i);
    });
    testids.forEach((t) => console.log(`  ${t}`));

    // 7. Select2 presence
    const select2Count = await page.locator('.select2-container').count();
    console.log(`\n=== SELECT2 containers on page: ${select2Count} ===`);

    // 8. Full HTML of the patient filter form (the form containing the
    //    Patient ID input and/or the Filter submit button)
    console.log('\n=== FILTER FORM HTML ===');
    const formHtml = await page.evaluate(() => {
      const form = Array.from(document.querySelectorAll('form')).find((f) =>
        !!f.querySelector('input[name="id"]') ||
        !!f.querySelector('input[type="submit"][value="Filter"]') ||
        (f.querySelectorAll('input, select').length > 0 &&
          /patient/i.test(f.id || f.className || '')),
      );
      return form ? form.outerHTML.slice(0, 30000) : 'NOT FOUND';
    });
    console.log(formHtml);

    // 9. Results table: header + first rows (data only)
    console.log('\n=== TABLE HEADER + FIRST ROWS ===');
    const tableInfo = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table')).map((t) => ({
        id: t.id || '',
        className: t.className || '',
        headers: Array.from(t.querySelectorAll('thead th, tbody th')).map((h) => (h.textContent || '').trim()),
        rows: Array.from(t.querySelectorAll('tbody tr'))
          .filter((tr) => !tr.querySelector('th'))
          .slice(0, 5)
          .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim())),
      }));
      const paginate = !!document.querySelector('.dataTables_paginate, .pagination, ul.pagination');
      const nextBtn = !!document.querySelector('a.paginate_button.next, button.paginate_button.next, a[rel="next"]');
      return { tables, paginate, nextBtn };
    });
    tableInfo.tables.forEach((t, i) => {
      console.log(`  Table #${i} id="${t.id}" class="${t.className}"`);
      console.log(`    Headers: [${t.headers.join(' | ')}]`);
      t.rows.forEach((r) => console.log(`    Row: [${r.join(' | ')}]`));
    });
    console.log(`  pagination present: ${tableInfo.paginate}, next button: ${tableInfo.nextBtn}`);

    // 10. Empty result state — probe a GET filter query with a non-existent
    //     patient ID (the field name seen above, e.g. "id")
    console.log('\n=== EMPTY RESULT STATE (GET filter) ===');
    await page.goto(`${BASE_URL}/patients?id=999999999`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch((e) => console.log(`goto empty-results error: ${String(e.message).split('\n')[0]}`));
    await page.waitForTimeout(3000);
    console.log(`Empty-results URL: ${page.url()}`);
    const emptyInfo = await page.evaluate(() => {
      const tbody = document.querySelector('table tbody');
      const alerts = Array.from(document.querySelectorAll('.alert, [class*="no-record"], [class*="empty"], [class*="nodata"]'))
        .map((el) => el.textContent?.trim() || '')
        .filter((t) => t.length > 0)
        .slice(0, 5);
      return {
        tbodyHtml: tbody ? tbody.innerHTML.slice(0, 2000) : 'NO TBODY',
        rowCount: tbody ? tbody.querySelectorAll('tr').length : 0,
        alerts,
      };
    });
    console.log(`Row count: ${emptyInfo.rowCount}`);
    console.log('Alerts:', JSON.stringify(emptyInfo.alerts));
    console.log('TBODY HTML:', emptyInfo.tbodyHtml);

    // 11. Known-stable patient probe — the target patient ID from config
    console.log('\n=== RECORDS PROBE (GET id=121) ===');
    await page.goto(`${BASE_URL}/patients?id=121`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch((e) => console.log(`goto records error: ${String(e.message).split('\n')[0]}`));
    await page.waitForTimeout(3000);
    const recordsInfo = await page.evaluate(() => {
      const tbody = document.querySelector('table tbody');
      return {
        rowCount: tbody ? tbody.querySelectorAll('tr').length : 0,
        rows: tbody
          ? Array.from(tbody.querySelectorAll('tr'))
            .filter((tr) => !tr.querySelector('th'))
            .slice(0, 3)
            .map((tr) => (tr.textContent || '').replace(/\s+/g, ' ').trim())
          : [],
      };
    });
    console.log(`Row count: ${recordsInfo.rowCount}`);
    recordsInfo.rows.forEach((r) => console.log(`  ${r.slice(0, 200)}`));

    await page.screenshot({ path: 'test-results/artifacts/patient-filter-structure.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/patient-filter-structure.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-patient-filter-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
