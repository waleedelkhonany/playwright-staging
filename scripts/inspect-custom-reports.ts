/**
 * Inspect the NEW Custom Reports page on staging (/reports/custom-reports).
 *
 * 1. Login
 * 2. Navigate directly to /reports/custom-reports
 * 3. Dump the page header/title + Livewire component markers
 * 4. Dump ALL forms, inputs, selects, textareas (name, wire:model, id, type,
 *    placeholder, section, options)
 * 5. Dump radio groups + checkbox groups (with label texts)
 * 6. Dump ALL buttons/links (text, wire:click, onclick, href)
 * 7. Dump tables + their headers (report output area)
 * 8. Dump iframes (some report pages render results inside iframes)
 * 9. Take a full-page screenshot for visual reference
 *
 * Run: npx tsx scripts/inspect-custom-reports.ts [path]  (default: /reports/custom-reports)
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
void config; // config kept for parity with the other inspect scripts

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

// Optional CLI arg: sub-path under the site (default: /reports/custom-reports)
const SUB_PATH = process.argv[2] ?? '/reports/custom-reports';

async function dumpPage(page: import('playwright').Page): Promise<void> {
  console.log(`\nURL: ${page.url()}`);
  console.log(`Title: ${await page.title()}`);

  // Page heading + Livewire markers
  console.log('\n=== PAGE HEADING & LIVEWIRE MARKERS ===');
  const headings = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('h1, h2, h3, .page-title, .page-header').forEach((h) => {
      const t = (h.textContent || '').trim().replace(/\s+/g, ' ');
      if (t) out.push(`<${h.tagName.toLowerCase()}> "${t.slice(0, 100)}"`);
    });
    document.querySelectorAll('[wire\\:id]').forEach((el) => {
      out.push(`livewire id="${el.getAttribute('wire:id')}" name="${el.getAttribute('wire:name') || ''}" initialData=${(el.getAttribute('wire:initial-data') || '').slice(0, 120)}`);
    });
    return out.slice(0, 30);
  });
  headings.forEach((h) => console.log(`  ${h}`));

  // Sidebar/Reports menu links (to see how the page is reached in the nav)
  console.log('\n=== REPORTS-RELATED NAV LINKS ===');
  const navLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="report"], a[href*="Report"]'))
      .map((a) => ({
        text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        href: a.getAttribute('href') || '',
      }))
      .filter((l) => l.text)
      .slice(0, 30);
  });
  navLinks.forEach((l) => console.log(`  "${l.text}" → ${l.href}`));

  // Forms
  console.log('\n=== FORMS ===');
  const forms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map((f, i) => ({
      index: i,
      id: f.id || '',
      className: (f.className || '').slice(0, 80),
      action: f.getAttribute('action') || '',
      wireSubmit: f.getAttribute('wire:submit') || '',
      fieldCount: f.querySelectorAll('input, select, textarea').length,
    }));
  });
  forms.forEach((f) => console.log(`  form#${f.index} id="${f.id}" action="${f.action}" wire:submit="${f.wireSubmit}" fields=${f.fieldCount} class="${f.className}"`));

  // All inputs & selects
  console.log('\n=== ALL INPUTS & SELECTS ===');
  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea'))
      .filter((el) => (el as HTMLInputElement).type !== 'hidden')
      .map((el, i) => {
        const section = (() => {
          let node: HTMLElement | null = el.closest('.card, .panel, .section, fieldset, .accordion-item, [class*="card"], [class*="col-"]');
          let depth = 0;
          while (node && depth < 5) {
            const h = node.querySelector(':scope > .card-header, :scope > .card-title, :scope > legend, :scope > h3, :scope > h4, :scope > h5, :scope > label');
            if (h && h.textContent?.trim()) return h.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
            node = node.parentElement?.closest('.card, .panel, .section, fieldset, .accordion-item, [class*="card"]') || null;
            depth++;
          }
          return '';
        })();
        const lbl = (() => {
          if (el.id) {
            const l = document.querySelector(`label[for="${el.id}"]`);
            if (l) return (l.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
          }
          const wrap = el.closest('.form-group, .mb-3, .form-label-group');
          if (wrap) {
            const l = wrap.querySelector('label');
            if (l) return (l.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
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
          lbl,
          options: opts.slice(0, 60),
        };
      });
  });
  fields.forEach((f) => {
    const line = `  [${f.i}] <${f.tag}> name="${f.name}" id="${f.id}" type="${f.type}" ph="${f.ph}" wire="${f.wire}" | label="${f.lbl}" | section="${f.section}"`;
    console.log(line);
    if (f.options.length) console.log(`        options: ${JSON.stringify(f.options)}`);
  });

  // Hidden inputs too (they often carry wire bindings for Livewire state)
  console.log('\n=== HIDDEN INPUTS (wire-bound only) ===');
  const hiddens = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="hidden"]'))
      .filter((el) => el.getAttribute('wire:model') || el.getAttribute('wire:model.defer') || el.getAttribute('wire:model.live'))
      .map((el) => ({
        name: el.getAttribute('name') || '',
        id: el.id || '',
        wire: el.getAttribute('wire:model') || el.getAttribute('wire:model.defer') || el.getAttribute('wire:model.live') || '',
        value: (el as HTMLInputElement).value.slice(0, 60),
      }));
  });
  hiddens.forEach((h) => console.log(`  name="${h.name}" id="${h.id}" wire="${h.wire}" value="${h.value}"`));

  // Radio groups
  console.log('\n=== RADIO GROUPS ===');
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

  // Checkbox groups
  console.log('\n=== CHECKBOX GROUPS ===');
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

  // ALL buttons & action links
  console.log('\n=== BUTTONS / ACTION LINKS ===');
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a[wire\\:click]'))
      .map((el) => ({
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        type: el.getAttribute('type') || '',
        cls: (el.className || '').slice(0, 80),
        wireClick: el.getAttribute('wire:click') || '',
        onclick: el.getAttribute('onclick') || '',
        href: el.getAttribute('href') || '',
      }))
      .filter((b) => b.text || b.wireClick)
      .slice(0, 40);
  });
  buttons.forEach((b) => console.log(`  "${b.text}" type=${b.type} wire="${b.wireClick}" onclick="${b.onclick}" href="${b.href}" class="${b.cls}"`));

  // Tables (report output area)
  console.log('\n=== TABLES ===');
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map((t, i) => ({
      i,
      headers: Array.from(t.querySelectorAll('thead th')).map((th) => (th.textContent || '').trim()).slice(0, 15),
      rowCount: t.querySelectorAll('tbody tr').length,
      firstRow: (t.querySelector('tbody tr')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 150),
    }));
  });
  tables.forEach((t) => console.log(`  table#${t.i} rows=${t.rowCount} headers=${JSON.stringify(t.headers)}\n    firstRow="${t.firstRow}"`));

  // Iframes
  console.log('\n=== IFRAMES ===');
  const iframes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe')).map((f) => ({
      id: f.id || '',
      name: f.name || '',
      src: f.getAttribute('src') || '',
    }));
  });
  iframes.forEach((f) => console.log(`  iframe id="${f.id}" name="${f.name}" src="${f.src}"`));
  if (!iframes.length) console.log('  (none)');
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

    // 2. Navigate to the target page
    console.log(`\n=== 2. NAVIGATE TO ${SUB_PATH} ===`);
    await page.goto(`${BASE_URL}${SUB_PATH}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch((e) => console.log(`goto error: ${String(e.message).split('\n')[0]}`));
    await page.waitForTimeout(5000);
    console.log(`Final URL: ${page.url()} (redirected: ${!page.url().includes('custom-reports')})`);

    // 3-9. Full dump
    await dumpPage(page);

    // Screenshot for visual reference
    const shotPath = path.resolve(__dirname, '..', 'test-results', 'inspect-custom-reports.png');
    fs.mkdirSync(path.dirname(shotPath), { recursive: true });
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`\nScreenshot saved: ${shotPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
