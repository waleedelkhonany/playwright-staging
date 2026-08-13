/**
 * Investigate the post-care radios (dressing_applied / tego_changed) on the
 * Vascular Access Assessment form after a save — dump the full radio group
 * (ids, checked, value, wire bindings) and the surrounding DOM so the POM can
 * match and verify them correctly.
 *
 * Run: npx tsx scripts/probe-vascular-postcare.ts [visitId]
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

    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/vascular-access-assessment`;
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000);
    console.log(`URL now: ${page.url()}`);

    // Dump every radio on the page with its full context
    const radios = await page.evaluate(() => {
      const out: Array<Record<string, string>> = [];
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        let container = r.closest('label, .form-check, td, div');
        out.push({
          id: r.id || '',
          name: r.name || '',
          value: r.value || '',
          checked: String(r.checked),
          wireLive: r.getAttribute('wire:model.live') || '',
          wire: r.getAttribute('wire:model') || '',
          disabled: String(r.disabled),
          visible: String(r.getBoundingClientRect().width > 0 && r.getBoundingClientRect().height > 0),
          labelText: (r.closest('label')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          containerText: (container?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
          outer: r.outerHTML.slice(0, 250),
        });
      });
      return out;
    });
    radios.forEach((r) => {
      console.log(`\n  id="${r.id}" value="${r.value}" checked=${r.checked} disabled=${r.disabled} visible=${r.visible}`);
      console.log(`    live="${r.wireLive}" wire="${r.wire}"`);
      console.log(`    label="${r.labelText}"`);
      console.log(`    container="${r.containerText}"`);
    });

    // Dump the postcare section container
    const sectionText = await page.evaluate(() => {
      const el = document.querySelector('[id*="postcare"], [id*="post_care"], [class*="postcare"]');
      return el ? (el.textContent || '').replace(/\s+/g, ' ').slice(0, 300) : '<no container>';
    });
    console.log('\nPostcare container text:', sectionText);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
