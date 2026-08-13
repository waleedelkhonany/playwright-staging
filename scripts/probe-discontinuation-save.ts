/**
 * Probe the save behavior of the "Discontinue Of Hemodialysis" form on staging.
 *
 * Fills every editable section (EN + AR) of
 * /load/visit-form/{id}/dis-of-hemodialysis and clicks Save, then dumps:
 *   - URL after save (does it gain ?row_id=? or stay put?)
 *   - SweetAlert / toast / validation popups
 *   - which fields persisted (read back current DOM values)
 *
 * This creates a discontinuation record for the target visit on staging —
 * exactly what tests/discontinuation.spec.ts will do.
 *
 * Run: npx tsx scripts/probe-discontinuation-save.ts [visitId]
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
    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/dis-of-hemodialysis`;
    console.log(`\n=== 2. OPEN ${url} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000);
    console.log(`URL now: ${page.url()}`);

    // 3. Fill the form via native setters + events (same pattern as the POM will use)
    console.log('\n=== 3. FILL FORM ===');
    type Spec = { bind: string; kind: 'checkbox' | 'textarea' | 'text' | 'select' | 'datetime'; id?: string; value: string };
    const specs: Spec[] = [
      // --- EN side ---
      { bind: 'data.discontinue_hemodialysis_services_en', kind: 'checkbox', id: 'Discontinuation', value: 'Discontinuation of hemodialysis services' },
      { bind: 'data.examination_refusal_en', kind: 'checkbox', id: 'Refusal', value: 'Refusal to Consent to Examination/Hemodialysis Sessions/Investigations' },
      { bind: 'data.discontinue_reason_en', kind: 'textarea', id: 'Reason', value: 'Patient voluntarily discontinued hemodialysis services.' },
      { bind: 'data.hyperkalemia_en', kind: 'checkbox', id: 'Hyperkalemia', value: 'Hyperkalemia' },
      { bind: 'data.cardiac_en', kind: 'checkbox', id: 'Cardiac', value: 'Cardiac Arrest' },
      { bind: 'data.pulmonary_en', kind: 'checkbox', id: 'Pulmonary', value: 'Pulmonary Edema' },
      { bind: 'data.acidosis_en', kind: 'checkbox', id: 'Acidosis', value: 'Severe Acidosis' },
      { bind: 'data.others_en', kind: 'textarea', id: 'Others', value: 'Other clinical reasons documented.' },
      { bind: 'data.witness_signature_signature_name', kind: 'text', id: 'witnessName', value: 'Witness One' },
      { bind: 'data.witness_relationship_en', kind: 'select', id: 'Relationship', value: 'Spouse' },
      { bind: 'data.witness_datetime_en', kind: 'datetime', value: '2026-08-13T09:30' },
      { bind: 'data.witness_address_en', kind: 'text', id: 'address2', value: 'Riyadh, KSA' },
      { bind: 'data.inability_reason_en', kind: 'textarea', id: 'Patient', value: 'Patient physically unable to sign.' },
      { bind: 'data.relative_signature_signature_name', kind: 'text', id: 'Relative', value: 'Relative One' },
      { bind: 'data.relative_relation_en', kind: 'select', id: 'relativeRelation', value: 'Son' },
      { bind: 'data.relative_datetime_en', kind: 'datetime', value: '2026-08-13T09:35' },
      { bind: 'data.doctor_name_en', kind: 'text', id: 'doctorName', value: 'Test Doctor' },
      { bind: 'data.doctor_datetime_en', kind: 'datetime', value: '2026-08-13T09:40' },
      { bind: 'data.interpreter_signature_signature_name', kind: 'text', id: 'Interpreter', value: 'Interpreter One' },
      { bind: 'data.interpreter_datetime_en', kind: 'datetime', value: '2026-08-13T09:45' },
      // --- AR side ---
      { bind: 'data.discontinue_hemodialysis_services_ar', kind: 'checkbox', id: 'إيقاف', value: 'إيقاف خدمات غسيل الكلى' },
      { bind: 'data.examination_refusal_ar', kind: 'checkbox', id: 'رفض', value: 'رفض الموافقة على الفحص/جلسات غسيل الكلى/التحقيقات' },
      { bind: 'data.discontinue_reason_ar', kind: 'textarea', id: 'سبب', value: 'أوقف المريض خدمات غسيل الكلى طوعا.' },
      { bind: 'data.hyperkalemia_ar', kind: 'checkbox', id: 'الدم', value: 'فرط بوتاسيوم الدم' },
      { bind: 'data.cardiac_ar', kind: 'checkbox', id: 'القلب', value: 'توقف القلب' },
      { bind: 'data.pulmonary_ar', kind: 'checkbox', id: 'رئوية', value: 'وذمة رئوية' },
      { bind: 'data.acidosis_ar', kind: 'checkbox', id: 'حموضة', value: 'حموضة الدم' },
      { bind: 'data.others_ar', kind: 'textarea', id: 'أخرى', value: 'أسباب سريرية أخرى موثقة.' },
      { bind: 'data.witness_signature_ar_signature_name', kind: 'text', id: 'patientName4', value: 'شاهد واحد' },
      { bind: 'data.witness_relationship_ar', kind: 'select', id: 'Relationship4', value: 'زوج/زوجة' },
      { bind: 'data.witness_datetime_ar', kind: 'datetime', value: '2026-08-13T09:30' },
      { bind: 'data.witness_address_ar', kind: 'text', id: 'address2', value: 'الرياض، السعودية' },
      { bind: 'data.inability_reason_ar', kind: 'textarea', id: 'المريض', value: 'المريض غير قادر جسديا على التوقيع.' },
      { bind: 'data.relative_signature_ar_signature_name', kind: 'text', id: 'القريب', value: 'قريب واحد' },
      { bind: 'data.relative_relation_ar', kind: 'select', id: 'relativeRelationAr', value: 'ابن' },
      { bind: 'data.relative_datetime_ar', kind: 'datetime', value: '2026-08-13T09:35' },
      { bind: 'data.doctor_name_ar', kind: 'text', id: 'doctorNameAr', value: 'طبيب الاختبار' },
      { bind: 'data.doctor_datetime_ar', kind: 'datetime', value: '2026-08-13T09:40' },
      { bind: 'data.interpreter_signature_ar_signature_name', kind: 'text', id: 'المترجم', value: 'مترجم واحد' },
      { bind: 'data.interpreter_datetime_ar', kind: 'datetime', value: '2026-08-13T09:45' },
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
        if (s.kind === 'select') {
          const selEl = root.querySelector<HTMLSelectElement>(base);
          if (!selEl) return false;
          const match = Array.from(selEl.options).find((o) => o.textContent?.trim() === s.value)
            || Array.from(selEl.options).find((o) => o.textContent?.trim().toLowerCase().includes(s.value.toLowerCase()));
          if (!match) return false;
          selEl.value = match.value;
          selEl.dispatchEvent(new Event('change', { bubbles: true }));
          selEl.dispatchEvent(new Event('input', { bubbles: true }));
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
    const btnVisible = await saveBtn.count();
    console.log(`save button count: ${btnVisible}`);
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

    // 6. Read back a few persisted values
    console.log('\n=== 6. READBACK ===');
    const readback = await page.evaluate(() => {
      const get = (sel: string) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) return '<missing>';
        if ((el as HTMLInputElement).type === 'checkbox') return String((el as HTMLInputElement).checked);
        if (el.tagName === 'SELECT') return (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() || '<none>';
        return (el as HTMLInputElement).value || '<empty>';
      };
      return {
        reason: get('[wire\\:model="data.discontinue_reason_en"]'),
        reasonAr: get('[wire\\:model="data.discontinue_reason_ar"]'),
        witness: get('[wire\\:model="data.witness_signature_signature_name"]'),
        relationship: get('[wire\\:model="data.witness_relationship_en"]'),
        doctor: get('[wire\\:model="data.doctor_name_en"]'),
        discontinueCb: get('input[type="checkbox"][wire\\:model="data.discontinue_hemodialysis_services_en"]'),
        hyperCb: get('input[type="checkbox"][wire\\:model="data.hyperkalemia_en"]'),
        witnessDt: get('[wire\\:model="data.witness_datetime_en"]'),
      };
    });
    console.log(JSON.stringify(readback, null, 2));

    await page.screenshot({ path: 'test-results/artifacts/discontinuation-save-result.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/discontinuation-save-result.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/probe-discontinuation-save-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
