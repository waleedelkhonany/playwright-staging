/**
 * Dump the DOM of the "Discontinue Of Hemodialysis" form on staging.
 *
 * The form is reached via the "Discontinue Of Hemodialysis" tab on the visit
 * edit page (href "load/visit-form/{id}/dis-of-hemodialysis"), so this probe
 * navigates straight to /load/visit-form/{id}/dis-of-hemodialysis and dumps:
 *   - forms (id, action, field count)
 *   - every input/select/textarea (name, wire:model, id, type, placeholder, section)
 *   - radio groups with label texts
 *   - checkbox groups with ids + labels
 *   - Save buttons
 *
 * Run: npx tsx scripts/inspect-discontinuation-form.ts [visitId]
 */
import 'dotenv/config';
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
    console.log('=== 1. LOGIN ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);
    console.log(`URL after login: ${page.url()}`);

    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/dis-of-hemodialysis`;
    console.log(`\n=== 2. NAVIGATE TO ${url} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch((e) => console.log(`goto error: ${String(e.message).split('\n')[0]}`));
    await page.waitForTimeout(6000);
    console.log(`URL now: ${page.url()}`);

    // Page title / headers
    const headers = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .card-title, .page-title'))
        .map((h) => (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100))
        .filter(Boolean).slice(0, 20));
    console.log('Headers:', JSON.stringify(headers, null, 2));

    // Forms
    console.log('\n=== 3. FORMS ===');
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

    // All inputs & selects with section context
    console.log('\n=== 4. ALL INPUTS & SELECTS ===');
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

    // Radio groups
    console.log('\n=== 5. RADIO GROUPS ===');
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

    // Checkbox groups
    console.log('\n=== 6. CHECKBOX GROUPS ===');
    const checkboxes = await page.evaluate(() => {
      const groups = new Map<string, string[]>();
      document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((r) => {
        const bind = r.getAttribute('wire:model') || r.getAttribute('wire:model.defer') || r.name || '';
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

    // Save buttons
    console.log('\n=== 7. SAVE BUTTONS ===');
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

    await page.screenshot({ path: 'test-results/artifacts/discontinue-hemodialysis-form.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/discontinue-hemodialysis-form.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-discontinuation-form-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
