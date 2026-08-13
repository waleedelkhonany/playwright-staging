/**
 * Probe the Dialysis Order modal's "Dialysis Order Type" select on staging.
 *
 * 1. Login
 * 2. Navigate to the target patient → Physician Orders → Dialysis Order
 * 3. Open the "Add New Selections" modal
 * 4. Dump the order-type select options and the other selects' option sets
 * 5. Select each non-placeholder order type in turn and dump any NEW
 *    (conditional) inputs/selects/textareas that appear
 *
 * Run: npx tsx scripts/probe-dialysis-order-types.ts
 * Credentials are loaded from .env (see .env.example).
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';
import config from '../config/config.json';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

const TARGET_PATIENT = config.appointment.targetPatientIdentifier;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    // 1. Login
    console.log('=== 1. LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    // 2. Patients → target patient
    console.log('\n=== 2. OPEN PATIENT ===');
    await page.goto(`${BASE_URL}/patients?name=&id=${TARGET_PATIENT}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const row = page.locator('table tbody tr').filter({ hasText: TARGET_PATIENT }).first();
    await row.waitFor({ state: 'visible', timeout: 10000 });
    await row.locator('a').first().click();
    await page.waitForTimeout(3000);
    console.log(`Patient detail URL: ${page.url()}`);

    // Dismiss conditional allergies modal if present
    const allergyModal = page.locator('.modal:has-text("Patient Allergies")').first();
    if (await allergyModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const closeBtn = allergyModal.locator('button:has-text("Close"), .close, .btn-close').first();
      await (await closeBtn.isVisible().catch(() => false) ? closeBtn.click() : page.keyboard.press('Escape'));
      await page.waitForTimeout(1000);
    }

    // 3. Physician Orders → Dialysis Order
    console.log('\n=== 3. OPEN PHYSICIAN ORDERS → DIALYSIS ORDER ===');
    await page.locator('a.nav-link:has-text("Physician Orders")').first().click();
    await page.waitForTimeout(1500);
    await page.locator('a.nav-link:has-text("Dialysis Order")').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('a.nav-link:has-text("Dialysis Order")').first().click();
    await page.waitForTimeout(3000);

    // 4. Open the modal (card-scoped Add New)
    console.log('\n=== 4. OPEN MODAL ===');
    const allergyModal2 = page.locator('.modal:has-text("Patient Allergies")').first();
    if (await allergyModal2.isVisible({ timeout: 1500 }).catch(() => false)) {
      const closeBtn = allergyModal2.locator('button:has-text("Close"), .close, .btn-close').first();
      await (await closeBtn.isVisible().catch(() => false) ? closeBtn.click() : page.keyboard.press('Escape'));
      await page.waitForTimeout(800);
    }
    const clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card'));
      for (const card of cards) {
        const hasAck = !!Array.from(card.querySelectorAll('th')).find((th) => (th.textContent || '').includes('Acknowledgement'));
        if (!hasAck) continue;
        const addNew = Array.from(card.querySelectorAll('a')).find(
          (a) => (a.getAttribute('wire:click') || '').includes('openModal'),
        );
        if (addNew) { (addNew as HTMLElement).click(); return true; }
      }
      return false;
    }).catch(() => false);
    console.log(`Programmatic click dispatched: ${clicked}`);
    await page.waitForTimeout(4000);

    const modal = page.locator('.modal.show').filter({ hasText: 'Dialysis Order Type' }).first();
    await modal.waitFor({ state: 'visible', timeout: 15000 });

    // 5. Dump the order-type select options + which controls have "Other" options
    console.log('\n=== 5. SELECTS WITH AN "Other" OPTION ===');
    const info = await modal.evaluate((modalEl) => {
      const selects = Array.from(modalEl.querySelectorAll('select'));
      return selects.map((sel, i) => ({
        i,
        id: sel.id || '',
        name: sel.getAttribute('name') || '',
        label: (() => {
          let p = sel.parentElement;
          while (p && p !== modalEl) {
            const lab = p.querySelector('label');
            if (lab && (lab.textContent || '').trim()) return (lab.textContent || '').trim().replace(/\s+/g, ' ');
            p = p.parentElement;
          }
          return '';
        })(),
        options: Array.from(sel.options).map((o) => o.textContent?.trim() || ''),
        hasOther: Array.from(sel.options).some((o) => (o.textContent || '').trim() === 'Other'),
      }));
    });
    for (const s of info) {
      console.log(`Select #${s.i} id="${s.id}" label="${s.label}" hasOther=${s.hasOther}`);
      console.log(`    options: ${JSON.stringify(s.options)}`);
    }

    // 6. For each order type option, select it and dump any NEW controls
    console.log('\n=== 6. CONDITIONAL CONTROLS PER ORDER TYPE ===');
    const orderTypeSelect = await modal.locator('select').nth(0); // order type is select #0
    const orderTypeOptions = (await orderTypeSelect.locator('option').allTextContents()).map((t) => t.trim()).filter(Boolean);

    for (const ot of orderTypeOptions) {
      await orderTypeSelect.selectOption({ label: ot }).catch(() => {});
      await page.waitForTimeout(2500);
      const controls = await modal.evaluate((modalEl, otName) => {
        const all = Array.from(modalEl.querySelectorAll('select, input, textarea'));
        const vis = all.filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        const summary = vis.map((el, i) => {
          const lab = (() => {
            let p = el.parentElement;
            while (p && p !== modalEl) {
              const l = p.querySelector('label');
              if (l && (l.textContent || '').trim()) return (l.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
              p = p.parentElement;
            }
            return '';
          })();
          return `${i}:${el.tagName}#${el.id || ''}[${lab}]${el.tagName === 'SELECT' ? ` ${Array.from((el as HTMLSelectElement).options).map((o) => o.textContent?.trim()).join('|').slice(0, 120)}` : ''}`;
        });
        const cond = all.filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.width === 0 && r.height === 0;
        }).length;
        return { orderType: otName, visibleCount: vis.length, hiddenCount: cond, list: summary.slice(0, 60) };
      }, ot);
      console.log(`\n--- orderType = "${ot}" (visible controls: ${controls.visibleCount}, hidden: ${controls.hiddenCount}) ---`);
      for (const line of controls.list) console.log(`    ${line}`);
    }

    await page.screenshot({ path: 'test-results/artifacts/dialysis-order-types.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/dialysis-order-types.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/probe-dialysis-order-types-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
