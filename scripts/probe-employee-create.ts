/**
 * Final confirmation probe — create an employee with UNIQUE values and verify
 * the full happy path: Create enables → click → SweetAlert "Employee Created
 * Successfully!" → redirect to /employees/{id}/edit.
 *
 * NOTE: no named helpers inside page.evaluate (tsx __name serialization bug).
 *
 * Run: npx tsx scripts/probe-employee-create.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

const randomSuffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    const livewireResponses: string[] = [];
    const consoleMsgs: string[] = [];
    page.on('console', (msg) => {
      if (/beforeSave|save|Livewire|employee-created/i.test(msg.text())) consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => consoleMsgs.push(`[pageerror] ${err.message}`));
    page.on('response', async (res) => {
      if (res.url().includes('livewire/update')) {
        let body = '';
        try { body = await res.text(); } catch { /* ignore */ }
        const errMatch = body.match(/\"errors\":\{([^}]*)\}/);
        const dispMatch = body.match(/\"dispatches\":\[([^\]]*)\]/);
        livewireResponses.push(`status=${res.status()} errors=${errMatch ? '{' + errMatch[1].slice(0, 300) + '}' : 'none'} dispatches=${dispMatch ? '[' + dispMatch[1].slice(0, 300) + ']' : 'none'} len=${body.length}`);
      }
    });

    console.log('=== 1. LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    console.log('\n=== 2. OPEN /employees/create ===');
    await page.goto(`${BASE_URL}/employees/create`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // =======================================================================
    // 3. FILL ALL REQUIRED FIELDS
    // =======================================================================
    console.log('\n=== 3. FILL ===');
    const name = `E2E Probe ${randomSuffix.slice(0, 6)}`;

    await page.locator('input[wire\\:model\\.live="name"]').fill(name);
    await page.locator('select[wire\\:model\\.live="title_id"]').selectOption({ label: 'Nurse' });
    await page.waitForTimeout(1500); // license section reveals on title change
    await page.locator('select[wire\\:model\\.live="gender"]').selectOption({ label: 'Male' });
    await page.locator('select[wire\\:model\\.live="nationality_id"]').selectOption({ label: 'Saudi Arabian' });
    await page.evaluate(() => {
      const r = document.querySelector(
        'input[wire\\:model\\.live="id_type"][value="national_id"]',
      ) as HTMLInputElement | null;
      if (r) {
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
        r.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.locator('input[wire\\:model\\.live="national_id"]').fill(`10${randomSuffix}`);
    await page.locator('input[wire\\:model\\.live="expiration_date"]').fill('2030-01-01');
    await page.locator('input[wire\\:model\\.live="date_of_birth"]').fill('1990-05-15');
    await page.locator('select[wire\\:model\\.live="religion_id"]').selectOption({ label: 'Islam' });
    await page.locator('select[wire\\:model\\.live="language_id"]').selectOption({ label: 'English' });

    // License section (visible now that Title=Nurse)
    await page.locator('#scfhs_license_number').fill(`SCFHS-${randomSuffix}`);
    await page.locator('#scfhs_license_expiry_date').fill('2030-12-31');
    await page.locator('#nphies_provider_id').fill(`NP-${randomSuffix}`);

    await page.waitForTimeout(3000);
    console.log(`Filled with name "${name}"`);

    // =======================================================================
    // 4. WAIT FOR CREATE ENABLED, CLICK
    // =======================================================================
    console.log('\n=== 4. CLICK CREATE ===');
    const enabled = await page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => (b.textContent || '').trim().replace(/\s+/g, ' ') === 'Create',
        );
        return btn ? !btn.hasAttribute('disabled') : false;
      },
      { timeout: 25_000 },
    ).then(() => true).catch(() => false);
    console.log(`Create enabled: ${enabled}`);

    await page.locator('button:has-text("Create")').first().click();

    // 5. Observe post-save: SweetAlert then redirect
    console.log('\n=== 5. POST-SAVE ===');
    await page.waitForTimeout(2500);
    const swal = await page.evaluate(() => {
      const popup = document.querySelector('.swal2-popup');
      return popup ? (popup.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200) : 'NO SWAL';
    });
    console.log(`SweetAlert: "${swal}"`);

    await page.waitForTimeout(6000);
    console.log(`URL after redirect: ${page.url()}`);

    console.log('\n=== 6. LIVEWIRE RESPONSES ===');
    livewireResponses.forEach((r) => console.log(r));
    console.log('\n=== 7. CONSOLE MSGS ===');
    consoleMsgs.slice(0, 40).forEach((m) => console.log(m));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
