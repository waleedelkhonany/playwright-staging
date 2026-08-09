/**
 * Verify the remaining Patients list page filters (mobile, email,
 * national_id) and candidate no-results values on staging.
 *
 * Run: npx tsx scripts/probe-patient-filter-2.ts
 */
import 'dotenv/config';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

async function countRows(page: import('playwright').Page): Promise<{ count: number; rows: string[] }> {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'))
      .filter((tr) => !tr.querySelector('th'))
      .filter((tr) => !(tr.textContent || '').includes('No Data Available'));
    return {
      count: rows.length,
      rows: rows.slice(0, 3).map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim()),
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
      ['mobile=502050400', `${BASE_URL}/patients?mobile=502050400`],
      ['email=Riyada_Patient_Test@gmail.com', `${BASE_URL}/patients?email=Riyada_Patient_Test%40gmail.com`],
      ['national_id=5065858595', `${BASE_URL}/patients?national_id=5065858595`],
      ['id=121&status=active (combined)', `${BASE_URL}/patients?id=121&status=active`],
      ['name=Riyada&status=active&referral_status=new referral', `${BASE_URL}/patients?name=Riyada&status=active&referral_status=new+referral`],
      ['status=deceased (candidate no-results)', `${BASE_URL}/patients?status=deceased`],
      ['referral_status=rejected referral', `${BASE_URL}/patients?referral_status=rejected+referral`],
      ['referral_status=refusal of treatment', `${BASE_URL}/patients?referral_status=refusal+of+treatment`],
      ['national_id=999999999999 (no-results)', `${BASE_URL}/patients?national_id=999999999999`],
      ['mobile=0000000000 (no-results)', `${BASE_URL}/patients?mobile=0000000000`],
      ['email=nobody@example.com (no-results)', `${BASE_URL}/patients?email=nobody%40example.com`],
    ];

    for (const [label, url] of probes) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2500);
      const info = await countRows(page);
      console.log(`--- ${label}: ${info.count} row(s)`);
      info.rows.forEach((r) => console.log(`    ${r.slice(0, 160)}`));
    }

    await page.screenshot({ path: 'test-results/artifacts/patient-filter-probe-2.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/patient-filter-probe-2.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/patient-filter-probe-2-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
