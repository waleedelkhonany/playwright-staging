/**
 * Inspect the Patient Assessment form workflow on staging.
 *
 * 1. Login
 * 2. Navigate to /visits (Visits directory)
 * 3. Locate the row for the visit ID (default: config flowSheet.visitId, or
 *    pass a visit ID as the first CLI arg) and dump its Actions column
 * 4. Click the edit icon in that row
 * 5. Dump all tabs on the visit edit page
 * 6. Click the "Patient Assessment" tab (if present)
 * 7. Dump every input/select/textarea in the Patient Assessment form
 *    (name, wire:model, id, placeholder, options, radio labels, section)
 * 8. Dump the Save button(s)
 *
 * Run: npx tsx scripts/inspect-patient-assessment.ts [visitId]
 */
import 'dotenv/config';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

// Default visit ID: read from config/config.json (flowSheet.visitId)
const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'config', 'config.json'), 'utf-8'),
);
const VISIT_ID = process.argv[2] ?? config.flowSheet?.visitId ?? '981';

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

    // 2. Visits list
    console.log(`\n=== 2. NAVIGATE TO /visits ===`);
    await page.goto(`${BASE_URL}/visits`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch((e) => console.log(`goto /visits error: ${String(e.message).split('\n')[0]}`));
    await page.waitForTimeout(4000);
    console.log(`Visits URL: ${page.url()}`);

    // 3. Find the row for VISIT_ID
    console.log(`\n=== 3. FIND ROW FOR VISIT ${VISIT_ID} ===`);
    const rowInfo = await page.evaluate((vid) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const target = rows.find((r) => {
        const text = r.textContent?.trim() || '';
        return text.split(/\s+/).includes(vid) || text.startsWith(vid);
      });
      if (!target) {
        return { found: false, rows: rows.length, sample: rows.slice(0, 3).map((r) => (r.textContent || '').trim().slice(0, 300)) };
      }
      return {
        found: true,
        text: (target.textContent || '').trim().slice(0, 500),
        hrefs: Array.from(target.querySelectorAll('a')).map((a) => ({ text: a.textContent?.trim() || '', href: a.getAttribute('href') || '', title: a.getAttribute('title') || '' })),
      };
    }, VISIT_ID);
    console.log(JSON.stringify(rowInfo, null, 2));

    if (!rowInfo.found) {
      const thead = await page.evaluate(() =>
        Array.from(document.querySelectorAll('table thead th')).map((h) => h.textContent?.trim() || ''));
      console.log('Table headers:', thead);
      console.log('Visit not found — aborting. Pick a different visit ID.');
      return;
    }

    // 4. Click the edit icon in the Actions column
    console.log('\n=== 4. CLICK EDIT ICON ===');
    const clickResult = await page.evaluate((vid) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const target = rows.find((r) => {
        const text = r.textContent?.trim() || '';
        return text.split(/\s+/).includes(vid) || text.startsWith(vid);
      });
      if (!target) return 'row not found';
      const editEl = Array.from(target.querySelectorAll('a, button')).find((el) => {
        const html = el.innerHTML.toLowerCase();
        const href = (el.getAttribute('href') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const cls = `${el.className}`.toLowerCase();
        return html.includes('edit') || href.includes('edit') || title.includes('edit')
          || cls.includes('edit') || html.includes('ri-edit') || html.includes('fa-pencil') || html.includes('fa-edit');
      });
      if (!editEl) return 'no edit element found';
      const info = {
        tag: editEl.tagName,
        href: (editEl as HTMLElement).getAttribute('href') || '',
        title: (editEl as HTMLElement).getAttribute('title') || '',
        onclick: (editEl as HTMLElement).getAttribute('onclick') || '',
        wireClick: (editEl as HTMLElement).getAttribute('wire:click') || '',
        html: editEl.outerHTML.slice(0, 400),
      };
      (editEl as HTMLElement).click();
      return info;
    }, VISIT_ID);
    console.log('Click result:', JSON.stringify(clickResult, null, 2));
    await page.waitForTimeout(5000);
    console.log(`URL after edit click: ${page.url()}`);

    // 5. Dump ALL tabs on the visit edit page
    console.log('\n=== 5. ALL TABS ===');
    const tabs = await page.evaluate(() => {
      const out: Array<{ tag: string; text: string; cls: string; href: string; id: string }> = [];
      document.querySelectorAll('.nav-tabs a, .nav-pills a, .nav-link, [role="tab"], .tab-pane').forEach((el) => {
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
        if (text) out.push({
          tag: el.tagName,
          text,
          cls: el.className || '',
          href: el.getAttribute('href') || '',
          id: el.id || '',
        });
      });
      return out.slice(0, 100);
    });
    tabs.forEach((t) => console.log(`  <${t.tag}> "${t.text}" class="${t.cls.slice(0, 60)}" href="${t.href}" id="${t.id}"`));

    // 6. Click the "Patient Assessment" tab if present. The tab is a nav link
    // with id `patient-assessment-tab` and href `load/visit-form/{id}/patient-assessment`.
    console.log('\n=== 6. CLICK "Patient Assessment" TAB ===');
    const paTabClicked = await page.evaluate(() => {
      const target = document.querySelector('a#patient-assessment-tab') ||
        Array.from(document.querySelectorAll('a.nav-link')).find((el) =>
          (el.getAttribute('href') || '').includes('patient-assessment') ||
          (el.textContent || '').trim().toLowerCase() === 'patient assessment');
      if (!target) return 'no patient assessment tab found';
      const info = {
        tag: target.tagName,
        text: (target.textContent || '').trim().slice(0, 80),
        href: target.getAttribute('href') || '',
        id: target.id || '',
        cls: target.className || '',
      };
      (target as HTMLElement).click();
      return info;
    });
    console.log('Tab click result:', JSON.stringify(paTabClicked, null, 2));
    await page.waitForTimeout(8000);
    console.log(`URL after tab click: ${page.url()}`);

    // 6b. Dump any modal / newly visible container after the click
    console.log('\n=== 6b. MODALS / VISIBLE CONTAINERS ===');
    const containers = await page.evaluate(() => {
      const out: Array<{ tag: string; id: string; cls: string; text: string }> = [];
      document.querySelectorAll('.modal, .modal-dialog, [role="dialog"], .tab-pane.show, .tab-pane.active').forEach((el) => {
        const visible = el.getBoundingClientRect().height > 0 || (el as HTMLElement).offsetParent !== null;
        if (!visible) return;
        out.push({
          tag: el.tagName,
          id: el.id || '',
          cls: (el.className || '').slice(0, 100),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200),
        });
      });
      return out.slice(0, 20);
    });
    containers.forEach((c) => console.log(`  <${c.tag}> id="${c.id}" class="${c.cls}" text="${c.text}"`));

    // 6c. If the form loaded into a new pane, dump it
    console.log('\n=== 6c. LOADED FORM CONTAINERS (id contains assessment) ===');
    const paContainers = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[id*="assessment"], [class*="assessment"], iframe'))
        .map((el) => ({
          tag: el.tagName,
          id: el.id || '',
          cls: (el.className || '').slice(0, 100),
          src: (el as HTMLIFrameElement).src || '',
          visible: el.getBoundingClientRect().height > 0 || (el as HTMLElement).offsetParent !== null,
        }))
        .slice(0, 20);
    });
    paContainers.forEach((c) => console.log(`  <${c.tag}> id="${c.id}" class="${c.cls}" src="${c.src}" visible=${c.visible}`));

    // 7. Dump forms + all fields
    console.log('\n=== 7. FORMS ===');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => ({
        index: i,
        id: f.id || '',
        className: (f.className || '').slice(0, 80),
        action: f.getAttribute('action') || '',
        method: f.getAttribute('method') || '',
        fieldCount: f.querySelectorAll('input, select, textarea').length,
      }));
    });
    forms.forEach((f) => console.log(`  form#${f.index} id="${f.id}" action="${f.action}" method="${f.method}" fields=${f.fieldCount}`));

    console.log('\n=== 8. ALL INPUTS & SELECTS ===');
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, textarea'))
        .map((el, i) => {
          const section = (() => {
            let node: HTMLElement | null = el.closest('.card, .panel, .section, fieldset, .accordion-item, [class*="card"]');
            let depth = 0;
            while (node && depth < 4) {
              const h = node.querySelector(':scope > .card-header, :scope > .card-title, :scope > legend, :scope > h3, :scope > h4, :scope > h5, :scope > .card-header > *');
              if (h && h.textContent?.trim()) return h.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
              node = node.parentElement?.closest('.card, .panel, .section, fieldset, .accordion-item, [class*="card"]') || null;
              depth++;
            }
            return '';
          })();
          const wire = el.getAttribute('wire:model') || el.getAttribute('wire:model.defer') || el.getAttribute('wire:model.live') || '';
          let opts: string[] = [];
          if (el.tagName === 'SELECT') {
            opts = Array.from((el as HTMLSelectElement).options).map((o) => o.textContent?.trim() || '');
          }
          return {
            i,
            tag: el.tagName,
            name: el.getAttribute('name') || '',
            id: el.id || '',
            type: el.getAttribute('type') || '',
            ph: el.getAttribute('placeholder') || '',
            wire,
            section,
            options: opts.slice(0, 40),
          };
        });
    });
    fields.forEach((f) => {
      const line = `  [${f.i}] <${f.tag}> name="${f.name}" id="${f.id}" type="${f.type}" ph="${f.ph}" wire="${f.wire}" | section="${f.section}"`;
      console.log(line);
      if (f.options.length) console.log(`        options: ${JSON.stringify(f.options)}`);
    });

    // 9. Radio groups — dump label texts so scenario values can match
    console.log('\n=== 9. RADIO GROUPS ===');
    const radios = await page.evaluate(() => {
      const groups = new Map<string, string[]>();
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        const name = r.name || r.getAttribute('wire:model') || r.getAttribute('wire:model.defer') || '';
        if (!name) return;
        const lbl = r.id ? document.querySelector(`label[for="${r.id}"]`) : null;
        const text = (lbl?.textContent || r.value || '').trim();
        if (!groups.has(name)) groups.set(name, []);
        const arr = groups.get(name)!;
        if (!arr.includes(text)) arr.push(text);
      });
      return Array.from(groups.entries());
    });
    radios.forEach(([name, values]) => console.log(`  ${name} → ${JSON.stringify(values)}`));

    // 10. Save buttons
    console.log('\n=== 10. SAVE BUTTONS ===');
    const saveBtns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'))
        .map((el) => ({
          text: (el.textContent || '').trim().slice(0, 60),
          type: el.getAttribute('type') || '',
          cls: (el.className || '').slice(0, 80),
          wireClick: el.getAttribute('wire:click') || '',
          onclick: el.getAttribute('onclick') || '',
        }))
        .filter((b) => /save|update|submit|next|continue/i.test(`${b.text} ${b.wireClick} ${b.onclick}`))
        .slice(0, 30);
    });
    saveBtns.forEach((b) => console.log(`  "${b.text}" type=${b.type} class="${b.cls}" wire="${b.wireClick}" onclick="${b.onclick}"`));

    await page.screenshot({ path: 'test-results/artifacts/patient-assessment-page.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/patient-assessment-page.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-patient-assessment-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
