/**
 * Inspect the "Physician Orders" → "Dialysis Order" section on the Patient
 * detail page on staging.
 *
 * Logs in, opens patient (config targetPatientIdentifier), expands the
 * "Physician Orders" sidebar group, clicks "Dialysis Order", and dumps the
 * resulting section: text, action buttons/links, selects (+options), inputs,
 * textareas and radios. Then looks for a "New/Add Order" button and dumps the
 * creation form if one exists.
 *
 * NOTE: page.evaluate callbacks must use FLAT arrow functions only — helper
 * function declarations inside evaluate trigger a tsx/esbuild "__name is not
 * defined" ReferenceError in the browser.
 *
 * Run: npx tsx scripts/inspect-physician-orders.ts
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

// Target patient comes from config.json (single source of truth used by every
// test) — was hardcoded to '121' before, which no longer exists in staging.
const TARGET_PATIENT = config.appointment.targetPatientIdentifier;

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

    // 2. Navigate to Patients
    console.log('\n=== 2. NAVIGATING TO PATIENTS ===');
    await page.locator('a').filter({ hasText: /patients/i }).first().click();
    await page.waitForTimeout(3000);

    // 3. Search & open target patient via the Patient ID filter
    console.log(`\n=== 3. SEARCHING PATIENT ${TARGET_PATIENT} ===`);
    await page.locator('input[name="id"]').first().fill(TARGET_PATIENT);
    await page.locator('input[type="submit"][value="Filter"], input[name="search"][value="Filter"]').first().click();
    await page.waitForTimeout(2500);

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

    // 4. Expand "Physician Orders" sidebar group
    console.log('\n=== 4. OPENING PHYSICIAN ORDERS GROUP ===');
    const ordersTab = page.locator('a.nav-link:has-text("Physician Orders")').first();
    await ordersTab.click();
    await page.waitForTimeout(1500);

    // 5. Click "Dialysis Order"
    console.log('\n=== 5. OPENING DIALYSIS ORDER ===');
    const dialysisLink = page.locator('a.nav-link:has-text("Dialysis Order")').first();
    await dialysisLink.waitFor({ state: 'visible', timeout: 5000 });
    await dialysisLink.click();
    await page.waitForTimeout(3000);
    console.log(`URL: ${page.url()}`);

    // 6. Section text (labels)
    console.log('\n=== 6. DIALYSIS ORDER SECTION TEXT ===');
    const sectionText = await page.evaluate(() => {
      const panes = Array.from(document.querySelectorAll(
        '.tab-pane.active, [role="tabpanel"], .card',
      ));
      const target = panes[panes.length - 1];
      return (target ? target.textContent : document.body.textContent) || '';
    });
    console.log(sectionText.trim().replace(/\s+/g, ' ').slice(0, 5000));

    // 7. Visible action buttons/links (candidate "New Order" buttons)
    console.log('\n=== 7. VISIBLE ACTION BUTTONS/LINKS ===');
    const actions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, a.btn, a[href]'))
        .filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' '),
          tag: el.tagName,
          href: el.getAttribute('href') || '',
          cls: (el.className || '').toString().slice(0, 70),
        }))
        .filter((a) => a.text && a.text.length <= 45 && /(Add|New|Create|Order|Save|Delete|Edit|View|Submit)/.test(a.text))
    );
    for (const a of actions) console.log(`  ${a.tag} "${a.text}" href="${a.href}" class="${a.cls}"`);

    // 8. Dump selects with options (visible only)
    console.log('\n=== 8. SELECTS ===');
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
    for (const sel of selects) {
      console.log(`Select: name="${sel!.name}" id="${sel!.id}"`);
      for (const opt of sel!.options) {
        console.log(`    value="${opt.value}" -> "${opt.text}"${opt.selected ? ' [SELECTED]' : ''}`);
      }
    }

    // 9. Dump visible inputs
    console.log('\n=== 9. INPUTS ===');
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
            value: inp.value || '',
          };
        })
        .filter((i) => i !== null)
    );
    for (const inp of inputs) {
      console.log(`Input: type="${inp!.type}" name="${inp!.name}" id="${inp!.id}" label="${inp!.label}" placeholder="${inp!.placeholder}" value="${inp!.value}"`);
    }

    // 10. Dump visible textareas
    console.log('\n=== 10. TEXTAREAS ===');
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
    for (const ta of textareas) console.log(`Textarea: name="${ta!.name}" id="${ta!.id}" placeholder="${ta!.placeholder}"`);

    // 11. Dump ALL links/buttons with order-related hrefs or text (candidates
    //     for the real "Create Dialysis Order" action)
    console.log('\n=== 11. ORDER-RELATED LINKS ===');
    const orderLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a, button'))
        .map((el) => {
          const href = el.getAttribute('href') || '';
          const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
          const wire = el.getAttribute('wire:click') || el.getAttribute('data-bs-toggle') || '';
          return {
            text: text.slice(0, 40),
            href,
            cls: (el.className || '').toString().slice(0, 60),
            wire,
          };
        })
        .filter((a) =>
          a.href.toLowerCase().includes('order') ||
          a.href.toLowerCase().includes('create') ||
          /order|add|new|create/i.test(a.text) ||
          a.wire
        )
    );
    for (const l of orderLinks) {
      console.log(`  A "${l.text}" href="${l.href}" class="${l.cls}" wire="${l.wire}"`);
    }

    // 12. Dump the orders table action cells (HTML) to find row-level actions
    console.log('\n=== 12. ORDERS TABLE ACTION CELLS ===');
    const actionCells = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('table th')).map((th) => (th.textContent || '').trim());
      const tables = Array.from(document.querySelectorAll('table')).filter((t) => {
        const r = (t as HTMLElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return tables.map((t, ti) => ({
        tableIndex: ti,
        headers,
        actionHtml: Array.from(t.querySelectorAll('tbody tr td:last-child')).slice(0, 3).map((td) => td.innerHTML.slice(0, 300)),
      }));
    });
    for (const t of actionCells) {
      console.log(`Table #${t.tableIndex} headers=[${t.headers.join(' | ')}]`);
      for (const html of t.actionHtml) console.log(`  ActionCell HTML: ${html}`);
    }

    // 13. Dismiss the conditional allergies modal, then click the DIALYSIS
    //     ORDER "Add New" scoped to the card containing the orders table
    //     (th with "Acknowledgement Status") — NOT the first openModal button
    console.log('\n=== 13. CLICKING DIALYSIS ORDER ADD NEW (card-scoped) ===');
    const allergyModal2 = page.locator('.modal:has-text("Patient Allergies")').first();
    if (await allergyModal2.isVisible({ timeout: 1500 }).catch(() => false)) {
      const closeBtn = allergyModal2.locator('button:has-text("Close"), .close, .btn-close').first();
      await (await closeBtn.isVisible().catch(() => false) ? closeBtn.click() : page.keyboard.press('Escape'));
      await page.waitForTimeout(800);
    }

    // Locate the orders card: the card containing a th with "Acknowledgement"
    const cards = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.card')).map((c, i) => {
        const header = (c.querySelector('.card-header, .card-title')?.textContent || '').trim().replace(/\s+/g, ' ');
        const hasAck = !!Array.from(c.querySelectorAll('th')).find((th) => (th.textContent || '').includes('Acknowledgement'));
        const addNews = Array.from(c.querySelectorAll('a'))
          .filter((a) => (a.textContent || '').includes('Add New'))
          .map((a) => a.getAttribute('wire:click') || a.getAttribute('href') || '(plain)');
        return { i, header: header.slice(0, 50), hasAck, addNews: addNews.slice(0, 3) };
      })
    );
    for (const c of cards) {
      console.log(`Card #${c.i} header="${c.header}" hasAck=${c.hasAck} addNews=[${c.addNews.join(' | ')}]`);
    }
    const ackCardIndex = cards.findIndex((c) => c.hasAck && c.addNews.some((a) => a.includes('openModal')));
    console.log(`Selected orders card index: ${ackCardIndex}`);
    let clicked = false;
    if (ackCardIndex >= 0) {
      clicked = await page.evaluate((idx: number) => {
        const cardsArr = Array.from(document.querySelectorAll('.card'));
        const card = cardsArr[idx];
        const addNew = Array.from(card.querySelectorAll('a')).find(
          (a) => (a.getAttribute('wire:click') || '').includes('openModal'),
        );
        if (addNew) { (addNew as HTMLElement).click(); return true; }
        return false;
      }, ackCardIndex).catch(() => false);
    }
    console.log(`Programmatic click dispatched: ${clicked}`);
    await page.waitForTimeout(4000);
    console.log(`URL after click: ${page.url()}`);
    if (clicked) {

      // Re-dump section text + selects + inputs
      // Find the dialysis order modal (contains "Dialysis Order Type") and dump
      // its FULL contents: text, selects + options, inputs, textareas, buttons
      const modalInfo = await page.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('.modal, [role="dialog"], .offcanvas, .drawer'));
        const target = modals.find((m) =>
          (m.textContent || '').includes('Dialysis Order Type') &&
          (m as HTMLElement).getBoundingClientRect().width > 0,
        );
        if (!target) return null;
        const txt = (target.textContent || '').trim().replace(/\s+/g, ' ');
        const selects = Array.from(target.querySelectorAll('select')).map((sel, i) => ({
          i,
          id: sel.id || '',
          name: sel.getAttribute('name') || '',
          options: Array.from(sel.options).map((o) => ({
            text: o.textContent?.trim() || '',
            value: o.value,
            selected: o.selected,
          })),
        }));
        const inputs = Array.from(target.querySelectorAll('input')).map((inp) => ({
          type: inp.type || '',
          id: inp.id || '',
          name: inp.getAttribute('name') || '',
          placeholder: inp.getAttribute('placeholder') || '',
        }));
        const textareas = Array.from(target.querySelectorAll('textarea')).map((ta) => ({
          id: ta.id || '',
          name: ta.getAttribute('name') || '',
          placeholder: ta.getAttribute('placeholder') || '',
        }));
        const buttons = Array.from(target.querySelectorAll('a, button')).map((b) => ({
          text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
          wire: b.getAttribute('wire:click') || '',
          cls: (b.className || '').toString().slice(0, 40),
        }));
        // Map every control to its closest ancestor <label> text
        const controls = Array.from(target.querySelectorAll('select, input, textarea')).map((c, i) => {
          let label = '';
          let p = c.parentElement;
          while (p && p !== target) {
            const lab = p.querySelector('label');
            if (lab && (lab.textContent || '').trim()) {
              label = (lab.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
              break;
            }
            p = p.parentElement;
          }
          return {
            i,
            tag: c.tagName,
            id: c.id || '',
            name: c.getAttribute('name') || '',
            type: (c as HTMLInputElement).type || '',
            label,
          };
        });
        return { txt, selects, inputs, textareas, buttons, controls };
      });
      console.log('--- AFTER CLICK: DIALYSIS ORDER MODAL ---');
      if (!modalInfo) {
        console.log('(modal not found)');
      } else {
        console.log('TEXT:');
        console.log(modalInfo!.txt.slice(0, 4000));
        console.log('\nSELECTS:');
        for (const s of modalInfo!.selects) {
          console.log(`Select #${s.i} id="${s.id}" name="${s.name}"`);
          for (const o of s.options) {
            console.log(`    value="${o.value}" -> "${o.text}"${o.selected ? ' [SELECTED]' : ''}`);
          }
        }
        console.log('\nINPUTS:');
        for (const inp of modalInfo!.inputs) console.log(`Input: type="${inp.type}" id="${inp.id}" name="${inp.name}" placeholder="${inp.placeholder}"`);
        console.log('\nTEXTAREAS:');
        for (const ta of modalInfo!.textareas) console.log(`Textarea: id="${ta.id}" name="${ta.name}" placeholder="${ta.placeholder}"`);
        console.log('\nBUTTONS:');
        for (const b of modalInfo!.buttons) console.log(`Btn: "${b.text}" wire="${b.wire}" class="${b.cls}"`);
        console.log('\nCONTROLS (label mapping):');
        for (const c of modalInfo!.controls) {
          console.log(`#${c.i} ${c.tag} type="${c.type}" id="${c.id}" name="${c.name}" label="${c.label}"`);
        }
      }

    } else {
      console.log('No New/Add Order button visible — dumping visible tables instead:');
      const tables = await page.evaluate(() =>
        Array.from(document.querySelectorAll('table'))
          .filter((t) => {
            const r = (t as HTMLElement).getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          })
          .map((t) => (t.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 2000))
      );
      for (let i = 0; i < tables.length; i++) {
        console.log(`--- Table #${i} ---`);
        console.log(tables[i]);
      }
    }

    await page.screenshot({ path: 'test-results/artifacts/physician-orders-dialysis.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/physician-orders-dialysis.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/physician-orders-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
