/**
 * End-to-end smoke + data probe for the Visit Filter component on staging.
 *
 * Walks the exact same interaction path as VisitFilterPage.applyFilters()
 * (current TC-01: patient name + status + last-30-days date range):
 *   open modal → select "Custom Range" date preset → fill patient_name,
 *   status (Select2 via helper), date_from/date_to → submit → dump the
 *   resulting URL + table rows.
 *
 * Also dumps the serialized form values BEFORE submit (so you can see which
 * field did/didn't take), the real Select2 option values, and probes each
 * suite-relevant value via direct GET URLs to isolate which values return
 * data in staging. Use this to re-verify data alignment when staging seed
 * data changes.
 *
 * Run: npx tsx scripts/debug-visit-filter-tc01.ts
 */
import 'dotenv/config';
import { chromium } from 'playwright';
import { selectFromSelect2ByLocator } from '../src/helpers/select2.helper';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().split('T')[0];
}

/** Data rows only (exclude header row with <th> and the empty-state row). */
async function dumpRows(page: import('playwright').Page, label: string): Promise<void> {
  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr'))
      .filter((tr) => !tr.querySelector('th'))
      .map((tr) => (tr.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 0 && !t.includes('No Data Available'));
  });
  console.log(`--- ${label}: ${rows.length} row(s)`);
  rows.slice(0, 12).forEach((r) => console.log(`    ${r.slice(0, 160)}`));
}

/** Dump every named field's value inside the filter modal. */
async function dumpModalForm(page: import('playwright').Page): Promise<void> {
  const vals = await page.evaluate(() => {
    const form = document.querySelector('#filterModal form, form.modal-body');
    if (!form) return [{ note: 'NO FILTER FORM FOUND' }];
    const out: Array<Record<string, string>> = [];
    form.querySelectorAll('input, select').forEach((el) => {
      const e = el as HTMLInputElement | HTMLSelectElement;
      const name = e.getAttribute('name') || e.id || '(unnamed)';
      if (name) {
        let value = '';
        if (e.tagName === 'SELECT') value = e.value;
        else value = (e as HTMLInputElement).value;
        const visible = el.offsetParent !== null;
        out.push({ name, value, visible: String(visible) });
      }
    });
    return out;
  });
  console.log('  MODAL FORM FIELDS:');
  vals.forEach((v) => console.log(`    ${JSON.stringify(v)}`));
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

    // 2. Visits page + baseline
    await page.goto(`${BASE_URL}/visits`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);
    console.log(`\n=== 2. /visits URL: ${page.url()}`);
    await dumpRows(page, 'BASELINE (unfiltered)');

    // 3. Open the filter modal
    console.log('\n=== 3. OPEN MODAL ===');
    const toggle = page.locator('button:has-text("Visits Filter"), [data-bs-target="#filterModal"]').first();
    await toggle.waitFor({ state: 'visible', timeout: 10_000 });
    await toggle.click();
    await page.waitForTimeout(1000);
    const modalVisible = await page.locator('#filterModal').isVisible().catch(() => false);
    console.log(`modal visible: ${modalVisible}`);
    await dumpModalForm(page);

    // 4. Select2: date preset = Custom Range (reveals date_from/date_to)
    console.log('\n=== 4. DATE PRESET = Custom Range ===');
    const datePreset = page.locator('select[name="date_preset"]').first();
    await selectFromSelect2ByLocator(page, datePreset, 'Custom Range');
    await page.waitForTimeout(800);
    const dateFieldsVisible = await page.evaluate(() => {
      const f = document.querySelector('input[name="date_from"]') as HTMLElement | null;
      const t = document.querySelector('input[name="date_to"]') as HTMLElement | null;
      return { from: !!f && f.offsetParent !== null, to: !!t && t.offsetParent !== null };
    });
    console.log(`date_from/date_to visible: ${JSON.stringify(dateFieldsVisible)}`);

    // 5. Fill the text field(s)
    console.log('\n=== 5. FILL patient_name ===');
    await page.locator('input[name="patient_name"]').first().fill('Riyada');
    console.log('filled patient_name=Riyada');

    // 6. Select2: status = "In Progress"
    console.log('\n=== 6. STATUS = "In Progress" (Select2 helper) ===');
    const status = page.locator('select[name="status"]').first();
    await selectFromSelect2ByLocator(page, status, 'In Progress');
    await page.waitForTimeout(500);
    const statusVal = await status.evaluate((el) => (el as HTMLSelectElement).value);
    console.log(`status select value after helper: "${statusVal}"`);

    // 7. Fill date range (30 days ago → today)
    console.log('\n=== 7. FILL date_from / date_to ===');
    await page.locator('input[name="date_from"]').first().fill(daysAgo(30));
    await page.locator('input[name="date_to"]').first().fill(daysAgo(0));
    console.log(`filled date_from=${daysAgo(30)} date_to=${daysAgo(0)}`);

    // 8. Dump the full form state BEFORE submit
    console.log('\n=== 8. FORM STATE BEFORE SUBMIT ===');
    await dumpModalForm(page);

    // 9. Submit
    console.log('\n=== 9. SUBMIT (Filters button) ===');
    await page.locator('#filterModal button[type="submit"], #filterModal button:has-text("Filters")').first().click();
    await page.waitForTimeout(4000);
    console.log(`URL after submit: ${page.url()}`);
    await dumpRows(page, 'AFTER SUBMIT (combined TC-01)');

    // 10. Dump the option values of the four Select2 filter fields, and
    //     extract the values of the specific options we want to probe
    console.log('\n=== 10. SELECT2 OPTION VALUES (value | text) ===');
    const optsInfo = await page.evaluate(() => {
      const form = document.querySelector('#filterModal form, form.modal-body');
      if (!form) return { dump: {}, wanted: {} };
      const wantedTexts: Record<string, string[]> = {
        visit_type_id: ['Initial Visit'],
        insurance_company_id: ['Self Pay'],
        date_preset: ['This Month', 'Custom Range'],
        status: ['in progress'],
      };
      const dump: Record<string, string[]> = {};
      const wanted: Record<string, string> = {};
      form.querySelectorAll('select').forEach((sel) => {
        const s = sel as HTMLSelectElement;
        const name = s.getAttribute('name') || '(unnamed)';
        dump[name] = Array.from(s.options).map((o) => `${o.value} | ${o.textContent?.trim() || ''}`);
        const targets = wantedTexts[name] || [];
        for (const t of targets) {
          const opt = Array.from(s.options).find((o) => o.textContent?.trim().toLowerCase() === t.toLowerCase());
          if (opt && !wanted[t]) wanted[t] = opt.value;
        }
      });
      return { dump, wanted };
    });
    Object.entries(optsInfo.dump).forEach(([name, list]) => {
      console.log(`  ${name}:`);
      list.forEach((o) => console.log(`    ${o}`));
    });
    console.log('  WANTED OPTION VALUES:', JSON.stringify(optsInfo.wanted));

    // 11. Individual-field GET probes (isolate which value returns data)
    console.log('\n=== 11. INDIVIDUAL FIELD PROBES (direct GET) ===');
    const probes: Array<[string, string]> = [
      // Baseline semantics: the plain page is restricted; status=all is the
      // TRUE full list (this is why reset cases capture their baseline after
      // an explicit Clear).
      ['full list (status=all)', `${BASE_URL}/visits?status=all`],
      ['patient_name=Riyada', `${BASE_URL}/visits?patient_name=Riyada`],
      ['doctor_name=Test', `${BASE_URL}/visits?doctor_name=Test`],
      ['nurse_name=Test Nurse', `${BASE_URL}/visits?nurse_name=Test+Nurse`],
      ['patient_mrn=121', `${BASE_URL}/visits?patient_mrn=121`],
      ['status=in progress', `${BASE_URL}/visits?status=in+progress`],
      ['status=co_sign (no-results)', `${BASE_URL}/visits?status=co_sign`],
      ['insurance=MetLife (no-results)', `${BASE_URL}/visits?insurance_company_id=12`],
      ['reversed range (no-results)', `${BASE_URL}/visits?date_from=${daysAgo(-1)}&date_to=${daysAgo(1)}`],
      [`Riyada + 30d range (TC-01)`, `${BASE_URL}/visits?patient_name=Riyada&date_from=${daysAgo(30)}&date_to=${daysAgo(0)}`],
    ];
    for (const [label, url] of probes) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2500);
      await dumpRows(page, `PROBE: ${label}`);
    }

    await page.screenshot({ path: 'test-results/artifacts/debug-visit-filter-tc01.png', fullPage: true });
    console.log('\nScreenshot: test-results/artifacts/debug-visit-filter-tc01.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/debug-visit-filter-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
