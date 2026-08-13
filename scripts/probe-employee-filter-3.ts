/**
 * Verify candidate combined employee filter combos and the Livewire
 * pagination Next click on staging.
 *
 * Run: npx tsx scripts/probe-employee-filter-3.ts
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

    const probes: Array<[string, string]> = [
      ['search=@gmail&username_filter=hossam', `${BASE_URL}/employees?search=%40gmail&username_filter=hossam`],
      ['search=Wajd&username_filter=Wajd', `${BASE_URL}/employees?search=Wajd&username_filter=Wajd`],
      ['search=Faisal&username_filter=hossam', `${BASE_URL}/employees?search=Faisal&username_filter=hossam`],
      ['username_filter=hossam', `${BASE_URL}/employees?username_filter=hossam`],
    ];
    for (const [label, url] of probes) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      const info = await rowInfo(page);
      console.log(`--- ${label}: ${info.count} row(s)`);
      info.rows.forEach((r) => console.log(`    ${r.slice(0, 130)}`));
    }

    // Verify the Livewire Next-button click advances to page 2
    console.log('\n=== NEXT CLICK (Livewire) ===');
    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const nextBtn = page.locator('.pagination button[wire\\:click*="nextPage"]').first();
    const nextCount = await nextBtn.count().catch(() => 0);
    console.log(`next button count: ${nextCount}`);
    const before = await rowInfo(page);
    console.log(`page 1 first row: ${before.rows[0]?.slice(0, 100) ?? ''}`);
    if (nextCount > 0) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      const after = await rowInfo(page);
      console.log(`after next click rows: ${after.count}, first: ${after.rows[0]?.slice(0, 100) ?? ''}`);
      console.log(`URL: ${page.url()}`);
    }

    await page.screenshot({ path: 'test-results/artifacts/employee-filter-probe-3.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/employee-filter-probe-3.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/employee-filter-probe-3-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
