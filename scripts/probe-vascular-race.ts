/**
 * Reproduce the postcare-radio clobbering race on the Vascular Access form.
 *
 * The suspicion: setting the dressing radio triggers a Livewire wire:change
 * server round trip; if its re-render arrives AFTER the tego radio was set
 * client-side, the tego check is lost (server state was unchecked).
 *
 * Procedure:
 *   1. Open the form; flip both postcare radios to "opposite" of the test
 *      targets (dressingNo + tegoYes), save, reload → now both are checked in
 *      a way the sequence will UNCHECK... no — we want BOTH UNCHECKED start.
 *      So instead set dressingNo + tegoYes, save, then in the next load set
 *      them to the test targets and watch.
 *   2. Run the exact test fill sequence, dumping radio state after each step.
 *   3. Save and dump final state.
 *
 * Run: npx tsx scripts/probe-vascular-race.ts [visitId]
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
    const setRadio = async (id: string) => {
      return page.evaluate((radioId) => {
        const el = document.querySelector<HTMLInputElement>(`input[type="radio"]#${radioId}`);
        if (!el) return false;
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }, id);
    };
    const clickSave = async () => {
      await page.locator('button[wire\\:click="save"]').first().click({ timeout: 10_000 }).catch((e) => console.log('save click error:', String(e.message).split('\n')[0]));
      await page.waitForTimeout(10000);
      console.log(`  URL after save: ${page.url()}`);
    };

    // Phase 1: flip both postcare radios to the OPPOSITE of test targets
    // (dressingNo + tegoYes) and save → then reloading leaves them "wrong".
    console.log('=== PHASE 1: set opposite state (dressingNo + tegoYes), save ===');
    await openForm();
    await dumpState('initial');
    await setRadio('dressingNo');
    await page.waitForTimeout(500);
    await setRadio('tegoYes');
    await page.waitForTimeout(500);
    await dumpState('after flip');
    await clickSave();

    // Phase 2: reload (fresh mount from server state), then run the exact
    // test sequence: dressingYes then tegoNo.
    console.log('\n=== PHASE 2: reload, then test sequence (dressingYes → tegoNo) ===');
    await openForm();
    await dumpState('reloaded');
    await setRadio('dressingYes');
    await page.waitForTimeout(200); // POM uses 120ms settle per field
    await dumpState('after dressingYes');
    await setRadio('tegoNo');
    await page.waitForTimeout(200);
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
