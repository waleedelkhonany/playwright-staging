/**
 * Inspect the Flow Sheet "Post Treatment Assessment" section on staging.
 *
 * Read-only: logs in, opens the Flow Sheet tab for the target visit
 * (config/config.json → visitId), then dumps the outer HTML of the
 * editable "Post Treatment Assessment" table (class `table-compact`) plus its
 * enclosing card.
 *
 * Run: npx tsx scripts/inspect-flow-sheet-post-treatment.ts [visitId]
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';
import config from '../config/config.json';
import { FlowSheetPage } from '../src/pages/flow-sheet.page';

const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.APP_USERNAME;
const PASSWORD = process.env.APP_PASSWORD;
const VISIT_ID = process.argv[2] ?? config.visitId;

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

    console.log(`\n=== 2. OPEN FLOW SHEET FOR VISIT ${VISIT_ID} ===`);
    await page.goto(`${BASE_URL}/visits`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);
    const clicked = await page.evaluate((vid) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const target = rows.find((r) => {
        const text = r.textContent?.trim() || '';
        return text.split(/\s+/).includes(vid) || text.startsWith(vid);
      });
      if (!target) return false;
      const editEl = Array.from(target.querySelectorAll('a, button')).find((el) => {
        const html = el.innerHTML.toLowerCase();
        const href = (el.getAttribute('href') || '').toLowerCase();
        const cls = `${el.className} ${el.getAttribute('title') || ''}`.toLowerCase();
        return html.includes('edit') || href.includes('edit') || cls.includes('edit')
          || html.includes('ri-edit') || html.includes('fa-pencil') || html.includes('fa-edit');
      });
      if (!editEl) return false;
      (editEl as HTMLElement).click();
      return true;
    }, VISIT_ID);
    console.log(`Edit icon clicked: ${clicked}`);
    await page.waitForURL(new RegExp(`/visits/${VISIT_ID}/edit`), { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const flowSheetPage = new FlowSheetPage(page);
    await flowSheetPage.openFlowSheetTab();

    console.log('\n=== EDITABLE TABLE (table-compact) ===');
    const dump = await page.evaluate(() => {
      const root = document.querySelector('#flowsheet') || document;
      const tables = Array.from(root.querySelectorAll('table'));
      const info = tables.map((t, i) => ({ i, cls: (t.className || '').toString(), text: (t.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) }));
      const table = tables.find((t) => (t.className || '').toString().includes('table-compact')) || null;
      if (!table) return { found: false, tables: info };
      // Heading of the enclosing section card
      const card = table.closest('.card');
      const heading = card ? (card.querySelector('.card-header .section-title, .card-header')?.textContent || '').trim() : '';
      return { found: true, heading, html: table.outerHTML };
    });
    if (!dump.found) {
      console.log('table-compact NOT found. Tables:', JSON.stringify(dump.tables, null, 2));
    } else {
      console.log(`Section heading: "${dump.heading}"`);
      console.log(dump.html);
    }

    await page.screenshot({ path: 'test-results/artifacts/flow-sheet-post-treatment.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/flow-sheet-post-treatment.png');
  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: 'test-results/artifacts/inspect-post-treatment-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
