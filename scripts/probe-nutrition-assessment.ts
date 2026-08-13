import '../src/helpers/load-env';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL as string;
const U = process.env.APP_USERNAME as string;
const P = process.env.APP_PASSWORD as string;
const VISIT_ID = '1005';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, ignoreHTTPSErrors: true });
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"], input[name="email"]', U);
    await page.fill('input[name="password"]', P);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);

    const url = `${BASE_URL}/load/visit-form/${VISIT_ID}/nutrition-reassessment`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Fill a few fields via locators
    const fills: Array<[string, string]> = [
      ['[wire\\:model="data.medical_history"]', 'HTN, DM'],
      ['[wire\\:model="data.medications"]', 'Metformin'],
      ['[wire\\:model="data.pre_weight"]', '75'],
      ['[wire\\:model="data.height"]', '170'],
      ['[wire\\:model="data.dietitian_name"]', 'Test Dietitian'],
      ['[wire\\:model="data.plan_comment"]', 'Patient stable'],
    ];
    for (const [sel, v] of fills) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        try {
          await loc.fill(v, { timeout: 5000 });
          console.log(`filled ${sel}`);
        } catch {
          console.log(`SKIP ${sel}`);
        }
      } else {
        console.log(`MISSING ${sel}`);
      }
    }

    const radios: Array<[string, string]> = [
      ['data.dietHistory', 'Follow'],
      ['data.allergy', 'No'],
      ['data.appetite', 'Good'],
      ['data.weightLoss', 'No'],
      ['data.sex', 'Male'],
      ['data.foodDrug', 'No'],
      ['data.bmiRange', '18.5-24.9'],
      ['data.nutritionalRisk', 'Low'],
      ['data.kcalPerKgAge', '35 <60 years old'],
      ['data.calories', '2000 kcal/d'],
      ['data.proteinPerKg', '1.2 g/kg stable'],
      ['data.protein', '70 gm/d'],
      ['data.fluid', '1200 ml/d'],
    ];
    for (const [w, v] of radios) {
      const loc = page.locator(`[wire\\:model="${w}"][value="${v}"]`).first();
      if (await loc.count()) {
        await loc.check({ force: true, timeout: 5000 });
        console.log(`checked ${w} = ${v}`);
      } else {
        console.log(`MISSING radio ${w} value ${v}`);
      }
    }

    // A checkbox
    const cb = page.locator('[wire\\:model="data.gi_complaints.normal"]#normal').first();
    if (await cb.count()) {
      await cb.check({ force: true, timeout: 5000 });
      console.log('checked gi_complaints#normal');
    }

    await page.waitForTimeout(2000);
    console.log('\nClicking Save...');
    await page.locator('button[wire\\:click="save"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(12000);
    console.log('URL after save:', page.url());

    const popup = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('.swal2-popup, .toast, .alert, .text-danger, .invalid-feedback').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          out.push(`"${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300)}"`);
        }
      });
      return out;
    });
    console.log('POPUPS:', JSON.stringify(popup));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}
main();
