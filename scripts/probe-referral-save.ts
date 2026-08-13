/**
 * Probe the Referral form save behavior on staging.
 *
 * 1. Login
 * 2. Navigate straight to /load/visit-form/{visitId}/referrals
 * 3. Fill representative fields (date, type, hospital, print checkboxes,
 *    reason, completion date, comments)
 * 4. Click Save (wire:click="save")
 * 5. Dump the URL after save (does it gain ?row_id={id}?) and any
 *    SweetAlert2 popup text (success / validation)
 * 6. Dump the readback state of a few fields after the save re-render
 *
 * Run: npx tsx scripts/probe-referral-save.ts [visitId]
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

async function setField(
  page: import('playwright').Page,
  selector: string,
  value: string,
  kind: 'text' | 'select' | 'checkbox' | 'textarea',
): Promise<boolean> {
  return page.evaluate(({ sel, v, k }) => {
    const root = document;

    if (k === 'checkbox') {
      const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]${sel}`);
      if (!el) return false;
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    if (k === 'select') {
      const el = root.querySelector<HTMLSelectElement>(sel);
      if (!el) return false;
      const match = Array.from(el.options).find((o) => o.textContent?.trim() === v)
        || Array.from(el.options).find((o) => o.textContent?.trim().toLowerCase().includes(v.toLowerCase()));
      if (!match) return false;
      el.value = match.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    const el = root.querySelector<HTMLElement>(sel);
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, v);
    else (el as HTMLInputElement).value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { sel: selector, v: value, k: kind });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    // 1. Login
    console.log('=== 1. LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);
    console.log(`URL after login: ${page.url()}`);

    // 2. Navigate to the referral form
    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/referrals`;
    console.log(`\n=== 2. OPEN ${url} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(5000);
    console.log(`URL: ${page.url()}`);

    // 3. Fill representative fields
    console.log('\n=== 3. FILL FIELDS ===');
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const fills: Array<{ label: string; sel: string; v: string; kind: 'text' | 'select' | 'checkbox' | 'textarea' }> = [
      { label: 'referral_date', sel: '#referral_date', v: today, kind: 'text' },
      { label: 'referral_type', sel: '#referral_type', v: 'Elective', kind: 'select' },
      { label: 'referral_hospital_id', sel: '#referral_hospital_id', v: 'Dr. Soliman Fakeeh Hospital', kind: 'select' },
      { label: 'print_monthly_medical_report', sel: '#print_monthly_medical_report', v: '1', kind: 'checkbox' },
      { label: 'print_lab_result', sel: '#print_lab_result', v: '1', kind: 'checkbox' },
      { label: 'referral_reason', sel: '#referral_reason', v: 'Probe referral reason for E2E test', kind: 'textarea' },
      { label: 'completion_date', sel: '#completion_date', v: today, kind: 'text' },
      { label: 'Comments', sel: '#Comments', v: 'Probe comments for E2E test', kind: 'textarea' },
    ];
    for (const f of fills) {
      const ok = await setField(page, f.sel, f.v, f.kind);
      console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${f.label} = "${f.v}"`);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(1500);

    // 4. Click Save
    console.log('\n=== 4. CLICK SAVE ===');
    const saveBtn = page.locator('button[wire\\:click="save"]').first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();
    await page.waitForTimeout(6000);
    console.log(`URL after save: ${page.url()}`);

    // 5. SweetAlert?
    console.log('\n=== 5. SWEETALERT ===');
    const swal = await page.evaluate(() => {
      const el = document.querySelector('.swal2-popup');
      if (!el) return null;
      return (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300);
    }).catch(() => null);
    console.log(swal ? `swal: ${swal}` : 'no SweetAlert visible');

    // 6. Readback after save re-render
    console.log('\n=== 6. READBACK ===');
    await page.waitForTimeout(2000);
    const reads = await page.evaluate(() => {
      const out: Record<string, string> = {};
      const sels = ['#referral_date', '#referral_type', '#referral_hospital_id', '#print_monthly_medical_report', '#print_lab_result', '#referral_reason', '#completion_date', '#Comments'];
      for (const sel of sels) {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) { out[sel] = '<missing>'; continue; }
        if (el.tagName === 'SELECT') { out[sel] = (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? ''; continue; }
        if ((el as HTMLInputElement).type === 'checkbox') { out[sel] = (el as HTMLInputElement).checked ? 'checked' : 'unchecked'; continue; }
        out[sel] = (el as HTMLInputElement).value || '';
      }
      return out;
    });
    Object.entries(reads).forEach(([k, v]) => console.log(`  ${k} = "${v}"`));

    await page.screenshot({ path: 'test-results/artifacts/referral-save-probe.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/referral-save-probe.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/probe-referral-save-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
