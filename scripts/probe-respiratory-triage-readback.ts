/**
 * Read back the persisted Respiratory Triage values from the edit form
 * (?display=form&row_id={id}) using Node-side Playwright locators (avoids the
 * tsx/esbuild `__name` transform issue inside page.evaluate).
 *
 * Run: npx tsx scripts/probe-respiratory-triage-readback.ts [visitId]
 */
import 'dotenv/config';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'config', 'config.json'), 'utf-8'),
);
const VISIT_ID = process.argv[2] ?? config.patientAssessment?.visitId ?? '1005';
const PATIENT_ID = config.appointment?.targetPatientIdentifier ?? '222';

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
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    // Index → find latest row id → open edit form
    const indexUrl = `${BASE_URL}/load/form/${PATIENT_ID}/respiratory-triage?display=index`;
    console.log(`Opening index ${indexUrl}`);
    await page.goto(indexUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(7000);

    const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
    console.log(`table rows: ${rowCount}`);
    if (rowCount < 2) { console.log('No data rows — aborting.'); return; }

    const editBtn = page.locator('table tbody tr:nth-child(2) button[title="Edit"], table tbody tr:nth-child(2) a[title="Edit"]').first();
    await editBtn.click({ timeout: 10_000 }).catch((e) => console.log('edit click error:', String(e.message).split('\n')[0]));
    await page.waitForTimeout(7000);
    console.log(`Edit form URL: ${page.url()}`);

    // Read back via locators
    const read = async (sel: string): Promise<string> => {
      const loc = page.locator(sel).first();
      if ((await loc.count()) === 0) return '<missing>';
      const type = await loc.evaluate((el) => (el as HTMLInputElement).type).catch(() => '');
      if (type === 'radio') {
        const checked = await loc.evaluate((el) => (el as HTMLInputElement).checked);
        if (!checked) return '<unchecked>';
        return await loc.evaluate((el) => (el as HTMLInputElement).value || '');
      }
      return await loc.inputValue().catch(() => '<empty>');
    };

    console.log('\n=== READBACK ===');
    const checks: Array<[string, string]> = [
      ['[wire\\:model="data.date"]', 'date'],
      ['[wire\\:model="data.height"]', 'height'],
      ['[wire\\:model="data.weight"]', 'weight'],
      ['[wire\\:model="data.temperature"]', 'temperature'],
      ['input[type="radio"][wire\\:model="data.dialysis"]#dialysis_yes', 'dialysis yes'],
      ['input[type="radio"][wire\\:model="data.dialysis"]#dialysis_no', 'dialysis no'],
      ['[wire\\:model="data.exposure_score"]', 'exposure score'],
      ['[wire\\:model="data.sob_adult"]', 'sob adult'],
      ['[wire\\:model="data.total_score"]', 'total score'],
      ['[wire\\:model="data.nurse_name"]', 'nurse name'],
      ['[wire\\:model="data.physician_name"]', 'physician name'],
      ['[wire\\:model="data.doctor_name"]', 'doctor name'],
      ['input[type="radio"][wire\\:model="data.iso"][value="yes"]', 'iso radio'],
      ['input[type="radio"][wire\\:model="data.er"][value="yes"]', 'er yes'],
      ['input[type="radio"][wire\\:model="data.er"][value="no"]', 'er no'],
      ['input[type="radio"][wire\\:model="data.opd"][value="no"]', 'opd no'],
    ];
    for (const [sel, label] of checks) {
      const value = await read(sel);
      console.log(`  ${label}: "${value}"`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
