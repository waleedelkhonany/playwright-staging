/**
 * Probe the save behavior of the Respiratory Triage Checklist form on staging.
 *
 * Opens the create form (load/form/{patientId}/respiratory-triage?display=create,
 * reached via "Add New" from the visit-form route), fills representative
 * fields, clicks Save, and dumps:
 *   - URL after save (row_id? redirect? same page?)
 *   - SweetAlert / toast / validation popups
 *   - persisted values read back from the re-render
 *
 * This creates a Respiratory Triage record for the target patient on staging —
 * exactly what tests/respiratory-triage.spec.ts will do.
 *
 * Run: npx tsx scripts/probe-respiratory-triage-save.ts [visitId]
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

    // Open via the visit-form route then follow "Add New"
    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/respiratory-triage`;
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000);
    const addNew = page.locator('a.btn:has-text("Add New"), button:has-text("Add New")').first();
    const href = await addNew.getAttribute('href').catch(() => '');
    console.log(`Add New href: ${href}`);
    await page.goto(new URL(href, BASE_URL).toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(7000);
    console.log(`Create form URL: ${page.url()}`);

    // Fill representative fields via native setters + events
    console.log('\n=== FILL FORM ===');
    type Spec = { bind: string; kind: 'text' | 'radio'; id?: string; value: string };
    const specs: Spec[] = [
      { bind: 'data.date', kind: 'text', value: '2026-08-13' },
      { bind: 'data.height', kind: 'text', value: '170' },
      { bind: 'data.weight', kind: 'text', value: '75' },
      { bind: 'data.temperature', kind: 'text', value: '36.8' },
      { bind: 'data.dialysis', kind: 'radio', id: 'dialysis_yes', value: 'Yes' },
      { bind: 'data.exposure_score', kind: 'text', value: '1' },
      { bind: 'data.fever_ped', kind: 'text', value: '0' },
      { bind: 'data.fever_adult', kind: 'text', value: '0' },
      { bind: 'data.cough_ped', kind: 'text', value: '0' },
      { bind: 'data.cough_adult', kind: 'text', value: '0' },
      { bind: 'data.sob_ped', kind: 'text', value: '0' },
      { bind: 'data.sob_adult', kind: 'text', value: '1' },
      { bind: 'data.headache_ped', kind: 'text', value: '0' },
      { bind: 'data.headache_adult', kind: 'text', value: '0' },
      { bind: 'data.nausea_ped', kind: 'text', value: '0' },
      { bind: 'data.nausea_adult', kind: 'text', value: '0' },
      { bind: 'data.chronic_ped', kind: 'text', value: '0' },
      { bind: 'data.chronic_adult', kind: 'text', value: '0' },
      { bind: 'data.total_score', kind: 'text', value: '2' },
      { bind: 'data.nurse_name', kind: 'text', value: 'Test Nurse' },
      { bind: 'data.nurse_id', kind: 'text', value: '1' },
      { bind: 'data.physician_name', kind: 'text', value: 'Test Physician' },
      { bind: 'data.physician_id', kind: 'text', value: '1' },
      { bind: 'data.iso', kind: 'radio', value: 'yes' },
      { bind: 'data.er', kind: 'radio', value: 'no' },
      { bind: 'data.opd', kind: 'radio', value: 'no' },
      { bind: 'data.doctor_name', kind: 'text', value: 'Test Doctor' },
      { bind: 'data.doctor_id', kind: 'text', value: '1' },
    ];

    let filled = 0;
    let failed = 0;
    for (const spec of specs) {
      const ok = await page.evaluate((s) => {
        const base = `[wire\\:model="${s.bind}"]`;
        const root = document;
        if (s.kind === 'radio') {
          let el: HTMLInputElement | null = null;
          if (s.id) {
            el = root.querySelector<HTMLInputElement>(`input[type="radio"]#${s.id}`);
          } else {
            const radios = Array.from(root.querySelectorAll<HTMLInputElement>(`input[type="radio"]${base}`));
            el = radios.find((r) => r.value.toLowerCase() === s.value.toLowerCase())
              || radios.find((r) => {
                const lbl = r.id ? root.querySelector(`label[for="${r.id}"]`) : null;
                return (lbl?.textContent || '').trim().toLowerCase() === s.value.toLowerCase();
              }) || null;
          }
          if (!el) return false;
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        const el = root.querySelector<HTMLElement>(base);
        if (!el) return false;
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
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

    // Click Save
    console.log('\n=== CLICK SAVE ===');
    const saveBtn = page.locator('button[wire\\:click="save"]').first();
    console.log(`save count: ${await saveBtn.count()}`);
    await saveBtn.click({ timeout: 10_000 }).catch((e) => console.log('click error:', String(e.message).split('\n')[0]));
    await page.waitForTimeout(12000);
    console.log(`URL after save: ${page.url()}`);

    // Dump popups
    console.log('\n=== POPUPS ===');
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

    await page.screenshot({ path: 'test-results/artifacts/respiratory-triage-save-result.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/respiratory-triage-save-result.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/probe-respiratory-triage-save-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
