/**
 * Isolate why the TEGO radio (data.tego_changed) does not persist on the
 * Vascular Access Assessment form:
 *   1. Open the form, dump the full TEGO radio DOM (outerHTML, ids, wire attrs)
 *   2. Check the current checked state of dressing/tego radios
 *   3. Set ONLY the tegoNo radio via the same native-setter approach the POM
 *      uses, save, and read back the persisted state
 *
 * Run: npx tsx scripts/probe-vascular-tego.ts [visitId]
 */
import '../src/helpers/load-env';
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

    // 1. Dump the full outerHTML of the tego radios + their labels/container
    console.log('\n=== TEGO RADIO DOM ===');
    const tego = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        const wire = r.getAttribute('wire:model.live') || r.getAttribute('wire:model') || '';
        if (wire.includes('tego') || wire.includes('dressing')) {
          out.push(`id="${r.id}" checked=${r.checked} value="${r.value}" wire.live="${r.getAttribute('wire:model.live') || ''}" wire:change="${r.getAttribute('wire:change') || ''}" data-target="${r.getAttribute('data-target') || ''}" outer=${r.outerHTML.slice(0, 350)}`);
        }
      });
      return out;
    });
    tego.forEach((t) => console.log('  ' + t));

    // Also dump the container HTML of the TEGO section
    const tegoSection = await page.evaluate(() => {
      const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      const tegoRadio = radios.find((r) => (r.getAttribute('wire:model.live') || '') === 'data.tego_changed');
      if (!tegoRadio) return '<no tego radio>';
      let node = tegoRadio.closest('.form-check, .row, .col, .card, .section, fieldset');
      return node ? node.outerHTML.slice(0, 1200) : tegoRadio.outerHTML;
    });
    console.log('\n=== TEGO SECTION HTML ===');
    console.log(tegoSection);

    // 2. Current checked states
    console.log('\n=== CURRENT CHECKED STATE ===');
    const states = await page.evaluate(() => {
      const out: Record<string, string> = {};
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        const wire = r.getAttribute('wire:model.live') || r.getAttribute('wire:model') || '';
        if (wire.includes('tego') || wire.includes('dressing')) out[`${wire}::${r.id}`] = String(r.checked);
      });
      return out;
    });
    console.log(JSON.stringify(states, null, 2));

    // 3. Set ONLY tegoNo (native setter approach) — then dump state again
    console.log('\n=== SET tegoNo ===');
    const setOk = await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>('input[type="radio"]#tegoNo');
      if (!el) return false;
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    console.log('set tegoNo ok:', setOk);
    await page.waitForTimeout(2000);
    const afterSet = await page.evaluate(() => {
      const out: Record<string, string> = {};
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        const wire = r.getAttribute('wire:model.live') || r.getAttribute('wire:model') || '';
        if (wire.includes('tego') || wire.includes('dressing')) out[`${wire}::${r.id}`] = String(r.checked);
      });
      return out;
    });
    console.log('after set:', JSON.stringify(afterSet, null, 2));

    // 4. Save and read back
    console.log('\n=== SAVE ===');
    const saveBtn = page.locator('button[wire\\:click="save"]').first();
    console.log(`save count: ${await saveBtn.count()}`);
    await saveBtn.click({ timeout: 10_000 }).catch((e) => console.log('click error:', String(e.message).split('\n')[0]));
    await page.waitForTimeout(12000);
    console.log(`URL after save: ${page.url()}`);

    const afterSave = await page.evaluate(() => {
      const out: Record<string, string> = {};
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        const wire = r.getAttribute('wire:model.live') || r.getAttribute('wire:model') || '';
        if (wire.includes('tego') || wire.includes('dressing')) out[`${wire}::${r.id}`] = String(r.checked);
      });
      return out;
    });
    console.log('after save:', JSON.stringify(afterSave, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
