/**
 * Probe the Patients list page result rendering on staging: pagination,
 * total row counts, and the exact empty-state markup for GET filter queries.
 *
 * Run: npx tsx scripts/probe-patient-filter.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

async function dumpTbody(page: import('playwright').Page, label: string): Promise<void> {
  const info = await page.evaluate(() => {
    const tbody = document.querySelector('table tbody');
    return {
      rowCount: tbody ? tbody.querySelectorAll('tr').length : 0,
      html: tbody ? tbody.innerHTML : 'NO TBODY',
    };
  });
  console.log(`--- ${label}: ${info.rowCount} row(s)`);
  console.log(info.html.slice(0, 2500));
  console.log('---END---');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    console.log('=== LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    // 1. Unfiltered /patients — pagination & total rows
    console.log('\n=== 1. UNFILTERED /patients ===');
    await page.goto(`${BASE_URL}/patients`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    const pageInfo = await page.evaluate(() => {
      const pag = document.querySelector('.dataTables_paginate, .pagination, ul.pagination');
      const rows = Array.from(document.querySelectorAll('table tbody tr')).filter((tr) => !tr.querySelector('th'));
      return {
        url: location.href,
        paginationHtml: pag ? pag.outerHTML.slice(0, 1500) : 'NO PAGINATION',
        dataTable: !!document.querySelector('table.dataTable'),
        visibleRowCount: rows.length,
        firstRow: rows[0] ? (rows[0].textContent || '').replace(/\s+/g, ' ').trim() : '',
        lastRow: rows[rows.length - 1] ? (rows[rows.length - 1].textContent || '').replace(/\s+/g, ' ').trim() : '',
      };
    });
    console.log(`URL: ${pageInfo.url}`);
    console.log(`dataTable class: ${pageInfo.dataTable}, visible rows: ${pageInfo.visibleRowCount}`);
    console.log(`First row: ${pageInfo.firstRow.slice(0, 120)}`);
    console.log(`Last row:  ${pageInfo.lastRow.slice(0, 120)}`);
    console.log(`Pagination: ${pageInfo.paginationHtml}`);

    // 2. Empty state via non-existent patient ID
    console.log('\n=== 2. EMPTY STATE ?id=999999999 ===');
    await page.goto(`${BASE_URL}/patients?id=999999999`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    await dumpTbody(page, 'id=999999999');

    // 3. Empty state via non-existent name
    console.log('\n=== 3. EMPTY STATE ?name=zzz_non_existent ===');
    await page.goto(`${BASE_URL}/patients?name=zzz_non_existent`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    await dumpTbody(page, 'name=zzz_non_existent');

    // 4. Records via target patient id=121 (tbody HTML to see exact row markup)
    console.log('\n=== 4. RECORDS ?id=121 ===');
    await page.goto(`${BASE_URL}/patients?id=121`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    await dumpTbody(page, 'id=121');

    // 5. Records via MRN probe (MRN of patient 121 is 9901121)
    console.log('\n=== 5. RECORDS ?mrn=9901121 ===');
    await page.goto(`${BASE_URL}/patients?mrn=9901121`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    await dumpTbody(page, 'mrn=9901121');

    // 6. Records via name (Riyada)
    console.log('\n=== 6. RECORDS ?name=Riyada ===');
    await page.goto(`${BASE_URL}/patients?name=Riyada`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    await dumpTbody(page, 'name=Riyada');

    // 7. Records via status=active (partial match check)
    console.log('\n=== 7. RECORDS ?status=active ===');
    await page.goto(`${BASE_URL}/patients?status=active`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    const activeInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr')).filter((tr) => !tr.querySelector('th'));
      return { count: rows.length, first: rows[0] ? (rows[0].textContent || '').replace(/\s+/g, ' ').trim() : '' };
    });
    console.log(`status=active -> ${activeInfo.count} row(s)`);
    console.log(`  first: ${activeInfo.first.slice(0, 140)}`);

    // 8. Records via referral_status=New Referral (partial match check)
    console.log('\n=== 8. RECORDS ?referral_status=new referral ===');
    await page.goto(`${BASE_URL}/patients?referral_status=new+referral`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    const refInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr')).filter((tr) => !tr.querySelector('th'));
      return { count: rows.length, first: rows[0] ? (rows[0].textContent || '').replace(/\s+/g, ' ').trim() : '' };
    });
    console.log(`referral_status=new referral -> ${refInfo.count} row(s)`);
    console.log(`  first: ${refInfo.first.slice(0, 140)}`);

    // 9. Clear via GET /patients (default unfiltered)
    console.log('\n=== 9. CLEAR PROBE /patients (default) ===');
    await page.goto(`${BASE_URL}/patients`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    const clearInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr')).filter((tr) => !tr.querySelector('th'));
      return { count: rows.length };
    });
    console.log(`default /patients -> ${clearInfo.count} row(s)`);

    await page.screenshot({ path: 'test-results/artifacts/patient-filter-probe.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/patient-filter-probe.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/patient-filter-probe-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
