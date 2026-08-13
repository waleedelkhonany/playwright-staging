/**
 * Diagnose why some Vascular Access Assessment fields don't match at fill time.
 * Dumps, for a set of bindings, every DOM node that carries the wire:model
 * attribute (tag, id, type, whether it has the attribute at all, outerHTML
 * snippet) so the POM selectors can be corrected.
 *
 * Run: npx tsx scripts/diagnose-vascular-access.ts [visitId]
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

    // Dump every element carrying any wire:model attribute, plus which binds exist
    const binds = [
      'data.access_type', 'data.avf_site', 'data.avf_date', 'data.access_type_avf',
      'data.b_redness_0', 'data.c_thrill_10', 'data.d_bruit_20', 'data.e_function_clean_0',
      'data.low_continue_assessment', 'data.dressing_applied', 'data.tego_changed',
    ];
    for (const bind of binds) {
      const info = await page.evaluate((b) => {
        const byAttr = Array.from(document.querySelectorAll(`[wire\\:model="${b}"], [wire\\:model\\.defer="${b}"], [wire\\:model\\.live="${b}"]`));
        const byAny = Array.from(document.querySelectorAll('[wire\\:model]')).filter((el) =>
          (el.getAttribute('wire:model') || el.getAttribute('wire:model.defer') || el.getAttribute('wire:model.live')) === b);
        return {
          byAttr: byAttr.map((el) => ({
            tag: el.tagName, id: el.id || '', type: el.getAttribute('type') || '',
            cls: (el.className || '').slice(0, 40),
            html: el.outerHTML.slice(0, 200),
          })),
          byAny: byAny.map((el) => ({
            tag: el.tagName, id: el.id || '', type: el.getAttribute('type') || '',
            html: el.outerHTML.slice(0, 200),
          })),
        };
      }, bind);
      console.log(`\n--- ${bind} ---`);
      console.log('byAttr:', JSON.stringify(info.byAttr, null, 1));
      console.log('byAny:', JSON.stringify(info.byAny, null, 1));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
