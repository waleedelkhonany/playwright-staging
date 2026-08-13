/**
 * Click the "Add New" button on the Respiratory Triage page (opens
 * load/form/{patientId}/respiratory-triage?display=create) and dump the full
 * create-form DOM: headers, forms, inputs/selects/textareas, radio groups,
 * checkbox groups, and Save buttons.
 *
 * Run: npx tsx scripts/inspect-respiratory-triage-form.ts [visitId]
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'config', 'config.json'), 'utf-8'),
);
const VISIT_ID = process.argv[2] ?? config.visitId ?? '1005';

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
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    // 1. Open the Respiratory Triage page via the visit-form route
    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/respiratory-triage`;
    console.log(`=== 1. OPEN ${url} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000);
    console.log(`URL: ${page.url()}`);

    // 2. Click "Add New"
    console.log('\n=== 2. CLICK "Add New" ===');
    const addNew = page.locator('a.btn:has-text("Add New"), button:has-text("Add New")').first();
    const addNewCount = await addNew.count();
    console.log(`Add New count: ${addNewCount}`);
    if (addNewCount > 0) {
      const href = await addNew.getAttribute('href').catch(() => '');
      console.log(`Add New href: ${href}`);
      // Navigate directly to the create URL instead of clicking (robust)
      const createUrl = href ? new URL(href, BASE_URL).toString() : null;
      if (createUrl) {
        await page.goto(createUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(7000);
        console.log(`URL now: ${page.url()}`);
      } else {
        await addNew.click({ timeout: 10_000 }).catch((e) => console.log('click error:', String(e.message).split('\n')[0]));
        await page.waitForTimeout(7000);
        console.log(`URL after click: ${page.url()}`);
      }
    }

    // 3. Headers
    console.log('\n=== 3. HEADERS ===');
    const headers = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .card-title, .page-title, legend'))
        .map((h) => (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100))
        .filter(Boolean).slice(0, 30));
    headers.forEach((h) => console.log(`  ${h}`));

    // 4. Forms
    console.log('\n=== 4. FORMS ===');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => ({
        index: i,
        id: f.id || '',
        className: (f.className || '').slice(0, 80),
        action: f.getAttribute('action') || '',
        fieldCount: f.querySelectorAll('input, select, textarea').length,
      }));
    });
    forms.forEach((f) => console.log(`  form#${f.index} id="${f.id}" action="${f.action}" fields=${f.fieldCount}`));

    // 5. All inputs & selects with section context
    console.log('\n=== 5. ALL INPUTS & SELECTS ===');
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, textarea'))
        .map((el, i) => {
          const section = (() => {
            let node: HTMLElement | null = el.closest('.card, .panel, .section, fieldset, .accordion-item, [class*="card"]');
            let depth = 0;
            while (node && depth < 5) {
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
            options: opts.slice(0, 50),
          };
        });
    });
    fields.forEach((f) => {
      const line = `  [${f.i}] <${f.tag}> name="${f.name}" id="${f.id}" type="${f.type}" ph="${f.ph}" wire="${f.wire}" | section="${f.section}"`;
      console.log(line);
      if (f.options.length) console.log(`        options: ${JSON.stringify(f.options)}`);
    });

    // 6. Radio groups
    console.log('\n=== 6. RADIO GROUPS ===');
    const radios = await page.evaluate(() => {
      const groups = new Map<string, string[]>();
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        const name = r.name || r.getAttribute('wire:model') || r.getAttribute('wire:model.defer') || r.getAttribute('wire:model.live') || '';
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

    // 7. Checkbox groups
    console.log('\n=== 7. CHECKBOX GROUPS ===');
    const checkboxes = await page.evaluate(() => {
      const groups = new Map<string, string[]>();
      document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((r) => {
        const bind = r.getAttribute('wire:model') || r.getAttribute('wire:model.defer') || r.getAttribute('wire:model.live') || r.name || '';
        if (!bind) return;
        const lbl = r.id ? document.querySelector(`label[for="${r.id}"]`) : null;
        const text = `${r.id}="${(lbl?.textContent || '').trim()}"`;
        if (!groups.has(bind)) groups.set(bind, []);
        const arr = groups.get(bind)!;
        if (!arr.includes(text)) arr.push(text);
      });
      return Array.from(groups.entries());
    });
    checkboxes.forEach(([name, values]) => console.log(`  ${name} → ${JSON.stringify(values)}`));

    // 8. Save buttons
    console.log('\n=== 8. SAVE BUTTONS ===');
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

    await page.screenshot({ path: 'test-results/artifacts/respiratory-triage-create-form.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/respiratory-triage-create-form.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-respiratory-triage-form-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
