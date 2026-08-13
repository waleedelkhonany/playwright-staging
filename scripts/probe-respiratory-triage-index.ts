/**
 * After a Respiratory Triage save (redirects to ?display=index), inspect the
 * index page: the list of saved records, edit/view links, and the create form
 * when opened again (to read back persisted values).
 *
 * Run: npx tsx scripts/probe-respiratory-triage-index.ts [visitId]
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
const PATIENT_ID = config.appointment?.targetPatientIdentifier ?? '222';

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

    // Index page
    const indexUrl = `${BASE_URL}/load/form/${PATIENT_ID}/respiratory-triage?display=index`;
    console.log(`Opening index ${indexUrl}`);
    await page.goto(indexUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(7000);
    console.log(`URL: ${page.url()}`);

    // Headers
    const headers = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .card-title, .page-title'))
        .map((h) => (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100))
        .filter(Boolean).slice(0, 15));
    console.log('Headers:', JSON.stringify(headers, null, 2));

    // Table rows
    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table tbody tr')).slice(0, 10).map((r) => ({
        text: (r.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 250),
        links: Array.from(r.querySelectorAll('a, button')).map((a) => ({
          text: (a.textContent || '').trim().slice(0, 30),
          href: a.getAttribute('href') || '',
          title: a.getAttribute('title') || '',
          wireClick: a.getAttribute('wire:click') || '',
        })),
      }));
    });
    console.log('\nRows:', JSON.stringify(rows, null, 1));

    // All links/buttons on the page
    const btns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a.btn, button')).map((el) => ({
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
        cls: (el.className || '').slice(0, 50),
        href: el.getAttribute('href') || '',
        wireClick: el.getAttribute('wire:click') || '',
      })).slice(0, 30);
    });
    console.log('\nButtons:', JSON.stringify(btns, null, 1));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
