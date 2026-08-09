/**
 * Probe how the Employees list page search inputs behave on staging:
 * client-side (DataTables) filtering vs GET navigation vs AJAX, plus the
 * pagination structure and empty-result state.
 *
 * Run: npx tsx scripts/probe-employee-filter.ts
 */
import 'dotenv/config';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

async function rowInfo(page: import('playwright').Page): Promise<{ count: number; first: string; last: string }> {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'))
      .filter((tr) => !tr.querySelector('th'))
      .filter((tr) => {
        const t = (tr.textContent || '').trim();
        return t.length > 0 && !/no data|no record|no match/i.test(t);
      });
    return {
      count: rows.length,
      first: rows[0] ? (rows[0].textContent || '').replace(/\s+/g, ' ').trim() : '',
      last: rows[rows.length - 1] ? (rows[rows.length - 1].textContent || '').replace(/\s+/g, ' ').trim() : '',
    };
  });
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

    console.log('\n=== 1. UNFILTERED /employees ===');
    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    const base = await rowInfo(page);
    console.log(`URL: ${page.url()}`);
    console.log(`rows: ${base.count}, first: ${base.first.slice(0, 100)}, last: ${base.last.slice(0, 100)}`);

    // Pagination structure (DataTables vs Laravel)
    const pagInfo = await page.evaluate(() => {
      const dataTablesPag = document.querySelector('.dataTables_paginate');
      const pag = document.querySelector('.pagination, ul.pagination');
      const info = document.querySelector('.dataTables_info');
      const length = document.querySelector('.dataTables_length');
      return {
        url: location.href,
        dataTableClass: !!document.querySelector('table.dataTable'),
        dataTablesPaginate: dataTablesPag ? dataTablesPag.outerHTML.slice(0, 1200) : 'NONE',
        laravelPagination: pag ? pag.outerHTML.slice(0, 1200) : 'NONE',
        dataTablesInfo: info ? (info.textContent || '').trim().slice(0, 200) : 'NONE',
        dataTablesLength: length ? (length.textContent || '').trim().slice(0, 200) : 'NONE',
      };
    });
    console.log(`dataTable class: ${pagInfo.dataTableClass}`);
    console.log(`dataTables_info: ${pagInfo.dataTablesInfo}`);
    console.log(`dataTables_length: ${pagInfo.dataTablesLength}`);
    console.log(`dataTables_paginate: ${pagInfo.dataTablesPaginate}`);
    console.log(`laravel pagination: ${pagInfo.laravelPagination}`);

    // Full HTML of the search container (how are the inputs wired?)
    console.log('\n=== 2. SEARCH CONTAINER HTML ===');
    const searchHtml = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[placeholder*="Search"]'));
      const out: string[] = [];
      for (const inp of inputs) {
        let p = inp.closest('form');
        let container = inp.parentElement;
        let depth = 0;
        while (container && depth < 4) {
          const label = container.querySelector('label');
          out.push(
            `placeholder="${inp.getAttribute('placeholder')}" inForm=${!!p} ` +
            `containerTag=${container.tagName} containerClass="${(container.className || '').toString().slice(0, 80)}" label="${label ? (label.textContent || '').trim() : ''}"`,
          );
          container = container.parentElement;
          depth += 1;
        }
      }
      return { inputs, out };
    });
    searchHtml.out.forEach((o) => console.log(`  ${o}`));

    // 3. Type into "Search by name, email, or mobile" — does it navigate (GET)?
    console.log('\n=== 3. SEARCH BY NAME/EMAIL/MOBILE = "Mohamed" ===');
    const searchName = page.locator('input[placeholder="Search by name, email, or mobile"]').first();
    await searchName.fill('Mohamed');
    await page.waitForTimeout(1500);
    console.log(`URL after typing: ${page.url()}`);
    let info = await rowInfo(page);
    console.log(`rows: ${info.count}, first: ${info.first.slice(0, 120)}`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    console.log(`URL after Enter: ${page.url()}`);
    info = await rowInfo(page);
    console.log(`rows after Enter: ${info.count}, first: ${info.first.slice(0, 120)}`);

    // 4. Clear and try "Search by username" = "hossam"
    console.log('\n=== 4. SEARCH BY USERNAME = "hossam" ===');
    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const searchUser = page.locator('input[placeholder="Search by username"]').first();
    await searchUser.fill('hossam');
    await page.waitForTimeout(1500);
    console.log(`URL after typing: ${page.url()}`);
    info = await rowInfo(page);
    console.log(`rows: ${info.count}, first: ${info.first.slice(0, 120)}`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    console.log(`URL after Enter: ${page.url()}`);
    info = await rowInfo(page);
    console.log(`rows after Enter: ${info.count}, first: ${info.first.slice(0, 120)}`);

    // 5. Empty state — search a non-existent value
    console.log('\n=== 5. EMPTY STATE — search "zzz_nobody" ===');
    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    await searchName.fill('zzz_nobody');
    await page.waitForTimeout(1500);
    info = await rowInfo(page);
    console.log(`rows: ${info.count}`);
    const emptyHtml = await page.evaluate(() => {
      const tbody = document.querySelector('table tbody');
      return tbody ? tbody.innerHTML.slice(0, 1500) : 'NO TBODY';
    });
    console.log(`TBODY HTML: ${emptyHtml}`);

    await page.screenshot({ path: 'test-results/artifacts/employee-filter-probe.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/employee-filter-probe.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/employee-filter-probe-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
