/**
 * =============================================================================
 * Select2 Helper — locator-based Select2 interaction
 * =============================================================================
 *
 * Select a value from a Select2-enhanced field identified by a Locator,
 * mirroring the proven PatientsPage.selectFromSelect2() interaction:
 *
 *   1. Programmatic: if the underlying hidden <select> already contains a
 *      matching <option>, set the value and dispatch change events.
 *   2. UI fallback: click the Select2 rendered element to open the dropdown,
 *      type the search text into the dropdown's search field, wait for the
 *      AJAX results, then click the first matching (non-disabled) option.
 *
 * Throws a descriptive error if the value cannot be selected, so test
 * failures point at the Select2 interaction itself rather than a later,
 * unrelated assertion.
 *
 * Note: the programmatic path sets the hidden <select> value without
 * updating Select2's rendered display (`.select2-selection__rendered` stays
 * stale). This is functionally correct — the form submits the new value —
 * but failure screenshots may show the previous text.
 *
 * Usage in page objects:
 *
 *   import { selectFromSelect2ByLocator } from './select2.helper';
 *
 *   await selectFromSelect2ByLocator(this.page, providerField, 'Test_Doctor');
 */

import { type Locator, type Page } from '@playwright/test';

/**
 * Select a value from a Select2-enhanced field.
 *
 * @param page     The Playwright page (used for timeout waits & keyboard)
 * @param locator  Locator resolving to the hidden native <select> that the
 *                 Select2 widget wraps (e.g. `select[name="provider"]`)
 * @param text     The option label / search text to select
 *
 * @throws Error if the value cannot be selected (no matching option, or the
 *               dropdown could not be opened/interacted with)
 */
export async function selectFromSelect2ByLocator(
  page: Page,
  locator: Locator,
  text: string,
): Promise<void> {
  // -------------------------------------------------------------------------
  // 1. Programmatic — set the hidden <select> value if an option matches
  // -------------------------------------------------------------------------
  const progResult = await locator.evaluate((el, searchText) => {
    const select = el as HTMLSelectElement;
    if (select.tagName !== 'SELECT') return 'NOT_A_SELECT';

    const options = Array.from(select.options);
    let match = options.find((o) => o.textContent?.trim() === searchText);
    if (!match) match = options.find((o) =>
      o.textContent?.trim().toLowerCase().includes(searchText.toLowerCase()),
    );
    if (!match) return `No option matching "${searchText}"`;

    select.value = match.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    return null; // success
  }, text);

  if (progResult === null) {
    await page.waitForTimeout(300);
    return;
  }

  console.warn(`[Select2] "${text}": ${progResult} — using UI interaction`);

  // -------------------------------------------------------------------------
  // 2. Open the dropdown by clicking the Select2 rendered element
  // -------------------------------------------------------------------------
  const opened = await locator.evaluate((el) => {
    const select = el as HTMLSelectElement;

    // Classic Select2 v4 inserts the container span as the select's adjacent
    // sibling; fall back to a parent-wide query for wrapped layouts. (This
    // beats a plain parent-wide query, which could grab a DIFFERENT widget's
    // container when several Select2 fields share one parent.)
    const findContainer = (s: HTMLSelectElement): HTMLElement | null => {
      const next = s.nextElementSibling;
      if (next?.classList.contains('select2-container')) return next as HTMLElement;
      const prev = s.previousElementSibling;
      if (prev?.classList.contains('select2-container')) return prev as HTMLElement;
      const found = s.parentElement?.querySelector('.select2-container');
      return found instanceof HTMLElement ? found : null;
    };

    const rendered = findContainer(select)?.querySelector('.select2-selection__rendered') as HTMLElement | null;
    if (rendered) {
      rendered.click();
      return true;
    }
    return false;
  }).catch(() => false);

  if (!opened) {
    throw new Error(`[Select2] "${text}": could not open the dropdown`);
  }
  await page.waitForTimeout(800);

  const openContainer = page.locator('.select2-container--open');
  const searchInput = openContainer.locator('.select2-search__field').first();

  // -------------------------------------------------------------------------
  // 3. No search field → click the matching option text directly
  // -------------------------------------------------------------------------
  if (!(await searchInput.isVisible({ timeout: 3000 }).catch(() => false))) {
    const opts = openContainer.locator('.select2-results__option');
    try {
      await opts.first().waitFor({ state: 'visible', timeout: 5000 });
      const count = await opts.count();
      const textLower = text.toLowerCase();
      for (let i = 0; i < count; i++) {
        const cls = (await opts.nth(i).getAttribute('class').catch(() => '')) || '';
        if (cls.includes('disabled') || cls.includes('loading')) continue;
        const txt = (await opts.nth(i).textContent())?.trim() || '';
        if (txt.toLowerCase().includes(textLower)) {
          await opts.nth(i).click();
          await page.waitForTimeout(300);
          return;
        }
      }
    } catch {
      // fall through to the descriptive error below
    }
    await page.keyboard.press('Escape');
    throw new Error(`[Select2] "${text}": no matching option in the dropdown`);
  }

  // -------------------------------------------------------------------------
  // 4. Type the search text (native value setter + events — React-safe)
  // -------------------------------------------------------------------------
  await page.evaluate(({ searchText }) => {
    const field = document.querySelector('.select2-container--open .select2-search__field') as HTMLInputElement | null;
    if (!field) return;
    field.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value',
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(field, searchText);
    } else {
      field.value = searchText;
    }
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('keyup', { bubbles: true }));
  }, { searchText: text });

  // -------------------------------------------------------------------------
  // 5. Wait for AJAX results and click the first valid option
  // -------------------------------------------------------------------------
  const opts = openContainer.locator('.select2-results__option');
  try {
    await opts.first().waitFor({ state: 'visible', timeout: 15_000 });
    const count = await opts.count();
    for (let i = 0; i < count; i++) {
      const cls = (await opts.nth(i).getAttribute('class').catch(() => '')) || '';
      if (cls.includes('loading') || cls.includes('disabled')) continue;
      const txt = (await opts.nth(i).textContent())?.trim() || '';
      if (txt.length > 0 && !txt.toLowerCase().includes('result') && !txt.toLowerCase().includes('no ')) {
        await opts.nth(i).click();
        console.log(`[Select2] "${text}": selected "${txt}"`);
        await page.waitForTimeout(300);
        return;
      }
    }
  } catch {
    // fall through to the descriptive error below
  }
  await page.keyboard.press('Escape');
  throw new Error(`[Select2] "${text}": could not select a matching option`);
}
