/**
 * Reproduce the EXACT fill sequence used by tests/vascular-access.spec.ts
 * (FIELD_MAP order) and dump the dressing/tego radio state after EVERY fill,
 * to pinpoint which step resets the tegoNo radio.
 *
 * Run: npx tsx scripts/probe-vascular-sequence.ts [visitId]
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

type Step = { label: string; kind: 'checkbox' | 'radio' | 'select' | 'text'; wire?: string; id?: string; value: string };

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

    const dumpState = async (label: string) => {
      const st = await page.evaluate(() => {
        const out: Record<string, string> = {};
        document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
          const wire = r.getAttribute('wire:model.live') || r.getAttribute('wire:model') || '';
          if (wire.includes('tego') || wire.includes('dressing')) out[`${wire}::${r.id}`] = String(r.checked);
        });
        return out;
      });
      console.log(`  [${label}] ${JSON.stringify(st)}`);
    };

    const setField = async (step: Step) => {
      const ok = await page.evaluate((s) => {
        const root = document;
        if (s.kind === 'checkbox') {
          const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]#${s.id}`);
          if (!el) return false;
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        if (s.kind === 'radio') {
          const el = root.querySelector<HTMLInputElement>(`input[type="radio"]#${s.id}`);
          if (!el) return false;
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        if (s.kind === 'select') {
          const el = root.querySelector<HTMLSelectElement>(`[wire\\:model="${s.wire}"], [wire\\:model\\.live="${s.wire}"]`);
          if (!el) return false;
          const match = Array.from(el.options).find((o) => o.textContent?.trim() === s.value)
            || Array.from(el.options).find((o) => o.textContent?.trim().toLowerCase().includes(s.value.toLowerCase()));
          if (!match) return false;
          el.value = match.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        const el = root.querySelector<HTMLElement>(`[wire\\:model="${s.wire}"], [wire\\:model\\.live="${s.wire}"]`);
        if (!el) return false;
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, s.value);
        else (el as HTMLInputElement).value = s.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, step);
      console.log(`${ok ? '✅' : '❌'} ${step.label}`);
      await page.waitForTimeout(150);
      await dumpState(step.label);
    };

    console.log('\n=== INITIAL STATE ===');
    await dumpState('initial');

    const steps: Step[] = [
      { label: 'accessType', kind: 'select', wire: 'data.access_type', value: 'Arteriovenous Fistula (AVF)' },
      { label: 'avfSite', kind: 'select', wire: 'data.avf_site', value: 'Right Radiocephalic AVF (Wrist)' },
      { label: 'avfDate', kind: 'text', wire: 'data.avf_date', value: '2026-08-13' },
      { label: 'accessTypeAvf', kind: 'checkbox', id: 'access_type_avf' },
      { label: 'bRedness', kind: 'checkbox', id: 'b_redness_0' },
      { label: 'bSwelling', kind: 'checkbox', id: 'b_swelling_0' },
      { label: 'cThrill', kind: 'checkbox', id: 'c_thrill_10' },
      { label: 'cTemp', kind: 'checkbox', id: 'c_temp_0' },
      { label: 'cTenderness', kind: 'checkbox', id: 'c_tenderness_0' },
      { label: 'dBruit', kind: 'checkbox', id: 'd_bruit_20' },
      { label: 'eFunction', kind: 'checkbox', id: 'e_function_clean_0' },
      { label: 'dressingApplied', kind: 'radio', id: 'dressingYes', value: 'Yes' },
      { label: 'dressingChangeDate', kind: 'text', wire: 'data.dressing_change_date', value: '2026-08-13' },
      { label: 'tegoChanged', kind: 'radio', id: 'tegoNo', value: 'No' },
      { label: 'tegoChangeDate', kind: 'text', wire: 'data.tego_change_date', value: '2026-08-13' },
      { label: 'lowContinueAssessment', kind: 'checkbox', id: 'low_continue_assessment' },
      { label: 'lowDressingTechnique', kind: 'checkbox', id: 'low_dressing_technique' },
      { label: 'lowEducateAccessCare', kind: 'checkbox', id: 'low_educate_access_care' },
    ];

    for (const step of steps) {
      await setField(step);
    }

    console.log('\n=== SAVE ===');
    const saveBtn = page.locator('button[wire\\:click="save"]').first();
    await saveBtn.click({ timeout: 10_000 }).catch((e) => console.log('click error:', String(e.message).split('\n')[0]));
    await page.waitForTimeout(12000);
    console.log(`URL after save: ${page.url()}`);
    await dumpState('after-save');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
