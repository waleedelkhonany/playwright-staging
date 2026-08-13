/**
 * Probe the Respiratory Triage page on staging after a longer settle: dump
 * the visible body text, Livewire components, buttons, modals, and whether
 * the form fields ever mount (the initial load showed only the upload header).
 *
 * Run: npx tsx scripts/probe-respiratory-triage.ts [visitId]
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
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/respiratory-triage`;
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(10000);
    console.log(`URL now: ${page.url()}`);

    // Visible body text (first 1500 chars)
    const bodyText = await page.evaluate(() =>
      (document.body?.textContent || '').replace(/\s+/g, ' ').slice(0, 1500));
    console.log('\n=== BODY TEXT ===');
    console.log(bodyText);

    // Livewire components
    const lw = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('[wire\\:id], [data-livewire-id]').forEach((el) => {
        out.push(`<${el.tagName}> id="${el.id || ''}" wire:id="${el.getAttribute('wire:id') || ''}" cls="${(el.className || '').slice(0, 60)}"`);
      });
      return out.slice(0, 20);
    });
    console.log('\n=== LIVEWIRE COMPONENTS ===');
    lw.forEach((l) => console.log('  ' + l));

    // All buttons / links on the page
    const btns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a.btn'))
        .map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          cls: (el.className || '').slice(0, 60),
          wireClick: el.getAttribute('wire:click') || '',
          href: el.getAttribute('href') || '',
          onclick: el.getAttribute('onclick') || '',
        }))
        .slice(0, 40);
    });
    console.log('\n=== BUTTONS / LINKS ===');
    btns.forEach((b) => console.log(`  "${b.text}" class="${b.cls}" wire="${b.wireClick}" href="${b.href}" onclick="${b.onclick}"`));

    // Any alerts / messages
    const alerts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.alert, .toast, .swal2-popup, .modal, .text-danger, .invalid-feedback'))
        .map((el) => ({
          cls: (el.className || '').slice(0, 60),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300),
          visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0,
        }));
    });
    console.log('\n=== ALERTS / MODALS ===');
    alerts.forEach((a) => console.log(`  [${a.visible ? 'visible' : 'hidden'}] <${a.cls}> "${a.text}"`));

    await page.screenshot({ path: 'test-results/artifacts/respiratory-triage-probe.png', fullPage: true });
    console.log('\nScreenshot saved to test-results/artifacts/respiratory-triage-probe.png');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
