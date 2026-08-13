/**
 * Probe the Employees list page: real search values (name/email/mobile),
 * combined search+username behavior, the exact pagination Next-button markup,
 * and total record counts.
 *
 * Run: npx tsx scripts/probe-employee-filter-2.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

async function rowInfo(page: import('playwright').Page): Promise<{ count: number; rows: string[] }> {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'))
      .filter((tr) => !tr.querySelector('th'))
      .filter((tr) => {
        const t = (tr.textContent || '').trim();
        return t.length > 0 && !/no data|no record|no match/i.test(t);
      });
    return {
      count: rows.length,
      rows: rows.slice(0, 4).map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim()),
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

    // 1. Full pagination HTML (Next button markup)
    console.log('\n=== 1. FULL PAGINATION HTML ===');
    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const pag = await page.evaluate(() => {
      const p = document.querySelector('.pagination');
      return p ? p.outerHTML : 'NO PAGINATION';
    });
    console.log(pag);

    // Also dump any "Showing X of Y" info and the last page number
    const totals = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('.card-body, .card-footer, small, .text-muted'))
        .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
        .filter((t) => /showing|of \d+|total|records/i.test(t) && t.length < 200);
      return texts.slice(0, 10);
    });
    console.log('TOTALS TEXT:', JSON.stringify(totals));

    // 2. Direct GET probes of search values
    console.log('\n=== 2. SEARCH VALUE PROBES (direct GET) ===');
    const probes: Array<[string, string]> = [
      ['search=Wajd', `${BASE_URL}/employees?search=Wajd`],
      ['search=Faisal', `${BASE_URL}/employees?search=Faisal`],
      ['search=shawki', `${BASE_URL}/employees?search=shawki`],
      ['search=Mohamed', `${BASE_URL}/employees?search=Mohamed`],
      ['search=hossam', `${BASE_URL}/employees?search=hossam`],
      ['search=waad.albaqami (email-like)', `${BASE_URL}/employees?search=waad.albaqami`],
      ['search=@gmail (email fragment)', `${BASE_URL}/employees?search=%40gmail`],
      ['username_filter=Wajd', `${BASE_URL}/employees?username_filter=Wajd`],
      ['username_filter=zzz_nobody', `${BASE_URL}/employees?username_filter=zzz_nobody`],
      ['search=zzz_nobody', `${BASE_URL}/employees?search=zzz_nobody`],
    ];
    for (const [label, url] of probes) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      const info = await rowInfo(page);
      console.log(`--- ${label}: ${info.count} row(s)`);
      info.rows.forEach((r) => console.log(`    ${r.slice(0, 130)}`));
    }

    // 3. Combined search + username (AND semantics?)
    console.log('\n=== 3. COMBINED FILTERS ===');
    const combined: Array<[string, string]> = [
      ['search=Mohamed&username_filter=hossam', `${BASE_URL}/employees?search=Mohamed&username_filter=hossam`],
      ['search=hossam&username_filter=hossam', `${BASE_URL}/employees?search=hossam&username_filter=hossam`],
    ];
    for (const [label, url] of combined) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      const info = await rowInfo(page);
      console.log(`--- ${label}: ${info.count} row(s)`);
      info.rows.forEach((r) => console.log(`    ${r.slice(0, 130)}`));
    }

    // 4. Typing flow: type into the search box (Livewire live update), verify
    //    the URL + rows change without Enter (mirrors applyFilters behavior)
    console.log('\n=== 4. TYPING FLOW (live update, no Enter) ===');
    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const searchName = page.locator('input[placeholder="Search by name, email, or mobile"]').first();
    await searchName.fill('Wajd');
    await page.waitForTimeout(2000);
    console.log(`URL after fill: ${page.url()}`);
    let info = await rowInfo(page);
    console.log(`rows: ${info.count}`);
    info.rows.forEach((r) => console.log(`    ${r.slice(0, 130)}`));

    // Clear via navigation
    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const searchUser = page.locator('input[placeholder="Search by username"]').first();
    await searchUser.fill('Wajd');
    await page.waitForTimeout(2000);
    console.log(`URL after username fill: ${page.url()}`);
    info = await rowInfo(page);
    console.log(`rows: ${info.count}`);
    info.rows.forEach((r) => console.log(`    ${r.slice(0, 130)}`));

    await page.screenshot({ path: 'test-results/artifacts/employee-filter-probe-2.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/employee-filter-probe-2.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/employee-filter-probe-2-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
