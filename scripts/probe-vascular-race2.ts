/**
 * Reproduce the EXACT failing scenario for the Vascular Access postcare radios:
 * both radios start UNCHECKED (fresh record), then the test sequence sets
 * dressingYes → tegoNo, and the tegoNo check is lost after save.
 *
 * Procedure:
 *   1. Load the form and programmatically UNCHECK both radio groups
 *      (checked=false + change), save → reload gives a both-unchecked start.
 *   2. Run the exact test sequence (dressingYes then tegoNo) with the POM's
 *      120ms settle, then save.
 *   3. Dump the final persisted radio state.
 *
 * Run: npx tsx scripts/probe-vascular-race2.ts [visitId]
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
const VISIT_ID = process.argv[2] ?? config.patientAssessment?.visitId ?? '1005';

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
    const openForm = async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(5000);
    };
    const dumpState = async (label: string) => {
      const st = await page.evaluate(() => {
        const out: Record<string, string> = {};
        document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
          const wire = r.getAttribute('wire:model.live') || r.getAttribute('wire:model') || '';
          if (wire.includes('tego') || wire.includes('dressing')) out[`${wire}::${r.id}`] = String(r.checked);
        });
        return out;
      });
      console.log(`  [${label}] ${JSON.stringify(st)}`);
    };
    const setRadio = async (id: string, checked: boolean) => {
      return page.evaluate(([radioId, val]) => {
        const el = document.querySelector<HTMLInputElement>(`input[type="radio"]#${radioId}`);
        if (!el) return false;
        el.checked = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }, [id, checked]);
    };
    const clickSave = async () => {
      await page.locator('button[wire\\:click="save"]').first().click({ timeout: 10_000 }).catch((e) => console.log('save click error:', String(e.message).split('\n')[0]));
      await page.waitForTimeout(10000);
      console.log(`  URL after save: ${page.url()}`);
    };

    // Phase 1: uncheck both groups and save → both-unchecked start
    console.log('=== PHASE 1: uncheck both radio groups, save ===');
    await openForm();
    await dumpState('initial');
    await setRadio('dressingYes', false);
    await page.waitForTimeout(300);
    await setRadio('tegoYes', false);
    await page.waitForTimeout(300);
    await dumpState('after uncheck');
    await clickSave();

    // Phase 2: reload, then EXACT test sequence with 120ms settle
    console.log('\n=== PHASE 2: reload + test sequence (dressingYes → tegoNo) ===');
    await openForm();
    await dumpState('reloaded');
    await setRadio('dressingYes', true);
    await page.waitForTimeout(120);
    await dumpState('after dressingYes');
    await setRadio('tegoNo', true);
    await page.waitForTimeout(120);
    await dumpState('after tegoNo');
    await clickSave();
    await dumpState('final');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
