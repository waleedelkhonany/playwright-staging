/**
 * Read back the persisted values of the "Vascular Access Assessment" form
 * (after scripts/probe-vascular-access-save.ts saved a record) using
 * Node-side Playwright locators (avoids the tsx/esbuild `__name` transform
 * issue inside page.evaluate). Also dumps the checkbox/radio labels so the
 * scenario JSON can use exact label texts for verification.
 *
 * Run: npx tsx scripts/probe-vascular-access-readback.ts [visitId]
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

    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/vascular-access-assessment`;
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000);
    console.log(`URL now: ${page.url()}`);

    // Dump labels of the checkbox/radio ids we plan to fill
    const ids = [
      'access_type_avf', 'b_redness_0', 'b_swelling_0', 'b_discharge_0', 'b_hematoma_0',
      'c_thrill_10', 'c_temp_0', 'c_tenderness_0', 'd_bruit_20', 'e_function_clean_0',
      'low_continue_assessment', 'low_dressing_technique', 'low_educate_access_care',
      'dressingYes', 'dressingNo', 'tegoYes', 'tegoNo',
    ];
    console.log('\n=== LABELS ===');
    for (const id of ids) {
      const info = await page.locator(`#${id}`).first().evaluate((el) => {
        const input = el as HTMLInputElement;
        const lbl = input.id ? document.querySelector(`label[for="${input.id}"]`) : null;
        return {
          id: input.id || '',
          type: input.type || '',
          value: input.value || '',
          checked: input.checked,
          wireLive: input.getAttribute('wire:model.live') || '',
          wire: input.getAttribute('wire:model') || '',
          label: (lbl?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
        };
      }).catch(() => null);
      if (info) {
        console.log(`  #${id} type=${info.type} value="${info.value}" checked=${info.checked} live="${info.wireLive}" wire="${info.wire}" label="${info.label}"`);
      } else {
        console.log(`  #${id} <missing>`);
      }
    }

    // Read back the saved values via locators
    const read = async (sel: string): Promise<string> => {
      const loc = page.locator(sel).first();
      if ((await loc.count()) === 0) return '<missing>';
      const tag = await loc.evaluate((el) => el.tagName);
      if (tag === 'SELECT') {
        return (await loc.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() || '<none>'));
      }
      const type = await loc.evaluate((el) => (el as HTMLInputElement).type).catch(() => '');
      if (type === 'checkbox' || type === 'radio') return String(await loc.isChecked().catch(() => false));
      return await loc.inputValue().catch(() => '<empty>');
    };

    console.log('\n=== READBACK ===');
    const checks: Array<[string, string]> = [
      ['#access_type', 'access type select'],
      ['#avf_site', 'avf site select'],
      ['#access_type_avf', 'access_type_avf checkbox'],
      ['#b_redness_0', 'b_redness_0 checkbox'],
      ['#c_thrill_10', 'c_thrill_10 checkbox'],
      ['#d_bruit_20', 'd_bruit_20 checkbox'],
      ['#e_function_clean_0', 'e_function_clean_0 checkbox'],
      ['#low_continue_assessment', 'low_continue_assessment checkbox'],
      ['#low_dressing_technique', 'low_dressing_technique checkbox'],
      ['#low_educate_access_care', 'low_educate_access_care checkbox'],
      ['#dressingYes', 'dressingApplied radio (Yes)'],
      ['#dressingNo', 'dressingApplied radio (No)'],
      ['[wire\\:model="data.dressing_change_date"]', 'dressing change date'],
      ['#tegoYes', 'tegoChanged radio (Yes)'],
      ['#tegoNo', 'tegoChanged radio (No)'],
      ['[wire\\:model="data.tego_change_date"]', 'tego change date'],
      ['[wire\\:model="data.avf_date"]', 'avf date'],
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
