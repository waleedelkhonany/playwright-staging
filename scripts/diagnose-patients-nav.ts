/**
 * Diagnostic: reproduce the test's exact navigation flow and log the URL at
 * each step, plus what the Patients page actually renders.
 */
import { chromium } from '@playwright/test';
import 'dotenv/config';
import { loginAsDefaultUser } from '../src/helpers/login.helper';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';
import { PatientsPage } from '../src/pages/patients.page';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL: process.env.BASE_URL, viewport: { width: 1366, height: 768 } });
  await loginAsDefaultUser(page);
  console.log('1. After login URL:', page.url());

  await ensureHeaderContext(page);
  console.log('2. After ensureHeaderContext URL:', page.url());

  const patientsPage = new PatientsPage(page);
  await patientsPage.navigateToPatients();
  console.log('3. After navigateToPatients URL:', page.url());

  // Inspect the current page: is input[name="id"] present?
  const info = await page.evaluate(() => {
    const idInput = document.querySelector('input[name="id"]');
    const heading = document.querySelector('h1, h2, h3, h4, h5');
    const breadcrumb = document.querySelector('.breadcrumb, nav[aria-label="breadcrumb"]');
    return {
      url: location.href,
      hasIdInput: !!idInput,
      idInputVisible: !!idInput && !!(idInput as HTMLElement).offsetParent,
      heading: heading?.textContent?.trim() ?? '',
      breadcrumb: breadcrumb?.textContent?.trim().slice(0, 100) ?? '',
      bodySnippet: document.body?.innerText?.slice(0, 300).replace(/\n+/g, ' | '),
    };
  });
  console.log('4. Page info:', JSON.stringify(info, null, 2));

  await browser.close();
})();
