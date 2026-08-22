/**
 * Probe the Custom Reports SAVE + DELETE lifecycle end-to-end on staging.
 *
 * 1. Login
 * 2. Builder (sessions, custom range) -> Preview (defaults)
 * 3. Dump the Save form details (radio values, placeholders, required attrs)
 * 4. Fill name (unique) + frequency + visibility -> click "Save Report"
 * 5. Verify: redirect target, success toast, row in My Reports table,
 *    extract the new report id from its row form actions
 * 6. Dump one full report-row HTML (to learn the delete/toggle buttons)
 * 7. Delete the created report through the UI (SweetAlert confirm if shown)
 * 8. Verify the row is gone
 *
 * Run: npx tsx scripts/probe-custom-reports-save.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

const REPORT_NAME = `E2E Probe Report ${Date.now()}`;

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

    // 2. Builder -> Preview
    console.log('\n=== 2. BUILDER -> PREVIEW ===');
    await page.goto(`${BASE_URL}/reports/custom-reports/builder?subject=sessions&filters%5BrangeMode%5D=custom&filters%5BdateFrom%5D=2026-08-01&filters%5BdateTo%5D=2026-08-22`, {
      waitUntil: 'domcontentloaded', timeout: 30_000,
    });
    await page.waitForTimeout(4000);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => null),
      page.click('button[type="submit"]:has-text("Preview")'),
    ]);
    await page.waitForTimeout(4000);
    console.log(`URL after preview: ${page.url()}`);

    // 3. Save form details
    console.log('\n=== 3. SAVE FORM DETAILS ===');
    const formDetails = await page.evaluate(`(() => {
      const form = Array.from(document.querySelectorAll('form')).find((f) => (f.getAttribute('action') || '').endsWith('/reports/custom-reports') && f.querySelector('input[name="name"]'));
      if (!form) return null;
      const radios = Array.from(form.querySelectorAll('input[type="radio"]')).map((r) => {
        const lbl = r.id ? document.querySelector('label[for="' + r.id + '"]') : null;
        return { name: r.name, value: r.value, label: (lbl ? lbl.textContent : '').trim(), checked: r.checked };
      });
      const inputInfo = (sel) => {
        const el = form.querySelector(sel);
        if (!el) return null;
        return { placeholder: el.getAttribute('placeholder') || '', required: el.required, value: String(el.value).slice(0, 40) };
      };
      const selects = Array.from(form.querySelectorAll('select')).map((s) => ({
        name: s.name,
        options: Array.from(s.options).map((o) => o.value + ':' + o.textContent.trim()),
      }));
      return {
        action: form.getAttribute('action'),
        method: (form.getAttribute('method') || 'GET').toUpperCase(),
        radios,
        nameInput: inputInfo('input[name="name"]'),
        recipients: inputInfo('input[name="recipients"]'),
        selects,
        submitButtons: Array.from(form.querySelectorAll('[type="submit"]')).map((b) => b.textContent.trim()),
      };
    })()`);
    console.log(JSON.stringify(formDetails, null, 2));
    if (!formDetails) {
      console.log('Save form NOT found — aborting');
      return;
    }

    // 4. Fill + Save
    console.log('\n=== 4. FILL + SAVE REPORT ===');
    console.log(`Report name: ${REPORT_NAME}`);
    await page.fill('form[action*="custom-reports"] input[name="name"]', REPORT_NAME);
    await page.fill('form[action*="custom-reports"] input[name="recipients"]', 'e2e-probe@careconnect.example');
    // frequency: first radio of its group
    const freqName = formDetails.radios.find((r) => r.name.includes('frequency'))?.name ?? 'frequency';
    const visName = formDetails.radios.find((r) => r.name.includes('visibility'))?.name ?? 'visibility';
    const freqFirst = formDetails.radios.find((r) => r.name === freqName);
    const visPrivate = formDetails.radios.find((r) => r.name === visName && /private/i.test(r.value))
      ?? formDetails.radios.find((r) => r.name === visName);
    if (freqFirst) await page.check(`form[action*="custom-reports"] input[name="${freqName}"][value="${freqFirst.value}"]`);
    if (visPrivate) await page.check(`form[action*="custom-reports"] input[name="${visName}"][value="${visPrivate.value}"]`);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => null),
      page.click('button:has-text("Save Report")'),
    ]);
    await page.waitForTimeout(4000);
    console.log(`URL after save: ${page.url()}`);

    // 5. Verify saved: toasts + table rows
    console.log('\n=== 5. VERIFY SAVED ===');
    const verify = await page.evaluate(`(() => {
      const toasts = Array.from(document.querySelectorAll('.alert, .toast-body, [class*="toast"], .swal2-popup'))
        .map((t) => t.textContent.trim().replace(/\\s+/g, ' '))
        .filter(Boolean)
        .slice(0, 10);
      const rows = Array.from(document.querySelectorAll('table tbody tr'))
        .map((tr) => tr.textContent.trim().replace(/\\s+/g, ' ').slice(0, 160));
      const forms = Array.from(document.querySelectorAll('form[action*="custom-reports"]')).map((f) => ({
        action: f.getAttribute('action'),
        method: (f.getAttribute('method') || 'GET').toUpperCase(),
        hiddens: Array.from(f.querySelectorAll('input[type="hidden"]')).map((h) => h.name + '=' + h.value),
        buttons: Array.from(f.querySelectorAll('button')).map((b) => ({ text: b.textContent.trim(), cls: b.className.slice(0, 60), onclick: b.getAttribute('onclick') || '' })),
      }));
      return { url: location.href, toasts, rows, forms: forms.slice(0, 12) };
    })()`);
    console.log(`URL: ${verify.url}`);
    console.log(`Toasts: ${JSON.stringify(verify.toasts)}`);
    const matched = verify.rows.filter((r) => r.includes(REPORT_NAME));
    console.log(`Rows total: ${verify.rows.length}, matching our name: ${matched.length}`);
    matched.forEach((r) => console.log(`  MATCHED ROW: "${r}"`));

    // Extract new report id from a form action /reports/custom-reports/{id}
    let newId = '';
    for (const f of verify.forms) {
      const m = (f.action || '').match(/\/reports\/custom-reports\/(\d+)$/);
      if (m && matched.some((r) => verify.rows.includes(r))) {
        // confirm this form belongs to the matched row by walking up in a second evaluate below
      }
    }
    // Simpler: second evaluate — find the row containing our name, get its form ids
    const rowInfo = await page.evaluate(`((needle) => {
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => r.textContent.includes(needle));
      if (!tr) return null;
      return {
        html: tr.outerHTML.slice(0, 4000),
        formActions: Array.from(tr.querySelectorAll('form')).map((f) => f.getAttribute('action')),
        links: Array.from(tr.querySelectorAll('a')).map((a) => (a.textContent || '').trim() + ' -> ' + a.getAttribute('href')),
      };
    })(${JSON.stringify(REPORT_NAME)})`);
    if (rowInfo) {
      console.log(`\nRow form actions: ${JSON.stringify(rowInfo.formActions)}`);
      console.log(`Row links: ${JSON.stringify(rowInfo.links)}`);
      const idMatch = (rowInfo.formActions.join('|') + rowInfo.links.join('|')).match(/custom-reports\/(\d+)/);
      newId = idMatch ? idMatch[1] : '';
      console.log(`New report id: ${newId}`);
      fs.writeFileSync(path.resolve(__dirname, '..', 'test-results', 'probe-report-row.html'), rowInfo.html);
      console.log('Row HTML saved: test-results/probe-report-row.html');
    }

    // 6. Delete via the UI
    if (newId) {
      console.log('\n=== 6. DELETE THE CREATED REPORT ===');
      const delBtn = page.locator(`table tbody tr:has-text("${REPORT_NAME}")`).locator('button, a').filter({ hasText: /delete|trash/i });
      const delByTitle = page.locator(`table tbody tr:has-text("${REPORT_NAME}")`).locator('[title*="elete" i], [class*="trash" i]');
      const btn = (await delBtn.count()) ? delBtn.first() : delByTitle.first();
      console.log(`Delete button found: ${(await btn.count()) > 0}`);
      await btn.click();
      await page.waitForTimeout(2000);
      // SweetAlert confirm
      const swalBtn = page.locator('.swal2-popup button:has-text("Yes, Delete It!")');
      if (await swalBtn.count()) {
        console.log('SweetAlert confirm found — clicking');
        await swalBtn.click();
        await page.waitForTimeout(4000);
      }
      const gone = await page.evaluate(`((needle) => !Array.from(document.querySelectorAll('table tbody tr')).some((r) => r.textContent.includes(needle)))(${JSON.stringify(REPORT_NAME)})`);
      console.log(`Report deleted (row gone): ${gone}`);
      const delToasts = await page.evaluate(`(() => Array.from(document.querySelectorAll('.alert, .toast-body, .swal2-popup')).map((t) => t.textContent.trim()).filter(Boolean).slice(0, 5))()`);
      console.log(`Post-delete toasts: ${JSON.stringify(delToasts)}`);
    }

    // Final screenshot
    const shotPath = path.resolve(__dirname, '..', 'test-results', 'probe-custom-reports-save.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`\nScreenshot saved: ${shotPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
