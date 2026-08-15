/**
 * Inspect the patient detail page's Profile tab and the "Add Address" form
 * on staging. Dumps:
 *   1. The patient detail page structure (URL, tabs, buttons)
 *   2. The Profile tab contents (headings, address section, buttons)
 *   3. The Add-Address form fields (inputs, selects, textareas, radios)
 *
 * Run: npx tsx scripts/inspect-patient-address.ts
 */
import '../src/helpers/load-env';
import { chromium } from 'playwright';
import { loginAsDefaultUser } from '../src/helpers/login.helper';
import { ensureHeaderContext } from '../src/helpers/header-context.helper';
import { PatientsPage } from '../src/pages/patients.page';
import config from '../config/config.json';

const TARGET_PATIENT = config.appointment.targetPatientIdentifier;

function dump(info: Record<string, unknown>): void {
  console.log(JSON.stringify(info, null, 2));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    baseURL: process.env.BASE_URL,
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  try {
    console.log(`=== TARGET PATIENT: ${TARGET_PATIENT} ===`);
    await loginAsDefaultUser(page);
    await ensureHeaderContext(page);

    const patientsPage = new PatientsPage(page);
    await patientsPage.navigateToPatients();
    console.log('\n--- Navigated to Patients. URL:', page.url());

    await patientsPage.searchAndSelectPatient(TARGET_PATIENT);
    console.log('\n--- Selected patient. URL:', page.url());

    // ---------------------------------------------------------------------
    // 1. Dump the patient detail page: heading, tabs, buttons
    // ---------------------------------------------------------------------
    const detail = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(
        '.nav-tabs .nav-link, .nav-tabs button, .nav-pills .nav-link, [role="tab"]',
      )).map((el) => ({
        text: (el.textContent || '').trim(),
        href: el.getAttribute('href') || '',
        ariaControls: el.getAttribute('aria-controls') || '',
        classes: el.className,
      }));

      const buttons = Array.from(document.querySelectorAll('button, a.btn')).map((el) => {
        const t = (el.textContent || '').trim();
        return t ? { tag: el.tagName, text: t.slice(0, 60), href: el.getAttribute('href') || '' } : null;
      }).filter(Boolean);

      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,.card-title,.page-title')).map(
        (el) => (el.textContent || '').trim(),
      );

      const profileMatches = Array.from(document.querySelectorAll('*')).filter((el) => {
        const t = (el.textContent || '').trim();
        return el.children.length === 0 && t.toLowerCase() === 'profile';
      }).map((el) => ({
        tag: el.tagName,
        id: el.id || '',
        classes: el.className || '',
        parentText: (el.parentElement?.textContent || '').trim().slice(0, 60),
      }));

      return {
        url: location.href,
        headings: headings.filter(Boolean).slice(0, 30),
        tabs,
        profileMatches,
        buttons: (buttons as Array<Record<string, string>>).filter(
          (b) => /address|profile|tab/i.test(b.text),
        ),
        bodySnippet: document.body?.innerText?.slice(0, 400).replace(/\n+/g, ' | ') || '',
      };
    });
    console.log('\n=== PATIENT DETAIL PAGE ===');
    dump(detail);

    // ---------------------------------------------------------------------
    // 1b. If a literal "Profile" element exists, try clicking it
    // ---------------------------------------------------------------------
    const literalProfile = page.locator(
      'button:has-text("Profile"), a:has-text("Profile"), .nav-link:has-text("Profile")',
    ).first();
    if (await literalProfile.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n--- Clicking literal Profile element ---');
      await literalProfile.click();
      await page.waitForTimeout(2000);
      console.log('URL after Profile click:', page.url());
    } else {
      console.log('\n(No literal Profile element found — checking Addresses tab instead)');
    }

    // ---------------------------------------------------------------------
    // 2. Inspect tab container HTML & click the Addresses tab via JS
    // ---------------------------------------------------------------------
    const tabHtml = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a.nav-link, button.nav-link, [role="tab"]'));
      const addr = links.find((el) => (el.textContent || '').trim() === 'Addresses');
      if (!addr) {
        const anyAddr = Array.from(document.querySelectorAll('*')).find(
          (el) => el.children.length === 0 && (el.textContent || '').trim() === 'Addresses',
        );
        return { found: false, anyAddrTag: anyAddr?.tagName, anyAddrParent: anyAddr?.parentElement?.outerHTML?.slice(0, 500) };
      }
      // Walk up to find the nav container
      let container = addr.parentElement;
      let depth = 0;
      while (container && depth < 4) {
        if (container.classList.contains('nav') || container.tagName === 'NAV') break;
        container = container.parentElement;
        depth++;
      }
      return {
        found: true,
        tag: addr.tagName,
        id: addr.id,
        classes: addr.className,
        href: addr.getAttribute('href'),
        dataTarget: addr.getAttribute('data-bs-target'),
        dataToggle: addr.getAttribute('data-bs-toggle'),
        onclick: addr.getAttribute('onclick'),
        outerHtml: addr.outerHTML.slice(0, 400),
        containerTag: container?.tagName,
        containerClasses: container?.className,
        containerId: container?.id,
        containerOuterHtmlStart: container?.outerHTML.slice(0, 300),
      };
    });
    console.log('\n=== ADDRESSES TAB NODE ===');
    dump(tabHtml);

    // Click via evaluate (avoids Playwright visibility quirks)
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a.nav-link, button.nav-link, [role="tab"]'));
      const addr = links.find((el) => (el.textContent || '').trim() === 'Addresses');
      if (!addr) return false;
      (addr as HTMLElement).click();
      return true;
    });
    console.log('\n--- Clicked Addresses via JS:', clicked, '---');
    await page.waitForTimeout(2500);

      const addrTab = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a.btn')).map((el) => {
          const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
          return t ? { tag: el.tagName, text: t.slice(0, 80), href: el.getAttribute('href') || '' } : null;
        }).filter(Boolean);

        const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,.card-title,.fw-bold')).map(
          (el) => (el.textContent || '').trim(),
        );

        const addressText = Array.from(document.querySelectorAll('div, table, li, p, th, td')).filter((el) => {
          const t = (el.textContent || '').trim();
          return t && /address/i.test(t) && t.length < 200;
        }).map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '));

        const activePane = Array.from(document.querySelectorAll('.tab-pane, [role="tabpanel"]')).filter(
          (el) => el.classList.contains('active') || (el as HTMLElement).style.display !== 'none',
        ).map((el) => (el.textContent || '').trim().slice(0, 600));

        return {
          url: location.href,
          headings: headings.filter(Boolean).slice(0, 40),
          addButtons: (buttons as Array<Record<string, string>>).filter(
            (b) => /address|add|new/i.test(b.text),
          ),
          addressText: Array.from(new Set(addressText)).slice(0, 40),
          activePaneSnippet: activePane[0] || '',
        };
      });
      console.log('\n=== ADDRESSES TAB CONTENTS ===');
      dump(addrTab);

    // ---------------------------------------------------------------------
    // 3. Click the "Add New" address link (view=create) via JS
    // ---------------------------------------------------------------------
    const addClicked = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find((el) => {
        const href = el.getAttribute('href') || '';
        return href.includes('tab=addresses') && href.includes('view=create');
      });
      if (!link) return false;
      (link as HTMLElement).click();
      return true;
    });
    console.log('\n--- Clicked address Add New link:', addClicked, '---');
    await page.waitForTimeout(3000);

    if (addClicked) {

      const form = await page.evaluate(() => {
        const root = document.body;

        const visibleInputs = Array.from(root.querySelectorAll('input')).map((el) => ({
          type: el.type,
          name: el.getAttribute('name') || '',
          id: el.id || '',
          placeholder: el.getAttribute('placeholder') || '',
          value: (el as HTMLInputElement).value || '',
          wireModel: el.getAttribute('wire:model') || '',
          visible: !!(el as HTMLElement).offsetParent,
          label: (el.closest('.form-group, .mb-3, .col, .row') as HTMLElement | null)
            ?.querySelector('label')?.textContent?.trim() || '',
        })).filter((el) => el.visible);

        const visibleSelects = Array.from(root.querySelectorAll('select')).map((el) => ({
          name: el.getAttribute('name') || '',
          id: el.id || '',
          wireModel: el.getAttribute('wire:model') || '',
          label: (el.closest('.form-group, .mb-3, .col, .row') as HTMLElement | null)
            ?.querySelector('label')?.textContent?.trim() || '',
          options: Array.from((el as HTMLSelectElement).options).map((o) => ({
            text: o.textContent?.trim() || '',
            value: o.value,
          })),
          visible: !!(el as HTMLElement).offsetParent,
        })).filter((el) => el.visible);

        const visibleTextareas = Array.from(root.querySelectorAll('textarea')).map((el) => ({
          name: el.getAttribute('name') || '',
          id: el.id || '',
          placeholder: el.getAttribute('placeholder') || '',
          wireModel: el.getAttribute('wire:model') || '',
          label: (el.closest('.form-group, .mb-3, .col, .row') as HTMLElement | null)
            ?.querySelector('label')?.textContent?.trim() || '',
          visible: !!(el as HTMLElement).offsetParent,
        })).filter((el) => el.visible);

        const visibleButtons = Array.from(root.querySelectorAll('button')).map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          wireClick: el.getAttribute('wire:click') || '',
          classes: el.className,
          visible: !!(el as HTMLElement).offsetParent,
        })).filter((b) => b.visible && (b.text || b.wireClick));

        const addressesPane = document.getElementById('addresses');
        const paneHtml = addressesPane?.outerHTML.slice(0, 30000) || '';

        const headings = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,.card-title')).map(
          (el) => (el.textContent || '').trim(),
        ).filter(Boolean).slice(0, 20);

        return {
          url: location.href,
          headings,
          addressesPanePresent: !!addressesPane,
          addressesPaneClasses: addressesPane?.className || '',
          addressesPaneHtml: paneHtml,
          visibleInputs,
          visibleSelects,
          visibleTextareas,
          visibleButtons,
        };
      });
      console.log('\n=== ADD ADDRESS FORM ===');
      console.log(JSON.stringify(form, null, 2));

      // Screenshot for visual reference
      await page.screenshot({
        path: `test-results/artifacts/inspect-patient-address-${TARGET_PATIENT}.png`,
        fullPage: true,
      }).catch(() => {});
    } else {
      console.log('\n!!! No add-address button found. Dumping all buttons:');
      const allBtns = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).map(
          (el) => (el.textContent || '').trim().slice(0, 60),
        ).filter(Boolean),
      );
      console.log(JSON.stringify(allBtns, null, 2));
      await page.screenshot({
        path: `test-results/artifacts/inspect-patient-address-${TARGET_PATIENT}-noadd.png`,
        fullPage: true,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
