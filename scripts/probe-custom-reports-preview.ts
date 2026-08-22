/**
 * Probe the Custom Reports PREVIEW flow end-to-end on staging.
 *
 * 1. Login
 * 2. Open /reports/custom-reports/builder?subject=sessions (weekly default)
 * 3. Read the current form state (checked fields, filter values)
 * 4. Set the date range via the visible inputs, check 2 extra fields
 * 5. Click "Preview Report"
 * 6. Dump the preview page: URL, forms (Save form?), tables (headers/rows),
 *    buttons, and take a screenshot
 *
 * Run: npx tsx scripts/probe-custom-reports-preview.ts
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

    // 2. Open builder with subject=sessions in CUSTOM range mode (dates editable)
    console.log('\n=== 2. OPEN BUILDER (subject=sessions, custom range) ===');
    await page.goto(`${BASE_URL}/reports/custom-reports/builder?subject=sessions&filters%5BrangeMode%5D=custom&filters%5BdateFrom%5D=2026-08-01&filters%5BdateTo%5D=2026-08-22`, {
      waitUntil: 'domcontentloaded', timeout: 30_000,
    });
    await page.waitForTimeout(4000);
    console.log(`URL: ${page.url()}`);

    // 3. Read current form state (string expression avoids tsx __name issue)
    console.log('\n=== 3. CURRENT FORM STATE ===');
    const state = await page.evaluate(`(() => {
      const checked = Array.from(document.querySelectorAll('input[name="fields[]"]:checked')).map((el) => el.id);
      const pick = (sel) => { const el = document.querySelector(sel); return el ? el.value : ''; };
      const previewBtn = Array.from(document.querySelectorAll('button[type="submit"]'))
        .map((b) => b.textContent.trim())
        .filter((t) => /preview/i.test(t));
      return {
        checked,
        dateFrom: pick('input[name="filters[dateFrom]"]'),
        dateTo: pick('input[name="filters[dateTo]"]'),
        previewBtn,
      };
    })()`);
    console.log(`Checked fields (${state.checked.length}): ${JSON.stringify(state.checked)}`);
    console.log(`dateFrom="${state.dateFrom}" dateTo="${state.dateTo}"`);
    console.log(`Preview button: ${JSON.stringify(state.previewBtn)}`);

    // 4. Interact: check 2 extra fields + set filters via real UI events
    console.log('\n=== 4. INTERACT WITH THE FORM ===');
    await page.check('#field-patient-info-mrn');
    await page.check('#field-treatment-data-ufVolume');
    await page.fill('input[name="filters[dateFrom]"]', '2026-08-01');
    await page.fill('input[name="filters[dateTo]"]', '2026-08-22');
    await page.selectOption('select[name="filters[system]"]', { label: 'In Center' });
    const afterState = await page.evaluate(`(() => ({
      checked: Array.from(document.querySelectorAll('input[name="fields[]"]:checked')).map((el) => el.id),
      btn: (Array.from(document.querySelectorAll('button[type="submit"]'))
        .map((b) => b.textContent.trim())
        .filter((t) => /preview/i.test(t))[0]) || '',
    }))()`);
    console.log(`Checked now (${afterState.checked.length}): ${JSON.stringify(afterState.checked)}`);
    console.log(`Preview button label now: "${afterState.btn}"`);

    // 5. Submit → Preview
    console.log('\n=== 5. SUBMIT (Preview Report) ===');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => null),
      page.click('button[type="submit"]:has-text("Preview")'),
    ]);
    await page.waitForTimeout(5000);
    console.log(`URL after preview: ${page.url()}`);

    // 6. Dump the preview page
    console.log('\n=== 6. PREVIEW PAGE DUMP ===');
    const dump = await page.evaluate(`(() => {
      const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
        i,
        action: f.getAttribute('action') || '',
        method: (f.getAttribute('method') || 'GET').toUpperCase(),
        fields: Array.from(f.querySelectorAll('input, select, textarea'))
          .filter((el) => el.type !== 'hidden')
          .map((el) => (el.name || el.id) + '(' + (el.type || el.tagName) + ')'),
        hidden: Array.from(f.querySelectorAll('input[type="hidden"]')).map((h) => h.name + '=' + String(h.value).slice(0, 40)),
      }));
      const buttons = Array.from(document.querySelectorAll('button, a.btn, input[type="submit"]'))
        .map((b) => ({ text: b.textContent.trim().replace(/\s+/g, ' ').slice(0, 50), href: b.getAttribute('href') || '', type: b.getAttribute('type') || '' }))
        .filter((b) => b.text && !/logout/i.test(b.text))
        .slice(0, 25);
      const tables = Array.from(document.querySelectorAll('table')).map((t, i) => ({
        i,
        headers: Array.from(t.querySelectorAll('thead th')).map((th) => th.textContent.trim()),
        rowCount: t.querySelectorAll('tbody tr').length,
        firstRows: Array.from(t.querySelectorAll('tbody tr')).slice(0, 3).map((tr) => tr.textContent.trim().replace(/\s+/g, ' ').slice(0, 200)),
      }));
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
        .map((h) => h.textContent.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .slice(0, 15);
      return { forms, buttons, tables, headings };
    })()`);

    console.log('\n-- HEADINGS --');
    dump.headings.forEach((h) => console.log(`  "${h}"`));
    console.log('\n-- FORMS --');
    dump.forms.forEach((f) => {
      console.log(`  form#${f.i} method=${f.method} action="${f.action}"`);
      console.log(`    visible fields: ${JSON.stringify(f.fields)}`);
      console.log(`    hidden: ${JSON.stringify(f.hidden)}`);
    });
    console.log('\n-- BUTTONS --');
    dump.buttons.forEach((b) => console.log(`  "${b.text}" type=${b.type} href="${b.href}"`));
    console.log('\n-- TABLES --');
    if (!dump.tables.length) console.log('  (none)');
    dump.tables.forEach((t) => {
      console.log(`  table#${t.i} rows=${t.rowCount}`);
      console.log(`    headers: ${JSON.stringify(t.headers)}`);
      t.firstRows.forEach((r) => console.log(`    row: "${r}"`));
    });

    // Screenshot
    const shotPath = path.resolve(__dirname, '..', 'test-results', 'probe-custom-reports-preview.png');
    fs.mkdirSync(path.dirname(shotPath), { recursive: true });
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
