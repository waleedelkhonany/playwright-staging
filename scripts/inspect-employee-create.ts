/**
 * Inspect the "Add Employee" creation form on staging.
 *
 * Logs in, navigates to the Employees list page (via the sidebar link, exactly
 * like the tests do), looks for the Add/Create Employee button, opens the form
 * (page, modal, or drawer), and dumps the form-relevant DOM: forms,
 * inputs/selects/textareas (name/id/placeholder/type/data-testid/visible/select2),
 * buttons, the data-testid inventory, and the raw form HTML — so the
 * EmployeesPage locators in src/pages/employees.page.ts and the new
 * tests/employee-create.spec.ts can be aligned to the real staging markup.
 *
 * Run: npx tsx scripts/inspect-employee-create.ts
 * Credentials are loaded from .env (see .env.example).
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';

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

    // 2. Navigate to Employees via the sidebar link (like the tests do)
    console.log('\n=== 2. NAVIGATE TO EMPLOYEES (sidebar link) ===');
    const empLink = page.locator('a').filter({ hasText: /employees?/i }).first();
    const empLinkCount = await empLink.count().catch(() => 0);
    console.log(`employees link found: ${empLinkCount > 0}`);
    await empLink.click().catch((e) => console.log(`click error: ${String(e.message).split('\n')[0]}`));
    await page.waitForTimeout(4000);
    console.log(`Employees URL: ${page.url()}`);

    // 3. Find add/create employee buttons on the list page
    console.log('\n=== 3. ADD/CREATE EMPLOYEE BUTTONS (list page) ===');
    const addButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, input[type="submit"]'))
        .map((b) => ({
          text: (b.textContent?.trim() || b.getAttribute('value') || '').replace(/\s+/g, ' '),
          tag: b.tagName,
          href: b.getAttribute('href') || '',
          cls: (b.className || '').slice(0, 60),
        }))
        .filter((b) => /add|create|new|employee/i.test(b.text))
        .slice(0, 20);
    });
    addButtons.forEach((b) => console.log(`  <${b.tag}> "${b.text}" href="${b.href}" class="${b.cls}"`));

    // 4. Navigate directly to the create-employee page (the "Add New" link
    //    on the list page is a plain <a href="/employees/create">).
    console.log('\n=== 4. OPENING ADD EMPLOYEE FORM ===');
    await page.goto(`${BASE_URL}/employees/create`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);
    console.log(`URL after click: ${page.url()}`);

    // 5. Forms on the page (post-open)
    console.log('\n=== 5. FORMS ===');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f) => ({
        id: f.id || '',
        className: f.className || '',
        action: f.getAttribute('action') || '',
        method: f.getAttribute('method') || '',
        visible: f.offsetParent !== null,
      }));
    });
    forms.forEach((f) => console.log(`  form id="${f.id}" class="${f.className}" action="${f.action}" method="${f.method}" visible=${f.visible}`));

    // 6. Inputs, selects & textareas (name/id/placeholder/testid + select2 flag)
    console.log('\n=== 6. INPUTS / SELECTS / TEXTAREAS ===');
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('input, select, textarea')).map((el) => ({
        tag: el.tagName,
        name: el.getAttribute('name') || '',
        id: el.id || '',
        type: el.getAttribute('type') || '',
        placeholder: el.getAttribute('placeholder') || '',
        testid: el.getAttribute('data-testid') || '',
        visible: el.offsetParent !== null,
        select2: el.classList.contains('select2-hidden-accessible')
          || !!el.parentElement?.querySelector('.select2-container'),
      }));
    });
    fields.forEach((f) => {
      if (f.name || f.id || f.placeholder || f.testid) {
        console.log(
          `  <${f.tag}> name="${f.name}" id="${f.id}" type="${f.type}" ` +
          `ph="${f.placeholder}" testid="${f.testid}" visible=${f.visible} select2=${f.select2}`,
        );
      }
    });

    // 7. Buttons (post-open)
    console.log('\n=== 7. BUTTONS ===');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'))
        .map((b) => (b.textContent?.trim() || b.getAttribute('value') || '').replace(/\s+/g, ' '))
        .filter((t) => t.length > 0)
        .slice(0, 30);
    });
    buttons.forEach((b) => console.log(`  "${b}"`));

    // 8. data-testid inventory
    console.log('\n=== 8. DATA-TESTIDS ===');
    const testids = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid]'))
        .map((el) => el.getAttribute('data-testid'))
        .filter((t, i, a): t is string => !!t && a.indexOf(t) === i);
    });
    testids.forEach((t) => console.log(`  ${t}`));

    // 9. Select2 presence
    const select2Count = await page.locator('.select2-container').count();
    console.log(`\n=== 9. SELECT2 containers on page: ${select2Count} ===`);

    // 10. Raw HTML of the likely employee form (visible form with most fields)
    console.log('\n=== 10. EMPLOYEE FORM HTML ===');
    const formHtml = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).filter((f) => f.offsetParent !== null);
      const form = forms
        .sort((a, b) => b.querySelectorAll('input, select, textarea').length - a.querySelectorAll('input, select, textarea').length)[0];
      return form ? form.outerHTML.slice(0, 40000) : 'NOT FOUND';
    });
    console.log(formHtml);

    await page.screenshot({ path: 'test-results/artifacts/employee-create-structure.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/employee-create-structure.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-employee-create-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
