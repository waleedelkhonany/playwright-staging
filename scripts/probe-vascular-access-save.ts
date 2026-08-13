/**
 * Probe the save behavior of the "Vascular Access Assessment" form on staging.
 *
 * Fills representative fields (access type, site, dates, scoring checkboxes,
 * interventions, dressing/tego radios) of
 * /load/visit-form/{id}/vascular-access-assessment and clicks Save, then dumps:
 *   - URL after save (does it gain ?row_id=? or stay put?)
 *   - SweetAlert / toast / validation popups
 *   - radio values + labels (for the POM radio matching)
 *
 * This creates a vascular-access record for the target visit on staging —
 * exactly what tests/vascular-access.spec.ts will do.
 *
 * Run: npx tsx scripts/probe-vascular-access-save.ts [visitId]
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
    // 1. Login
    console.log('=== 1. LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);
    console.log(`URL after login: ${page.url()}`);

    // 2. Open the form
    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/vascular-access-assessment`;
    console.log(`\n=== 2. OPEN ${url} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000);
    console.log(`URL now: ${page.url()}`);

    // 2b. Dump radio values/labels
    console.log('\n=== 2b. RADIOS ===');
    const radios = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
        .map((r) => ({
          wire: r.getAttribute('wire:model') || '',
          id: r.id || '',
          value: r.value || '',
          label: (r.id ? document.querySelector(`label[for="${r.id}"]`)?.textContent : '')?.trim() || '',
        }));
    });
    radios.forEach((r) => console.log(`  wire="${r.wire}" id="${r.id}" value="${r.value}" label="${r.label}"`));

    // 3. Fill representative fields via native setters + events
    console.log('\n=== 3. FILL FORM ===');
    type Spec = { bind: string; kind: 'checkbox' | 'text' | 'select' | 'radio' | 'number'; id?: string; value: string };
    const specs: Spec[] = [
      { bind: 'data.access_type', kind: 'select', value: 'Arteriovenous Fistula (AVF)' },
      { bind: 'data.avf_site', kind: 'select', value: 'Right Radiocephalic AVF (Wrist)' },
      { bind: 'data.avf_date', kind: 'text', value: '2026-08-13' },
      { bind: 'data.access_type_avf', kind: 'checkbox', id: 'access_type_avf', value: 'AVF' },
      { bind: 'data.b_redness_0', kind: 'checkbox', id: 'b_redness_0', value: '0' },
      { bind: 'data.b_swelling_0', kind: 'checkbox', id: 'b_swelling_0', value: '0' },
      { bind: 'data.c_thrill_10', kind: 'checkbox', id: 'c_thrill_10', value: '10' },
      { bind: 'data.d_bruit_20', kind: 'checkbox', id: 'd_bruit_20', value: '20' },
      { bind: 'data.e_function_clean_0', kind: 'checkbox', id: 'e_function_clean_0', value: '0' },
      { bind: 'data.low_continue_assessment', kind: 'checkbox', id: 'low_continue_assessment', value: 'continue' },
      { bind: 'data.low_dressing_technique', kind: 'checkbox', id: 'low_dressing_technique', value: 'dressing' },
      { bind: 'data.low_educate_access_care', kind: 'checkbox', id: 'low_educate_access_care', value: 'educate' },
      { bind: 'data.dressing_applied', kind: 'radio', id: 'dressingYes', value: 'Yes' },
      { bind: 'data.dressing_change_date', kind: 'text', value: '2026-08-13' },
      { bind: 'data.tego_changed', kind: 'radio', id: 'tegoNo', value: 'No' },
      { bind: 'data.tego_change_date', kind: 'text', value: '2026-08-13' },
    ];

    let filled = 0;
    let failed = 0;
    for (const spec of specs) {
      const ok = await page.evaluate((s) => {
        const base = `[wire\\:model="${s.bind}"]`;
        const root = document;
        if (s.kind === 'checkbox') {
          const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]${base}#${s.id}`);
          if (!el) return false;
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        if (s.kind === 'radio') {
          const el = root.querySelector<HTMLInputElement>(`input[type="radio"]${base}#${s.id}`);
          if (!el) return false;
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        if (s.kind === 'select') {
          const el = root.querySelector<HTMLSelectElement>(base);
          if (!el) return false;
          const match = Array.from(el.options).find((o) => o.textContent?.trim() === s.value)
            || Array.from(el.options).find((o) => o.textContent?.trim().toLowerCase().includes(s.value.toLowerCase()));
          if (!match) return false;
          el.value = match.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        const el = root.querySelector<HTMLElement>(base);
        if (!el) return false;
        const proto = el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, s.value);
        else (el as HTMLInputElement).value = s.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, spec);
      if (ok) { filled++; console.log(`  ✅ ${spec.bind} = "${spec.value.slice(0, 40)}"`); }
      else { failed++; console.log(`  ❌ MISSING ${spec.bind} (id=${spec.id})`); }
      await page.waitForTimeout(80);
    }
    console.log(`\nFilled ${filled}, failed ${failed}`);

    // 4. Click Save
    console.log('\n=== 4. CLICK SAVE ===');
    const saveBtn = page.locator('button[wire\\:click="save"]').first();
    console.log(`save button count: ${await saveBtn.count()}`);
    await saveBtn.click({ timeout: 10_000 }).catch((e) => console.log('click error:', String(e.message).split('\n')[0]));
    await page.waitForTimeout(12000);
    console.log(`URL after save: ${page.url()}`);

    // 5. Dump popups
    console.log('\n=== 5. POPUPS ===');
    const popup = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('.swal2-popup, .toast, .alert, .text-danger, .invalid-feedback, .alert-danger').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          out.push(`"${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 400)}"`);
        }
      });
      return out;
    });
    console.log('POPUPS:', JSON.stringify(popup, null, 2));

    await page.screenshot({ path: 'test-results/artifacts/vascular-access-save-result.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/vascular-access-save-result.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/probe-vascular-access-save-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
