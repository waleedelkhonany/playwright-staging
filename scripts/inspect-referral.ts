/**
 * Inspect the Referral visit-form workflow on staging.
 *
 * 1. Login
 * 2. Navigate to /visits (Visits directory)
 * 3. Locate the row for the visit ID (default: config visitId,
 *    or pass a visit ID as the first CLI arg) and click its edit icon
 * 4. Dump ALL tabs on the visit edit page (text, href, id) — the
 *    "Referral" tab lives here
 * 5. Navigate to the referral form URL and dump every input/select/textarea
 *    (name, wire:model, id, type, placeholder, radio groups + label texts,
 *    checkbox groups, sections)
 * 6. Dump the Save button(s)
 *
 * Run: npx tsx scripts/inspect-referral.ts [visitId]
 */
import 'dotenv/config';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;

// Default visit ID: read from config/config.json (visitId)
const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'config', 'config.json'), 'utf-8'),
);
const VISIT_ID = process.argv[2] ?? config.visitId ?? '1005';

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Set BASE_URL, APP_USERNAME, APP_PASSWORD in .env');
}

async function dumpForm(page: import('playwright').Page, label: string): Promise<void> {
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${page.url()}`);

  // Forms
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

  // All inputs & selects
  console.log('\n  -- ALL INPUTS & SELECTS --');
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
          options: opts.slice(0, 60),
        };
      });
  });
  fields.forEach((f) => {
    const line = `  [${f.i}] <${f.tag}> name="${f.name}" id="${f.id}" type="${f.type}" ph="${f.ph}" wire="${f.wire}" | section="${f.section}"`;
    console.log(line);
    if (f.options.length) console.log(`        options: ${JSON.stringify(f.options)}`);
  });

  // Radio groups — dump label texts so scenario values can match
  console.log('\n  -- RADIO GROUPS --');
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

  // Checkboxes — dump grouped bindings with ids
  console.log('\n  -- CHECKBOX GROUPS --');
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

  // Save buttons
  console.log('\n  -- SAVE BUTTONS --');
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

    // 3. Click the edit icon for VISIT_ID
    console.log(`\n=== 3. CLICK EDIT ICON FOR VISIT ${VISIT_ID} ===`);
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
        wireClick: (editEl as HTMLElement).getAttribute('wire:click') || '',
        html: editEl.outerHTML.slice(0, 400),
      };
      (editEl as HTMLElement).click();
      return info;
    }, VISIT_ID);
    console.log('Click result:', JSON.stringify(clickResult, null, 2));
    await page.waitForTimeout(5000);
    console.log(`URL after edit click: ${page.url()}`);

    // 4. Dump ALL tabs on the visit edit page
    console.log('\n=== 4. ALL TABS ===');
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
      return out.slice(0, 120);
    });
    tabs.forEach((t) => console.log(`  <${t.tag}> "${t.text}" class="${t.cls.slice(0, 60)}" href="${t.href}" id="${t.id}"`));

    // 5. Find a referral-ish tab href from the tab dump, else try candidates
    const referralTab = tabs.find((t) => /referral/i.test(`${t.text} ${t.href}`));
    const candidates: string[] = [];
    if (referralTab?.href && /^load\//.test(referralTab.href)) {
      candidates.push(referralTab.href.replace(/^load\//, ''));
    }
    candidates.push(
      `referral`,
      `referrals`,
      `patient-referral`,
      `referral-form`,
      `referral-request`,
      `referral-letter`,
      `referral-of-patient`,
    );

    let loaded = false;
    for (const slug of candidates) {
      const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/${slug}`;
      console.log(`\n=== 5. TRY ${url} ===`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(4000);
      console.log(`URL now: ${page.url()}`);
      const fieldCount = await page.evaluate(() => document.querySelectorAll('input, select, textarea').length).catch(() => 0);
      const hasSave = await page.locator('button[wire\\:click="save"], button:has-text("Save")').first().count().catch(() => 0);
      console.log(`fieldCount=${fieldCount} hasSave=${hasSave}`);
      // A real form has fields; a 404/error page won't (beyond nav/search).
      if (fieldCount > 5) {
        loaded = true;
        await dumpForm(page, `REFERRAL FORM at ${url}`);
        break;
      }
    }

    if (!loaded) {
      console.log('\nNone of the candidate URLs produced a form. Dumping current page text for diagnostics:');
      const body = await page.evaluate(() => (document.body?.textContent || '').replace(/\s+/g, ' ').slice(0, 800));
      console.log(body);
    }

    await page.screenshot({ path: 'test-results/artifacts/referral-page.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/referral-page.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-referral-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
