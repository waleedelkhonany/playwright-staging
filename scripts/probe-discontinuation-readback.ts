/**
 * Read back the persisted values of the "Discontinue Of Hemodialysis" form
 * (after scripts/probe-discontinuation-save.ts saved a record) using
 * Node-side Playwright locators (avoids the tsx/esbuild `__name` transform
 * issue inside page.evaluate).
 *
 * Run: npx tsx scripts/probe-discontinuation-readback.ts [visitId]
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
const VISIT_ID = process.argv[2] ?? config.visitId ?? '1005';

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

    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/dis-of-hemodialysis`;
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000);
    console.log(`URL now: ${page.url()}`);

    const read = async (sel: string): Promise<string> => {
      const loc = page.locator(sel).first();
      if ((await loc.count()) === 0) return '<missing>';
      const tag = await loc.evaluate((el) => el.tagName);
      if (tag === 'SELECT') {
        return (await loc.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() || '<none>'));
      }
      const type = await loc.evaluate((el) => (el as HTMLInputElement).type).catch(() => '');
      if (type === 'checkbox') return String(await loc.isChecked().catch(() => false));
      return await loc.inputValue().catch(() => '<empty>');
    };

    const checks: Array<[string, string]> = [
      ['[wire\\:model="data.discontinue_reason_en"]', 'reason (EN)'],
      ['[wire\\:model="data.discontinue_reason_ar"]', 'reason (AR)'],
      ['[wire\\:model="data.witness_signature_signature_name"]', 'witness name'],
      ['[wire\\:model="data.witness_relationship_en"]', 'witness relationship'],
      ['[wire\\:model="data.doctor_name_en"]', 'doctor name'],
      ['[wire\\:model="data.inability_reason_en"]', 'inability reason'],
      ['[wire\\:model="data.interpreter_signature_signature_name"]', 'interpreter name'],
      ['input[type="checkbox"][wire\\:model="data.discontinue_hemodialysis_services_en"]', 'discontinue checkbox'],
      ['input[type="checkbox"][wire\\:model="data.hyperkalemia_en"]', 'hyperkalemia checkbox'],
      ['input[type="checkbox"][wire\\:model="data.cardiac_en"]', 'cardiac checkbox'],
      ['[wire\\:model="data.witness_datetime_en"]', 'witness datetime'],
      ['[wire\\:model="data.doctor_datetime_en"]', 'doctor datetime'],
      ['[wire\\:model="data.relative_signature_signature_name"]', 'relative name'],
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
