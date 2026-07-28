/**
 * Investigate the patient detail page and appointment form fields.
 * Uses sidebar navigation (like the test does), not direct URL.
 * Run: npx tsx scripts/extract-form-fields.ts
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://staging.careconnectksa.com';
const USERNAME = 'Riyada-support';
const PASSWORD = 'Password12345$';

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    // 1. Login
    console.log('1. Logging in...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!page.url().includes('login')) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await page.waitForTimeout(1000);
    await page.fill('input[name="username"], input[name="email"], input[id="username"], input[id="email"]', USERNAME);
    await page.fill('input[name="password"], input[id="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(4000);
    console.log('   URL:', page.url());

    // 2. Navigate to Patients via sidebar (like the test does)
    console.log('2. Navigating to Patients via sidebar...');
    await page.locator('a').filter({ hasText: /patients/i }).first().click();
    await page.waitForTimeout(3000);
    console.log('   URL:', page.url());

    // 3. Dump the table to find actual patient IDs
    console.log('\n3. Table contents (first 5 rows):');
    const tableData = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return Array.from(rows).slice(0, 5).map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(c => c.textContent?.trim() || '');
      });
    });
    for (const row of tableData) {
      console.log(`   PatientID: ${row[0] || '?'} | Name: ${row[1] || '?'} | MRN: ${row[4] || '?'}`);
    }

    // 4. Click the first patient's name link
    console.log('\n4. Clicking first patient...');
    const firstPatientLink = page.locator('table tbody tr td a').first();
    const firstHref = await firstPatientLink.getAttribute('href').catch(() => 'unknown');
    const firstText = await firstPatientLink.textContent().catch(() => 'unknown');
    console.log(`   First link: text="${firstText?.trim()}" href="${firstHref}"`);
    
    await firstPatientLink.click();
    await page.waitForTimeout(3000);
    console.log('   Patient detail URL:', page.url());

    // 5. Check for Create Appointment button
    console.log('\n5. Looking for Create Appointment button...');
    const createBtn = page.locator('.create_appointment_btn, button:has-text("Create Appointment")').first();
    console.log('   Visible:', await createBtn.isVisible().catch(() => false));
    
    // 6. Dismiss any modal and click
    const allergiesModal = page.locator('#allergiesModal, .modal:has-text("Allergy")').first();
    if (await allergiesModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Dismissing allergies modal...');
      const closeBtn = allergiesModal.locator('button:has-text("Close"), .close, .btn-close').first();
      await (await closeBtn.isVisible().catch(() => false) ? closeBtn.click() : page.keyboard.press('Escape'));
      await page.waitForTimeout(1000);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click Create Appointment
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      console.log('   Clicked Create Appointment!');
      await page.waitForTimeout(3000);
    } else {
      console.log('   Button not visible, trying evaluate...');
      await page.evaluate(() => {
        const btn = document.querySelector('.create_appointment_btn') as HTMLElement;
        if (btn) btn.click();
      });
      await page.waitForTimeout(3000);
    }

    // 7. After clicking, check for visible modals and form fields
    console.log('\n7. Looking for visible modals/dialogs...');
    const modals = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.modal, .modal-dialog, [role="dialog"]'))
        .filter(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden' && m.getAttribute('aria-hidden') !== 'true';
        })
        .map(m => ({
          id: m.id,
          class: m.className?.slice(0, 80),
          text: m.textContent?.trim().slice(0, 300),
        }));
    });
    console.log(`   Found ${modals.length} visible modals`);
    for (const m of modals) {
      console.log(`   id="${m.id}" class="${m.class}"`);
      console.log(`   text: "${m.text}"`);
    }

    // 8. Dump ALL visible form elements (inputs, textareas, selects)
    console.log('\n8. Visible form elements:');
    const visibleElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('input, textarea, select');
      const visible: any[] = [];
      allElements.forEach(el => {
        if (el.offsetParent !== null || (el as HTMLElement).offsetWidth > 0) {
          visible.push({
            tag: el.tagName,
            type: (el as HTMLInputElement).type || '',
            name: el.getAttribute('name') || '',
            id: el.id || '',
            placeholder: el.getAttribute('placeholder') || '',
            class: el.className?.slice(0, 60),
          });
        }
      });
      return visible;
    });
    console.log(`   Found ${visibleElements.length} visible form elements`);
    for (const el of visibleElements) {
      console.log(`   ${el.tag} type="${el.type}" name="${el.name}" id="${el.id}" placeholder="${el.placeholder}"`);
    }

    // Screenshot
    await page.screenshot({ path: 'test-results/artifacts/form-fields.png', fullPage: true });
    console.log('\nScreenshot saved');

  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
