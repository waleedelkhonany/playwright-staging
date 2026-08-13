/**
 * Inspect the Flow Sheet form workflow on staging.
 *
 * 1. Login
 * 2. Navigate to /visits (Visits directory)
 * 3. Locate the row for visit ID 981 and dump its Actions column HTML
 * 4. Click the edit icon in that row
 * 5. Dump the resulting page: URL, tabs/sections mentioning
 *    "Treatment Nurse Visit" / "Flow Sheet", forms, and form fields
 *
 * Run: npx tsx scripts/inspect-flow-sheet.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;
const VISIT_ID = process.argv[2] ?? '981';

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
    console.log('\n=== 2. NAVIGATE TO /visits ===');
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
        html: target.outerHTML.slice(0, 6000),
        text: (target.textContent || '').trim().slice(0, 500),
        hrefs: Array.from(target.querySelectorAll('a')).map((a) => ({ text: a.textContent?.trim() || '', href: a.getAttribute('href') || '' })),
        buttons: Array.from(target.querySelectorAll('button')).map((b) => ({
          text: b.textContent?.trim() || '',
          title: b.getAttribute('title') || '',
          cls: b.className || '',
          onclick: b.getAttribute('onclick') || '',
          wireClick: b.getAttribute('wire:click') || '',
          innerHtml: b.innerHTML.slice(0, 200),
        })),
      };
    }, VISIT_ID);
    console.log(JSON.stringify(rowInfo, null, 2));

    if (!rowInfo.found) {
      // Dump the table header to know the columns
      const thead = await page.evaluate(() =>
        Array.from(document.querySelectorAll('table thead th')).map((h) => h.textContent?.trim() || ''));
      console.log('Table headers:', thead);
      await page.screenshot({ path: 'test-results/artifacts/flow-sheet-visits-list.png', fullPage: true });
      console.log('Visit not found — screenshot saved. Aborting.');
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

      // Edit icon: look for a link/button with an edit icon (ri-edit, fa-edit, pencil)
      const editEl = Array.from(target.querySelectorAll('a, button')).find((el) => {
        const html = el.innerHTML.toLowerCase();
        const href = (el.getAttribute('href') || '').toLowerCase();
        const cls = `${el.className} ${el.getAttribute('title') || ''}`.toLowerCase();
        return html.includes('edit') || href.includes('edit') || cls.includes('edit')
          || html.includes('ri-edit') || html.includes('fa-pencil') || html.includes('fa-edit');
      });
      if (!editEl) return 'no edit element found';
      const tag = editEl.tagName;
      const href = (editEl as HTMLElement).getAttribute('href') || '';
      const onclick = (editEl as HTMLElement).getAttribute('onclick') || '';
      const wireClick = (editEl as HTMLElement).getAttribute('wire:click') || '';
      (editEl as HTMLElement).click();
      return { tag, href, onclick, wireClick, html: editEl.outerHTML.slice(0, 500) };
    }, VISIT_ID);
    console.log('Click result:', JSON.stringify(clickResult, null, 2));
    await page.waitForTimeout(5000);
    console.log(`URL after edit click: ${page.url()}`);

    // 5. Dump the page: links mentioning treatment/flow/nurse, tabs, forms
    console.log('\n=== 5. LINKS MENTIONING TREATMENT / FLOW / NURSE ===');
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, button'))
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 80),
          href: el.getAttribute('href') || '',
          cls: el.className || '',
          title: el.getAttribute('title') || '',
          wireClick: el.getAttribute('wire:click') || '',
        }))
        .filter((l) => /treatment|flow|nurse|form/i.test(`${l.text} ${l.href} ${l.title} ${l.wireClick}`))
        .slice(0, 60);
    });
    links.forEach((l) => console.log(`  <${l.tag}> "${l.text}" href="${l.href}" title="${l.title}" wire="${l.wireClick}"`));

    // 6. Tabs / accordions on the page
    console.log('\n=== 6. TABS / ACCORDIONS ===');
    const tabs = await page.evaluate(() => {
      const out: Array<{ tag: string; text: string; cls: string; href: string }> = [];
      document.querySelectorAll('.nav-tabs a, .nav-pills a, .nav-link, .tab-pane, [role="tab"], .accordion-button, .card-header button, .card-header a').forEach((el) => {
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
        if (text) out.push({ tag: el.tagName, text, cls: el.className || '', href: el.getAttribute('href') || '' });
      });
      return out.slice(0, 80);
    });
    tabs.forEach((t) => console.log(`  <${t.tag}> "${t.text}" class="${t.cls.slice(0, 60)}" href="${t.href}"`));

    // 7. Forms + fields on the page
    console.log('\n=== 7. FORMS ===');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => ({
        index: i,
        id: f.id || '',
        className: (f.className || '').slice(0, 80),
        action: f.getAttribute('action') || '',
        method: f.getAttribute('method') || '',
        heading: (() => {
          // find the closest card/panel heading text
          const card = f.closest('.card, .panel, .section, [class*="card"]');
          return card ? (card.querySelector('.card-header, .card-title, h3, h4, h5')?.textContent || '').trim().slice(0, 120) : '';
        })(),
        fieldCount: f.querySelectorAll('input, select, textarea').length,
      }));
    });
    forms.forEach((f) => console.log(`  form#${f.index} id="${f.id}" action="${f.action}" method="${f.method}" fields=${f.fieldCount} heading="${f.heading}"`));

    // 8. All inputs/selects/textarea on the page (with label/heading context)
    console.log('\n=== 8. INPUTS & SELECTS ===');
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, textarea'))
        .map((el, i) => {
          const section = (() => {
            let node: HTMLElement | null = el.closest('.card, .panel, .section, fieldset, .accordion-item, [class*="card"]');
            let depth = 0;
            while (node && depth < 3) {
              const h = node.querySelector(':scope > .card-header, :scope > .card-title, :scope > legend, :scope > h3, :scope > h4, :scope > h5');
              if (h && h.textContent?.trim()) return h.textContent.trim().slice(0, 80);
              node = node.parentElement?.closest('.card, .panel, .section, fieldset, .accordion-item, [class*="card"]') || null;
              depth++;
            }
            return '';
          })();
          return {
            i,
            tag: el.tagName,
            name: el.getAttribute('name') || '',
            id: el.id || '',
            type: el.getAttribute('type') || '',
            ph: el.getAttribute('placeholder') || '',
            section,
          };
        });
    });
    fields.forEach((f) => {
      console.log(`  [${f.i}] <${f.tag}> name="${f.name}" id="${f.id}" type="${f.type}" ph="${f.ph}" | section="${f.section}"`);
    });

    // 9. Save buttons
    console.log('\n=== 9. SAVE BUTTONS ===');
    const saveBtns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'))
        .map((el) => ({
          text: (el.textContent || '').trim().slice(0, 60),
          type: el.getAttribute('type') || '',
          cls: (el.className || '').slice(0, 80),
          wireClick: el.getAttribute('wire:click') || '',
        }))
        .filter((b) => /save|update|submit|next|continue/i.test(`${b.text} ${b.wireClick}`))
        .slice(0, 30);
    });
    saveBtns.forEach((b) => console.log(`  "${b.text}" type=${b.type} class="${b.cls}" wire="${b.wireClick}"`));

    await page.screenshot({ path: 'test-results/artifacts/flow-sheet-edit-page.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/flow-sheet-edit-page.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-flow-sheet-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
