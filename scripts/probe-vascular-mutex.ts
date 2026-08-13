/**
 * Determine WHY the postcare radios race:
 *   - Set dressingYes, wait 2s (let round trip settle), then set tegoNo,
 *     wait 2s, save. If tegoNo survives → the earlier failure was a pure
 *     timing race (fix: longer settle). If tegoNo is still lost → the two
 *     radios are mutually exclusive on the server (fix: pick one in the
 *     scenario).
 *
 * Run: npx tsx scripts/probe-vascular-mutex.ts [visitId]
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

    await openForm();
    await dumpState('initial');

    console.log('Setting dressingYes...');
    await setRadio('dressingYes');
    await page.waitForTimeout(2000);
    await dumpState('after dressingYes +2s');

    console.log('Setting tegoNo...');
    await setRadio('tegoNo');
    await page.waitForTimeout(2000);
    await dumpState('after tegoNo +2s');

    console.log('Saving...');
    await page.locator('button[wire\\:click="save"]').first().click({ timeout: 10_000 }).catch((e) => console.log('save click error:', String(e.message).split('\n')[0]));
    await page.waitForTimeout(10000);
    console.log(`URL after save: ${page.url()}`);
    await dumpState('final');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
