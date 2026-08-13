/**
 * Open the saved Respiratory Triage record (row id from the index table) in
 * EDIT mode (wire:click="changeDisplay('form',{id})") and dump the pre-filled
 * values of representative fields — proving persistence and how the POM
 * should verify saved values.
 *
 * Run: npx tsx scripts/probe-respiratory-triage-edit.ts [visitId]
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

    const indexUrl = `${BASE_URL}/load/form/${PATIENT_ID}/respiratory-triage?display=index`;
    console.log(`Opening index ${indexUrl}`);
    await page.goto(indexUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(7000);

    // Find the first data row (row index 1+; row 0 is the header)
    const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
    console.log(`table rows: ${rowCount}`);

    // Click the Edit button in the first data row
    const editBtn = page.locator('table tbody tr:nth-child(2) button[title="Edit"], table tbody tr:nth-child(2) a[title="Edit"]').first();
    const editCount = await editBtn.count();
    console.log(`edit button count in row 2: ${editCount}`);
    if (editCount > 0) {
      const wireClick = await editBtn.getAttribute('wire:click').catch(() => '');
      console.log(`Edit wire:click: ${wireClick}`);
      await editBtn.click({ timeout: 10_000 }).catch((e) => console.log('edit click error:', String(e.message).split('\n')[0]));
      await page.waitForTimeout(7000);
      console.log(`URL after edit click: ${page.url()}`);
    }

    // Dump the current display mode + pre-filled values
    const state = await page.evaluate(() => {
      const get = (sel: string) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) return '<missing>';
        const type = (el as HTMLInputElement).type;
        if (type === 'radio') return (el as HTMLInputElement).checked ? String((el as HTMLInputElement).value) : '<unchecked>';
        return (el as HTMLInputElement).value || '<empty>';
      };
      return {
        url: location.href,
        date: get('[wire\\:model="data.date"]'),
        height: get('[wire\\:model="data.height"]'),
        weight: get('[wire\\:model="data.weight"]'),
        temperature: get('[wire\\:model="data.temperature"]'),
        dialysis_yes: get('input[type="radio"][wire\\:model="data.dialysis"]#dialysis_yes'),
        dialysis_no: get('input[type="radio"][wire\\:model="data.dialysis"]#dialysis_no'),
        sob_adult: get('[wire\\:model="data.sob_adult"]'),
        total_score: get('[wire\\:model="data.total_score"]'),
        nurse_name: get('[wire\\:model="data.nurse_name"]'),
        physician_name: get('[wire\\:model="data.physician_name"]'),
        iso: get('input[type="radio"][wire\\:model="data.iso"]:checked'),
        er: get('input[type="radio"][wire\\:model="data.er"]:checked'),
        opd: get('input[type="radio"][wire\\:model="data.opd"]:checked'),
        doctor_name: get('[wire\\:model="data.doctor_name"]'),
      };
    });
    console.log('\n=== EDIT FORM VALUES ===');
    console.log(JSON.stringify(state, null, 2));

    await page.screenshot({ path: 'test-results/artifacts/respiratory-triage-edit.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/respiratory-triage-edit.png');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
