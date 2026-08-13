/**
 * Inspect the "Labs & Imaging" → Lab Order creation flow on the Patient
 * detail page on staging.
 *
 * Logs in, opens patient (config targetPatientIdentifier), expands the
 * "Physician Orders" sidebar group, opens "Labs & Imaging", then clicks
 * "Create Lab Order" (wire:setOrderType('lab')). Dumps the resulting form:
 * text, buttons/links (with wire attrs), selects + options, inputs,
 * textareas, and the test-row structure after clicking "Add" (wire:addTest).
 *
 * NOTE: page.evaluate callbacks must use FLAT arrow functions only — helper
 * function declarations inside evaluate trigger a tsx/esbuild "__name is not
 * defined" ReferenceError in the browser.
 *
 * Run: npx tsx scripts/inspect-lab-order.ts
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

const TARGET_PATIENT = '121';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    // 1. Login
    console.log('=== 1. LOGGING IN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);
    console.log(`URL after login: ${page.url()}`);

    // 2. Navigate to Patients + open target patient
    console.log('\n=== 2. NAVIGATING TO PATIENTS ===');
    await page.locator('a').filter({ hasText: /patients/i }).first().click();
    await page.waitForTimeout(3000);

    console.log(`\n=== 3. SEARCHING PATIENT ${TARGET_PATIENT} ===`);
    await page.locator('input[name="id"]').first().fill(TARGET_PATIENT);
    await page.locator('input[type="submit"][value="Filter"], input[name="search"][value="Filter"]').first().click();
    await page.waitForTimeout(2500);
    const row = page.locator('table tbody tr').filter({ hasText: TARGET_PATIENT }).first();
    await row.waitFor({ state: 'visible', timeout: 10000 });
    await row.locator('a').first().click();
    await page.waitForTimeout(3000);
    console.log(`Patient detail URL: ${page.url()}`);

    // Dismiss conditional allergies modal
    const allergyModal = page.locator('.modal:has-text("Patient Allergies")').first();
    if (await allergyModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const closeBtn = allergyModal.locator('button:has-text("Close"), .close, .btn-close').first();
      await (await closeBtn.isVisible().catch(() => false) ? closeBtn.click() : page.keyboard.press('Escape'));
      await page.waitForTimeout(1000);
    }

    // 4. Open Physician Orders group
    console.log('\n=== 4. OPENING PHYSICIAN ORDERS GROUP ===');
    await page.locator('a.nav-link:has-text("Physician Orders")').first().click();
    await page.waitForTimeout(1500);

    // 5. Open "Labs & Imaging"
    console.log('\n=== 5. OPENING LABS & IMAGING ===');
    const labsLink = page.locator('a.nav-link:has-text("Labs & Imaging")').first();
    await labsLink.waitFor({ state: 'visible', timeout: 5000 });
    await labsLink.click();
    await page.waitForTimeout(3000);
    console.log(`URL: ${page.url()}`);

    // 6. Dump visible buttons/links with wire attrs (find Create Lab Order / Add / Save)
    console.log('\n=== 6. LABS & IMAGING BUTTONS/LINKS ===');
    const actions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a, button'))
        .filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          wire: el.getAttribute('wire:click') || el.getAttribute('wire:model') || '',
          cls: (el.className || '').toString().slice(0, 50),
        }))
        .filter((a) => /(Lab|Order|Add|Save|Create|Test|Analysis|Imaging|New)/i.test(a.text) || a.wire)
    );
    for (const a of actions) console.log(`  "${a.text}" wire="${a.wire}" class="${a.cls}"`);

    // 7. Click "Create Lab Order" (setOrderType('lab'))
    console.log('\n=== 7. CLICKING CREATE LAB ORDER ===');
    const createLab = page.locator('a:has-text("Create Lab Order")').first();
    if (await createLab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createLab.click();
      await page.waitForTimeout(3000);
      console.log(`URL after click: ${page.url()}`);
    } else {
      console.log('Create Lab Order not visible — clicking Labs & Imaging active pill instead');
    }

    // 8. Section text
    console.log('\n=== 8. LAB ORDER SECTION TEXT ===');
    const sectionText = await page.evaluate(() => {
      const panes = Array.from(document.querySelectorAll(
        '.tab-pane.active, [role="tabpanel"], .card',
      ));
      const target = panes[panes.length - 1];
      return (target ? target.textContent : document.body.textContent) || '';
    });
    console.log(sectionText.trim().replace(/\s+/g, ' ').slice(0, 4000));

    // 9. Buttons after switching to lab order
    console.log('\n=== 9. LAB ORDER FORM BUTTONS ===');
    const actions2 = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a, button'))
        .filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          wire: el.getAttribute('wire:click') || '',
          cls: (el.className || '').toString().slice(0, 50),
        }))
        .filter((a) => /(Add|Save|Test|Remove|X|Analysis|Lab|Order|Print)/i.test(a.text) || a.wire)
    );
    for (const a of actions2) console.log(`  "${a.text}" wire="${a.wire}" class="${a.cls}"`);

    // 10. Dump form elements (selects, inputs, textareas)
    console.log('\n=== 10. FORM ELEMENTS ===');
    const selects = await page.evaluate(() =>
      Array.from(document.querySelectorAll('select'))
        .map((sel, idx) => {
          const r = (sel as HTMLElement).getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          return {
            index: idx,
            name: sel.getAttribute('name') || '',
            id: sel.id || '',
            options: Array.from(sel.options).map((o) => ({
              text: o.textContent?.trim() || '',
              value: o.value,
              selected: o.selected,
            })),
          };
        })
        .filter((s) => s !== null)
    );
    console.log(`--- SELECTS (${selects.length}) ---`);
    for (const sel of selects) {
      console.log(`Select: name="${sel!.name}" id="${sel!.id}"`);
      for (const opt of sel!.options) {
        console.log(`    value="${opt.value}" -> "${opt.text}"${opt.selected ? ' [SELECTED]' : ''}`);
      }
    }

    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input'))
        .map((inp, idx) => {
          const r = (inp as HTMLElement).getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          let label = '';
          if (inp.id) {
            const lab = document.querySelector(`label[for="${inp.id}"]`);
            if (lab) label = (lab.textContent || '').trim();
          }
          return {
            index: idx,
            type: inp.type || 'text',
            name: inp.getAttribute('name') || '',
            id: inp.id || '',
            label,
            placeholder: inp.getAttribute('placeholder') || '',
          };
        })
        .filter((i) => i !== null)
    );
    console.log(`--- INPUTS (${inputs.length}) ---`);
    for (const inp of inputs) {
      console.log(`Input: type="${inp!.type}" name="${inp!.name}" id="${inp!.id}" label="${inp!.label}" placeholder="${inp!.placeholder}"`);
    }

    const textareas = await page.evaluate(() =>
      Array.from(document.querySelectorAll('textarea'))
        .map((ta) => {
          const r = (ta as HTMLElement).getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          return {
            name: ta.getAttribute('name') || '',
            id: ta.id || '',
            placeholder: ta.getAttribute('placeholder') || '',
          };
        })
        .filter((t) => t !== null)
    );
    console.log(`--- TEXTAREAS (${textareas.length}) ---`);
    for (const ta of textareas) console.log(`Textarea: name="${ta!.name}" id="${ta!.id}" placeholder="${ta!.placeholder}"`);

    // 11. Click "Add" (wire:addTest) to add a test row, then dump the row
    console.log('\n=== 11. CLICKING ADD TEST ===');
    const addTestBtn = page.locator('a[wire\\:click*="addTest"], button[wire\\:click*="addTest"]').first();
    const addCount = await addTestBtn.count().catch(() => 0);
    console.log(`Add Test buttons: ${addCount}`);
    if (addCount > 0) {
      await addTestBtn.evaluate((el) => (el as HTMLElement).click());
      await page.waitForTimeout(2500);
      console.log('Clicked Add Test. Re-dumping form elements:');
      const selects2 = await page.evaluate(() =>
        Array.from(document.querySelectorAll('select'))
          .map((sel, idx) => {
            const r = (sel as HTMLElement).getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return null;
            return {
              index: idx,
              name: sel.getAttribute('name') || '',
              id: sel.id || '',
              options: Array.from(sel.options).map((o) => ({
                text: o.textContent?.trim() || '',
                value: o.value,
                selected: o.selected,
              })),
            };
          })
          .filter((s) => s !== null)
      );
      console.log(`--- SELECTS AFTER ADD (${selects2.length}) ---`);
      for (const sel of selects2) {
        console.log(`Select: name="${sel!.name}" id="${sel!.id}"`);
        for (const opt of sel!.options) {
          console.log(`    value="${opt.value}" -> "${opt.text}"${opt.selected ? ' [SELECTED]' : ''}`);
        }
      }
      const inputs2 = await page.evaluate(() =>
        Array.from(document.querySelectorAll('input'))
          .map((inp, idx) => {
            const r = (inp as HTMLElement).getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return null;
            let label = '';
            if (inp.id) {
              const lab = document.querySelector(`label[for="${inp.id}"]`);
              if (lab) label = (lab.textContent || '').trim();
            }
            return {
              index: idx,
              type: inp.type || 'text',
              name: inp.getAttribute('name') || '',
              id: inp.id || '',
              label,
              placeholder: inp.getAttribute('placeholder') || '',
            };
          })
          .filter((i) => i !== null)
      );
      console.log(`--- INPUTS AFTER ADD (${inputs2.length}) ---`);
      for (const inp of inputs2) {
        console.log(`Input: type="${inp!.type}" name="${inp!.name}" id="${inp!.id}" label="${inp!.label}" placeholder="${inp!.placeholder}"`);
      }
      // Dump test-row table HTML
      const rowHtml = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table')).filter((t) => {
          const r = (t as HTMLElement).getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        return tables.map((t, i) => ({
          i,
          html: Array.from(t.querySelectorAll('tbody tr')).slice(-2).map((tr) => tr.outerHTML.slice(0, 900)),
        }));
      });
      for (const t of rowHtml) {
        console.log(`--- Table #${t.i} rows ---`);
        for (const h of t.html) console.log(h);
      }
    } else {
      console.log('No Add Test button found.');
    }

    await page.screenshot({ path: 'test-results/artifacts/lab-order-form.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/lab-order-form.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/lab-order-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
