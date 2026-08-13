/**
 * Diagnose patient creation form validation error.
 * Logs in, opens Create Patient, fills form with buildPatient() data,
 * then captures all field values before save to identify the culprit.
 *
 * Run: npx tsx scripts/diagnose-patient-save.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';
import { buildPatient } from '../src/data/patient.data';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!USERNAME || !PASSWORD) throw new Error('Set APP_USERNAME and APP_PASSWORD in .env');

async function setSelectByOptionText(page: any, tag: string, index: number, optionText: string | undefined | null) {
  if (!optionText) return;
  const result = await page.evaluate(({ sel, idx, text }: any) => {
    const allSelects = document.querySelectorAll(sel);
    const select = allSelects[idx] as HTMLSelectElement;
    if (!select) return `Select #${idx} not found`;
    const options = Array.from(select.options);
    let match = options.find((o: HTMLOptionElement) => o.textContent?.trim() === text);
    if (!match) match = options.find((o: HTMLOptionElement) => o.value === text);
    if (!match) match = options.find((o: HTMLOptionElement) => o.textContent?.trim().toLowerCase().includes(text.toLowerCase()));
    if (!match) return `Option not found: "${text}" in select #${idx}`;
    select.value = match.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    return null;
  }, { sel: tag, idx: index, text: optionText });
  if (result) console.warn(`  ⚠️  ${result}`);
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    // 1. Login
    console.log('=== 1. LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    // 2. Navigate to Patients
    console.log('\n=== 2. PATIENTS ===');
    const patientsLink = page.locator(
      'a:has-text("Patients"), a:has-text("patients"), a[href*="patient"], .nav-item:has-text("Patients")'
    ).first();
    await patientsLink.click();
    await page.waitForTimeout(3000);
    console.log(`URL: ${page.url()}`);

    // 3. Click Create Patient — use exact same locator as page object
    console.log('\n=== 3. CREATE PATIENT FORM ===');
    const addBtn = page.locator(
      'button:has-text("Create Patient"), a:has-text("Create Patient"), button:has-text("Add New"), a:has-text("Add New"), button:has-text("Add Patient")'
    ).first();
    console.log(`Add button visible: ${await addBtn.isVisible().catch(() => false)}`);
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(3000);
      console.log('Clicked!');
    } else {
      console.log('Button not visible, trying evaluate...');
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button, a');
        for (const btn of btns) {
          if (btn.textContent?.toLowerCase().includes('create patient') || 
              btn.textContent?.toLowerCase().includes('add new') ||
              btn.textContent?.toLowerCase().includes('add patient')) {
            (btn as HTMLElement).click();
            break;
          }
        }
      });
      await page.waitForTimeout(3000);
    }

    // 4. Generate patient data (full)
    const patient = buildPatient();
    console.log('\n=== 4. PATIENT DATA ===');
    for (const [key, val] of Object.entries(patient)) {
      if (val !== undefined && val !== null) {
        console.log(`  ${key}: "${val}"`);
      }
    }

    // 5. Fill the form
    console.log('\n=== 5. FILLING FORM ===');

    // Arabic names
    const arFirst = page.getByPlaceholder('أدخل الاسم الاول');
    if (await arFirst.isVisible({ timeout: 3000 }).catch(() => false)) {
      await arFirst.fill(patient.firstNameAr || '');
      await page.getByPlaceholder('أدخل الاسم الاوسط').fill(patient.middleNameAr || '');
      await page.getByPlaceholder('أدخل اسم العائلة').fill(patient.familyNameAr || '');
    }

    // English names
    await page.getByPlaceholder('Enter First Name').fill(patient.givenNameEn || '');
    await page.getByPlaceholder('Enter Middle Name').fill(patient.middleNameEn || '');
    await page.getByPlaceholder('Enter Family Name').fill(patient.familyNameEn || '');

    if (patient.mobile) await page.getByPlaceholder('Enter Mobile').fill(patient.mobile);
    if (patient.email) await page.getByPlaceholder('Enter Email').fill(patient.email);
    if (patient.dateOfBirth) await page.getByPlaceholder('Enter Date of birth').fill(patient.dateOfBirth);
    if (patient.nationalId) await page.locator('input[name="national_id"]').fill(patient.nationalId);

    // Select fields
    // NOTE: Indices confirmed against the current form (investigate-patient-form.ts).
    // New fields (a Yes/No select and SAP Project) were inserted between
    // Nationality and Is Employee, shifting later indices by +1/+2.
    await setSelectByOptionText(page, 'select', 5, patient.codeStatus);
    await setSelectByOptionText(page, 'select', 6, patient.isolationType);
    await setSelectByOptionText(page, 'select', 8, patient.gender);
    await setSelectByOptionText(page, 'select', 9, patient.maritalStatus);
    await setSelectByOptionText(page, 'select', 10, patient.occupation);
    await setSelectByOptionText(page, 'select', 11, patient.nationality);
    await setSelectByOptionText(page, 'select', 14, patient.isEmployee);
    await setSelectByOptionText(page, 'select', 15, patient.isVisitor);
    await setSelectByOptionText(page, 'select', 16, patient.patientSystem);
    await setSelectByOptionText(page, 'select', 7, patient.referredHospital);
    await setSelectByOptionText(page, 'select', 18, patient.religion);
    await setSelectByOptionText(page, 'select', 19, patient.preferredLanguage);

    // Radio
    if (patient.governmentIdType) {
      await page.evaluate(({ n, v }: any) => {
        const radio = document.querySelector(`input[name="${n}"][value="${v}"]`) as HTMLInputElement;
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
      }, { n: 'id_type', v: patient.governmentIdType });
    }

    await page.waitForTimeout(1000);

    // 6. DUMP ALL form values BEFORE save
    console.log('\n=== 6. FORM STATE BEFORE SAVE ===');
    const formState = await page.evaluate(() => {
      const result: any = { selects: {}, inputs: {} };
      document.querySelectorAll('select').forEach((sel: any, idx) => {
        const selectedOpt = sel.options[sel.selectedIndex];
        result.selects[idx] = {
          name: sel.getAttribute('name') || '',
          selectedValue: sel.value,
          selectedText: selectedOpt ? selectedOpt.textContent?.trim() : 'N/A',
        };
      });
      document.querySelectorAll('input:not([type="hidden"]):not([type="radio"])').forEach((inp: any, idx) => {
        if ((inp as HTMLElement).offsetParent !== null) {
          result.inputs[idx] = {
            name: inp.getAttribute('name') || '',
            placeholder: inp.getAttribute('placeholder') || '',
            value: inp.value || '',
          };
        }
      });
      return result;
    });

    console.log('  Selects:');
    for (const [idx, data] of Object.entries(formState.selects)) {
      const d = data as any;
      console.log(`    #${idx}: name="${d.name}" value="${d.selectedValue}" text="${d.selectedText}"`);
    }
    console.log('  Inputs:');
    for (const [idx, data] of Object.entries(formState.inputs)) {
      const d = data as any;
      console.log(`    #${idx}: name="${d.name}" placeholder="${d.placeholder}" value="${d.value}"`);
    }

    // 7. CLICK SAVE
    console.log('\n=== 7. CLICKING SAVE ===');
    const saveBtn = page.locator('button[name="save"]').first()
      .or(page.getByRole('button', { name: /Save/i }).first());
    console.log(`  Save button found: ${await saveBtn.isVisible().catch(() => false)}`);
    await saveBtn.click();
    await page.waitForTimeout(3000);

    // 8. CHECK SweetAlert2
    console.log('\n=== 8. SWEETALERT2 ===');
    const swal = page.locator('.swal2-popup').first();
    const swalVisible = await swal.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  SweetAlert2 visible: ${swalVisible}`);

    if (swalVisible) {
      const swalHtml = await page.evaluate(() => {
        return {
          title: document.querySelector('.swal2-title')?.textContent?.trim() || '',
          html: document.querySelector('.swal2-html-container')?.innerHTML || '',
          text: document.querySelector('.swal2-html-container')?.textContent?.trim() || '',
          icon: document.querySelector('.swal2-icon')?.className || '',
        };
      });
      console.log(`  Title: "${swalHtml.title}"`);
      console.log(`  HTML content: "${swalHtml.html}"`);
      console.log(`  Text content: "${swalHtml.text}"`);
      console.log(`  Icon: "${swalHtml.icon}"`);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/artifacts/diagnose-save.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/diagnose-save.png');

  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/diagnose-error.png' }).catch(() => {});
  } finally {
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

main();
