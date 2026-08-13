/**
 * Investigate the patient creation form structure on staging.
 * Logs in, opens the Create Patient form, and dumps ALL selects with their
 * options, all inputs, radios, and textareas.
 *
 * Run: npx tsx scripts/investigate-patient-form.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!USERNAME || !PASSWORD) {
  throw new Error('Set APP_USERNAME and APP_PASSWORD in .env');
}

async function main() {
  const browser = await chromium.launch({ headless: false }); // headed so you can watch
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    // 1. Login
    console.log('=== 1. LOGGING IN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);
    console.log(`URL after login: ${page.url()}`);

    // 2. Navigate to Patients
    console.log('\n=== 2. NAVIGATING TO PATIENTS ===');
    const patientsLink = page.locator('a').filter({ hasText: /patients/i }).first();
    await patientsLink.click();
    await page.waitForTimeout(3000);
    console.log(`Patients URL: ${page.url()}`);

    // 3. Click Create Patient / Add New
    console.log('\n=== 3. OPENING CREATE PATIENT FORM ===');
    const addBtn = page.locator(
      'button:has-text("Create Patient"), a:has-text("Create Patient"), ' +
      'button:has-text("Add New"), a:has-text("Add New")'
    ).first();
    const addBtnVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Add button visible: ${addBtnVisible}`);
    if (addBtnVisible) {
      await addBtn.click();
      await page.waitForTimeout(3000);
    }

    // 4. DUMP ALL FORM ELEMENTS
    console.log('\n=== 4. FORM ELEMENTS ===');

    const formData = await page.evaluate(() => {
      const result: any = {
        selects: [],
        inputs: [],
        textareas: [],
        radios: [],
      };

      // --- SELECTS ---
      const selects = document.querySelectorAll('select');
      selects.forEach((sel, idx) => {
        const options = Array.from(sel.options).map(o => ({
          text: o.textContent?.trim() || '',
          value: o.value,
          selected: o.selected,
        }));
        result.selects.push({
          index: idx,
          name: sel.getAttribute('name') || '',
          id: sel.id || '',
          options,
        });
      });

      // --- INPUTS (visible) ---
      const inputs = document.querySelectorAll('input');
      inputs.forEach((inp, idx) => {
        if ((inp as HTMLElement).offsetParent !== null || inp.type === 'hidden') {
          const entry: any = {
            index: idx,
            type: inp.type || 'text',
            name: inp.getAttribute('name') || '',
            id: inp.id || '',
            placeholder: inp.getAttribute('placeholder') || '',
            value: inp.value || '',
          };
          if (inp.type === 'radio') {
            result.radios.push(entry);
          } else {
            result.inputs.push(entry);
          }
        }
      });

      // --- TEXTAREAS (visible) ---
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((ta, idx) => {
        if ((ta as HTMLElement).offsetParent !== null) {
          result.textareas.push({
            index: idx,
            name: ta.getAttribute('name') || '',
            id: ta.id || '',
            placeholder: ta.getAttribute('placeholder') || '',
          });
        }
      });

      return result;
    });

    // Print selects with their options
    console.log(`\n--- SELECTS (${formData.selects.length} total) ---`);
    for (const sel of formData.selects) {
      console.log(`\nSelect #${sel.index}: name="${sel.name}" id="${sel.id}"`);
      console.log(`  Options (${sel.options.length}):`);
      for (const opt of sel.options) {
        const marker = opt.selected ? ' [SELECTED]' : '';
        console.log(`    value="${opt.value}" -> "${opt.text}"${marker}`);
      }
    }

    // Print visible inputs (non-radio)
    console.log(`\n--- VISIBLE INPUTS (${formData.inputs.length}) ---`);
    for (const inp of formData.inputs) {
      console.log(`  Input #${inp.index}: type="${inp.type}" name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" value="${inp.value}"`);
    }

    // Print textareas
    console.log(`\n--- TEXTAREAS (${formData.textareas.length}) ---`);
    for (const ta of formData.textareas) {
      console.log(`  Textarea #${ta.index}: name="${ta.name}" id="${ta.id}" placeholder="${ta.placeholder}"`);
    }

    // Print radios
    console.log(`\n--- RADIOS (${formData.radios.length}) ---`);
    for (const ra of formData.radios) {
      console.log(`  Radio #${ra.index}: name="${ra.name}" id="${ra.id}" value="${ra.value}" placeholder="${ra.placeholder}"`);
    }

    // Screenshot
    await page.screenshot({ path: 'test-results/artifacts/patient-form-structure.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/patient-form-structure.png');

  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/investigate-error.png' }).catch(() => {});
  } finally {
    // Keep browser open for 10 seconds so you can see it, then close
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

main();
