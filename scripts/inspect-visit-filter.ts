/**
 * Inspect the Visits list page / Visit Filter component on staging.
 *
 * Logs in, navigates to the visits route, and dumps the filter-relevant DOM:
 * nav links, forms, inputs/selects (name/id/placeholder/data-testid), buttons,
 * the data-testid inventory, and Select2 widget presence — so the
 * VisitFilterPage locators in tests/visit_filter.spec.ts can be aligned to the
 * real staging markup.
 *
 * Run: npx tsx scripts/inspect-visit-filter.ts
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

    // 2. Try to reach the visits list page
    console.log('\n=== 2. NAVIGATE TO /visits ===');
    await page.goto(`${BASE_URL}/visits`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch((e) => console.log(`goto /visits error: ${String(e.message).split('\n')[0]}`));
    await page.waitForTimeout(4000);
    console.log(`Visits URL: ${page.url()}`);

    // 3. Nav links mentioning "visit"
    console.log('\n=== NAV LINKS (href contains "visit") ===');
    const visitLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="visit" i]'))
        .map((a) => ({ text: a.textContent?.trim() || '', href: a.getAttribute('href') || '' }))
        .slice(0, 30);
    });
    visitLinks.forEach((l) => console.log(`  "${l.text}" -> ${l.href}`));

    // 4. Forms on the page
    console.log('\n=== FORMS ===');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f) => ({
        id: f.id || '',
        className: f.className || '',
        action: f.getAttribute('action') || '',
      }));
    });
    forms.forEach((f) => console.log(`  form id="${f.id}" class="${f.className}" action="${f.action}"`));

    // 5. Inputs & selects (with name/id/placeholder/testid + select2 flag)
    console.log('\n=== INPUTS & SELECTS ===');
    // NOTE: keep callbacks as single inline arrows — named const-arrow
    // helpers inside page.evaluate trigger a tsx `__name is not defined`
    // error when the function is serialized into the browser.
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

    // 6. Filter-ish buttons
    console.log('\n=== FILTER-ISH BUTTONS ===');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'))
        .map((b) => b.textContent?.trim() || b.getAttribute('value') || '')
        .filter((t) => /filter|apply|search|reset|clear|visit/i.test(t))
        .slice(0, 20);
    });
    buttons.forEach((b) => console.log(`  "${b}"`));

    // 7. data-testid inventory
    console.log('\n=== DATA-TESTIDS ===');
    const testids = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid]'))
        .map((el) => el.getAttribute('data-testid'))
        .filter((t, i, a): t is string => !!t && a.indexOf(t) === i);
    });
    testids.forEach((t) => console.log(`  ${t}`));

    // 8. Select2 presence
    const select2Count = await page.locator('.select2-container').count();
    console.log(`\n=== SELECT2 containers on page: ${select2Count} ===`);

    // 9. Full HTML of the visit filter form (labels, options, submit button)
    console.log('\n=== FILTER FORM HTML ===');
    const formHtml = await page.evaluate(() => {
      const form = Array.from(document.querySelectorAll('form')).find((f) =>
        (f.getAttribute('action') || '').endsWith('/visits'),
      );
      return form ? form.outerHTML : 'NOT FOUND';
    });
    console.log(formHtml.slice(0, 20000));

    // 10. The "Visits Filter" modal toggle button
    console.log('\n=== MODAL TOGGLE BUTTON HTML ===');
    const toggleHtml = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find((b) =>
        /visits? filter/i.test(b.textContent?.trim() || ''),
      );
      return btn ? btn.outerHTML.slice(0, 1000) : 'NOT FOUND';
    });
    console.log(toggleHtml);

    // 11. Results table & pagination structure
    console.log('\n=== TABLE & PAGINATION ===');
    const tableInfo = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table')).map((t) => ({
        id: t.id || '',
        className: t.className || '',
        dataTable: !!t.classList.contains('dataTable'),
      }));
      const paginate = !!document.querySelector('.dataTables_paginate, .pagination, ul.pagination');
      const nextBtn = !!document.querySelector('a.paginate_button.next, button.paginate_button.next, a[rel="next"]');
      return { tables, paginate, nextBtn };
    });
    console.log(JSON.stringify(tableInfo, null, 2));

    // 12. Table header (columns) + an empty-result trigger via GET query
    console.log('\n=== TABLE HEADER ===');
    const theadHtml = await page.evaluate(() => {
      const th = Array.from(document.querySelectorAll('table thead th')).map((h) => h.textContent?.trim() || '');
      return th.join(' | ');
    });
    console.log(theadHtml);

    console.log('\n=== EMPTY RESULT STATE (GET filter) ===');
    await page.goto(`${BASE_URL}/visits?patient_name=NonExistentPatient123&status=all`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
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

    await page.screenshot({ path: 'test-results/artifacts/visit-filter-structure.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/visit-filter-structure.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-visit-filter-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
