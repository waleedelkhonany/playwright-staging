import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { DialysisOrderData } from '../data/dialysis-order.data';
import type { LabOrderData } from '../data/lab-order.data';

/**
 * PhysicianOrdersPage — Page Object Model for the "Physician Orders" section
 * of the Patient detail page (CareConnect KSA).
 *
 * Supports the "Create Dialysis Order" flow:
 *   1. Open the Physician Orders → Dialysis Order tab (?tab=dialysis_order)
 *   2. Click the orders card's "Add New" button (wire:click="openModal")
 *   3. Fill the "Add New Selections" modal (two sections: "Dialysis Order
 *      Type" and "Additional Information")
 *   4. Save and verify the new order appears in the orders table
 *
 * The modal is Livewire-driven and re-renders after every change, so controls
 * are targeted by their OPTION TEXT (occurrence-based) rather than by DOM
 * index. Most fields exist twice (once per section), so section 2 fields are
 * filled with `occurrence: 2`. Values are set via page.evaluate + native
 * setters/events — the same pattern used by PatientsPage.
 *
 * @see config/config.json — appointment.targetPatientIdentifier (target patient)
 */

/**
 * Modal-scoped text inputs (index among ALL <input> elements inside the
 * modal — verified against staging DOM on 2026-08-09).
 */
const INPUT_INDEX = {
  dryWeight: 1,              // "Dry Weight (Kg)"
  dwellVolumeArterial: 9,    // "Arterial Line Volume (ML)"
  dwellVolumeVenous: 10,     // "Venous Line Volume (ML)"
  // Section 2 (Additional Information)
  dryWeight2: 33,
  dwellVolumeArterial2: 41,
  dwellVolumeVenous2: 42,
} as const;
// NOTE: UF inputs carry id="uf" (one per section) and are filled by id via
// fillUfInputs(), not by index.

/**
 * Data-driven fill map for the "Dialysis Order Type" section (Section 1).
 * Each entry selects the option whose text equals `order[key]`, at the given
 * occurrence among all selects containing that option. These arrays are the
 * SINGLE source of truth for both filling and verifying the form, so the
 * read-back check in verifyDialysisOrderForm() targets exactly the same
 * controls that were filled.
 */
const SECTION_1_SELECTS: ReadonlyArray<{ key: keyof DialysisOrderData; occurrence: number }> = [
  { key: 'orderType', occurrence: 1 },
  { key: 'modality', occurrence: 1 },
  { key: 'vascularAccessType', occurrence: 1 },
  { key: 'accessSite', occurrence: 1 },
  { key: 'needleGauge', occurrence: 1 },
  { key: 'dwellType', occurrence: 1 },
  { key: 'frequency', occurrence: 1 },
  { key: 'duration', occurrence: 1 },
  { key: 'bloodFlowRate', occurrence: 1 },
  { key: 'dialysateType', occurrence: 1 },
  { key: 'picar', occurrence: 1 },
  { key: 'lactatePercent', occurrence: 1 },
  { key: 'dialysateSodium', occurrence: 1 },
  { key: 'potassium', occurrence: 1 },
  { key: 'bicarbonate', occurrence: 1 },
  { key: 'calcium', occurrence: 1 },
  { key: 'temperature', occurrence: 1 },
  { key: 'anticoagulationType', occurrence: 1 },
  { key: 'dialyzerType', occurrence: 1 },
  { key: 'dialyzerSurfaceArea', occurrence: 1 },
];

/**
 * Data-driven fill map for the "Additional Information" section (Section 2).
 * Most fields duplicate Section 1 (matched by occurrence 2); the section-2-
 * only fields (dialysateVolume, dialyzerCartridge, electrolyteGlucose) use
 * occurrence 1 because their option text exists nowhere else in the modal.
 */
const SECTION_2_SELECTS: ReadonlyArray<{ key: keyof DialysisOrderData; occurrence: number }> = [
  { key: 'mode', occurrence: 2 },
  { key: 'vascularAccessType', occurrence: 2 },
  { key: 'accessSite', occurrence: 2 },
  { key: 'needleGauge', occurrence: 2 },
  { key: 'dwellType', occurrence: 2 },
  { key: 'frequency', occurrence: 2 },
  { key: 'duration', occurrence: 2 },
  { key: 'bloodFlowRate', occurrence: 2 },
  { key: 'dialysateType', occurrence: 2 },
  { key: 'picar', occurrence: 2 },
  { key: 'lactatePercent', occurrence: 2 },
  { key: 'dialysateVolume', occurrence: 1 },
  { key: 'dialyzerCartridge', occurrence: 1 },
  { key: 'dialyzerCartridgeExtra', occurrence: 2 },
  { key: 'dialyzerSurfaceArea', occurrence: 2 },
  { key: 'electrolyteSodium', occurrence: 2 },
  { key: 'electrolytePotassium', occurrence: 2 },
  { key: 'electrolyteCalcium', occurrence: 2 },
  { key: 'electrolyteGlucose', occurrence: 1 },
  { key: 'dialysateTemperature', occurrence: 2 },
  { key: 'anticoagulationType', occurrence: 2 },
];

/** Modal-scoped text inputs (index among ALL modal <input> elements). */
const TEXT_INPUTS: ReadonlyArray<{ key: keyof DialysisOrderData; index: number }> = [
  { key: 'dryWeight', index: INPUT_INDEX.dryWeight },
  { key: 'dwellVolumeArterial', index: INPUT_INDEX.dwellVolumeArterial },
  { key: 'dwellVolumeVenous', index: INPUT_INDEX.dwellVolumeVenous },
  { key: 'dryWeight', index: INPUT_INDEX.dryWeight2 },
  { key: 'dwellVolumeArterial', index: INPUT_INDEX.dwellVolumeArterial2 },
  { key: 'dwellVolumeVenous', index: INPUT_INDEX.dwellVolumeVenous2 },
];

export class PhysicianOrdersPage extends BasePage {
  /** The "Add New Selections" modal — the Dialysis Order creation modal */
  readonly modal: Locator;

  /** Physician Orders sidebar group toggle */
  readonly physicianOrdersNavLink: Locator;

  /** Dialysis Order sub-tab */
  readonly dialysisOrderNavLink: Locator;

  /** Card containing the dialysis orders table ("Acknowledgement Status" header) */
  readonly ordersCard: Locator;

  /** Labs & Imaging sub-tab under the Physician Orders group */
  readonly labsImagingNavLink: Locator;

  constructor(page: Page) {
    super(page);

    this.physicianOrdersNavLink = page.locator(
      'a.nav-link:has-text("Physician Orders")',
    ).first();

    this.labsImagingNavLink = page.locator(
      'a.nav-link:has-text("Labs & Imaging")',
    ).first();

    this.dialysisOrderNavLink = page.locator(
      'a.nav-link:has-text("Dialysis Order")',
    ).first();

    this.ordersCard = page.locator('.card').filter({
      has: page.locator('th:has-text("Acknowledgement")'),
    }).first();

    // The dialysis order modal is identifiable by its "Dialysis Order Type" label
    this.modal = page.locator('.modal.show').filter({
      hasText: 'Dialysis Order Type',
    }).first();
  }

  // =========================================================================
  // Navigation
  // =========================================================================

  /**
   * Open the Physician Orders → Dialysis Order tab on the patient detail page.
   * Assumes the patient detail page is already loaded.
   */
  async openDialysisOrderTab(): Promise<void> {
    await this.dismissAllergiesAlertIfPresent();
    await this.click(this.physicianOrdersNavLink);
    await this.waitForAnimation(800);

    await this.dialysisOrderNavLink.waitFor({ state: 'visible', timeout: 5000 });
    await this.click(this.dialysisOrderNavLink);
    await this.waitForPageLoad().catch(() => {});
    await this.page.waitForURL(/\?tab=dialysis_order/, { timeout: 10000 }).catch(() => {});
    await this.waitForAnimation(1000);

    // Ensure the orders table (and its Add New button) rendered
    await this.ordersCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  /**
   * Click the orders card "Add New" button (wire:click="openModal") and wait
   * for the Dialysis Order creation modal to appear.
   */
  async openNewOrderModal(): Promise<void> {
    await this.dismissAllergiesAlertIfPresent();

    // Only the orders card's Add New carries wire:click="openModal" — the
    // other "Add New" (plain btn-soft-success) belongs to the addresses widget
    // and navigates to ?tab=addresses&view=create.
    const addNew = this.ordersCard.locator(
      'a[wire\\:click*="openModal"]',
    ).first();

    // Livewire re-renders make the anchor transiently "hidden" — force click,
    // then fall back to a programmatic click if Playwright refuses.
    await addNew.click({ force: true, timeout: 10000 }).catch(async () => {
      await addNew.evaluate((el) => (el as HTMLElement).click());
    });

    await this.modal.waitFor({ state: 'visible', timeout: 15000 });
    await this.waitForAnimation(1000);
  }

  // =========================================================================
  // Form filling
  // =========================================================================

  /**
   * Set a select inside the dialysis modal by OPTION TEXT.
   *
   * Matching is EXACT-TEXT-FIRST across the whole modal: a select is only
   * counted if one of its options has an option text EXACTLY equal to
   * `optionText`. Only if NO select anywhere has an exact text match do we
   * fall back to substring matching. This avoids collisions like "35" also
   * matching "350 mL/min" / "135 mmol/L" (or the option value "35" of
   * "35 mmol/L"), or "Heparin" also matching "Unfractionated Heparin (UFH)".
   *
   * ⚠️ This exact-first matching is DUPLICATED inside the read-back helper of
   *    verifyDialysisOrderForm() (readSelect) — Playwright evaluates must be
   *    self-contained, so keep both copies in sync.
   *
   * @param optionText   The option text to select
   * @param occurrence   1 = first select with an exact match, 2 = second
   *                     (used for the duplicated "Additional Information" section)
   */
  private async setModalSelectByOption(
    optionText: string,
    occurrence: number = 1,
  ): Promise<void> {
    const result = await this.modal.evaluate((modalEl, { text, occ }) => {
      const selects = Array.from(modalEl.querySelectorAll('select'));

      // Pass 1: exact TEXT matches only. Option VALUES are deliberately NOT
      // compared — e.g. the bicarbonate option "35 mmol/L" carries value "35",
      // which would otherwise collide with the picar option text "35".
      const exactTargets: Array<HTMLSelectElement> = [];
      for (const sel of selects) {
        const options = Array.from(sel.options);
        const hasExact = options.some((o) => o.textContent?.trim() === text);
        if (hasExact) exactTargets.push(sel);
      }
      if (exactTargets.length > 0) {
        const target = exactTargets[occ - 1];
        if (target) {
          const match = Array.from(target.options).find((o) => o.textContent?.trim() === text);
          if (match) {
            target.value = match.value;
            target.dispatchEvent(new Event('change', { bubbles: true }));
            target.dispatchEvent(new Event('input', { bubbles: true }));
            return { ok: true as const, matched: match.textContent?.trim() ?? '' };
          }
        }
        return { ok: false as const };
      }

      // Pass 2: substring fallback (only reached when no exact match exists).
      let count = 0;
      for (const sel of selects) {
        const match = Array.from(sel.options).find((o) =>
          o.textContent?.trim().toLowerCase().includes(text.toLowerCase()),
        );
        if (match) {
          count++;
          if (count === occ) {
            sel.value = match.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            return { ok: true as const, matched: match.textContent?.trim() ?? '' };
          }
        }
      }
      return { ok: false as const };
    }, { text: optionText, occ: occurrence });

    if (!result.ok) {
      throw new Error(
        `[DialysisOrder] Could not select "${optionText}" (occurrence ${occurrence})`,
      );
    }
    await this.waitForAnimation(350);
  }

  /** Fill BOTH "UF (L)" inputs (one per modal section) using id="uf". */
  private async fillUfInputs(value: string): Promise<void> {
    const ufInputs = this.modal.locator('input#uf');
    const count = await ufInputs.count();
    for (let i = 0; i < count; i++) {
      await ufInputs.nth(i).evaluate((input, val) => {
        const el = input as HTMLInputElement;
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value',
        )?.set;
        if (nativeSetter) nativeSetter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      await this.waitForAnimation(200);
    }
  }

  /** Fill a modal-scoped text input by index using a native value setter. */
  private async setModalInputByIndex(inputIndex: number, value: string): Promise<void> {
    const result = await this.modal.evaluate((modalEl, { idx, val }) => {
      const input = modalEl.querySelectorAll('input')[idx] as HTMLInputElement | null;
      if (!input) return false;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value',
      )?.set;
      if (nativeSetter) nativeSetter.call(input, val);
      else input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return input.value === val;
    }, { idx: inputIndex, val: value });

    if (!result) {
      throw new Error(`[DialysisOrder] Could not fill modal input #${inputIndex} with "${value}"`);
    }
    await this.waitForAnimation(350);
  }

  /** Fill the free-text "Additional Information" textareas (both sections). */
  private async fillAdditionalInformation(text: string): Promise<void> {
    const textareas = this.modal.locator('textarea');
    const textareaCount = await textareas.count();
    for (let i = 0; i < textareaCount; i++) {
      await textareas.nth(i).evaluate((ta, value) => {
        const textarea = ta as HTMLTextAreaElement;
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value',
        )?.set;
        if (nativeSetter) nativeSetter.call(textarea, value);
        else textarea.value = value;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }, text);
      await this.waitForAnimation(200);
    }
  }

  /**
   * Fill the entire Dialysis Order modal with the provided data.
   *
   * Section 2 ("Additional Information") duplicates most fields, so those
   * selects are matched by occurrence 2.
   *
   * The modal is Livewire-driven and re-renders after EVERY change. A re-render
   * can silently reset a previously-filled field whose server round-trip was
   * still in flight (Livewire re-renders from server state). This causes a
   * missing required value at Save → a validation-error SweetAlert instead of
   * a success one. To defend against that race, fillDialysisOrderFormFields()
   * is followed by a read-back verification (verifyDialysisOrderForm), and any
   * field that did not stick is re-filled once.
   *
   * @param order The dialysis order data (option texts matching the modal)
   */
  async fillDialysisOrderForm(order: DialysisOrderData): Promise<void> {
    await this.fillDialysisOrderFormFields(order);

    // Read back every control and repair any field lost to a Livewire
    // re-render race before the test proceeds to Save.
    const mismatches = await this.verifyDialysisOrderForm(order);
    if (mismatches.length === 0) {
      console.log('[DialysisOrder] Form verification: all fields set ✓');
      return;
    }

    console.warn(
      `[DialysisOrder] ${mismatches.length} field(s) lost to Livewire re-render — re-filling them...`,
    );
    for (const m of mismatches) console.warn(`[DialysisOrder]   ✗ ${m.description}`);

    // Repair ONLY the mismatched fields (a full re-fill is wasteful and slow).
    for (const m of mismatches) await m.repair();

    // Let the repaired fields' Livewire round-trips settle before re-reading,
    // so the re-verify doesn't race an in-flight re-render.
    await this.waitForAnimation(1000);

    const remaining = await this.verifyDialysisOrderForm(order);
    if (remaining.length > 0) {
      throw new Error(
        `[DialysisOrder] Form fields still missing after re-fill:\n  - ` +
        remaining.map((r) => r.description).join('\n  - '),
      );
    }
    console.log('[DialysisOrder] Form verification after re-fill: all fields set ✓');
  }

  /** Perform the raw fill sequence (used by fillDialysisOrderForm + repair). */
  private async fillDialysisOrderFormFields(order: DialysisOrderData): Promise<void> {
    // --- Section 1: Dialysis Order Type ---
    for (const { key, occurrence } of SECTION_1_SELECTS) {
      await this.setModalSelectByOption(order[key], occurrence);
    }
    await this.setModalInputByIndex(INPUT_INDEX.dryWeight, order.dryWeight);
    await this.fillUfInputs(order.uf);
    await this.setModalInputByIndex(INPUT_INDEX.dwellVolumeArterial, order.dwellVolumeArterial);
    await this.setModalInputByIndex(INPUT_INDEX.dwellVolumeVenous, order.dwellVolumeVenous);

    // --- Section 2: Additional Information ---
    for (const { key, occurrence } of SECTION_2_SELECTS) {
      await this.setModalSelectByOption(order[key], occurrence);
    }
    await this.setModalInputByIndex(INPUT_INDEX.dryWeight2, order.dryWeight);
    await this.fillUfInputs(order.uf);
    await this.setModalInputByIndex(INPUT_INDEX.dwellVolumeArterial2, order.dwellVolumeArterial);
    await this.setModalInputByIndex(INPUT_INDEX.dwellVolumeVenous2, order.dwellVolumeVenous);
    await this.fillAdditionalInformation(order.additionalInformation);
  }

  /**
   * Read back every filled control and report any that don't match the data.
   *
   * Selects are read by re-applying the SAME exact-first option-text lookup
   * used during filling (see setModalSelectByOption), so each check targets
   * the exact control that was set.
   *
   * @returns Array of mismatch records (empty = all set). Each record carries a
   *          human-readable description plus a `repair()` closure that re-sets
   *          just that control.
   */
  private async verifyDialysisOrderForm(order: DialysisOrderData): Promise<
    Array<{ description: string; repair: () => Promise<void> }>
  > {
    const mismatches: Array<{ description: string; repair: () => Promise<void> }> = [];

    /**
     * Read the currently-selected option text of the `occurrence`-th select
     * whose options EXACTLY contain `optionText` (falling back to substring
     * only when no select has an exact match — mirrors setModalSelectByOption;
     * keep the two copies in sync).
     */
    const readSelect = async (
      optionText: string,
      occurrence: number,
    ): Promise<string> => {
      return this.modal.evaluate((modalEl, { text, occ }) => {
        const selects = Array.from(modalEl.querySelectorAll('select'));

        // Pass 1: exact TEXT matches only (mirrors setModalSelectByOption).
        const exactTargets: Array<HTMLSelectElement> = [];
        for (const sel of selects) {
          const options = Array.from(sel.options);
          const hasExact = options.some((o) => o.textContent?.trim() === text);
          if (hasExact) exactTargets.push(sel);
        }
        if (exactTargets.length > 0) {
          const target = exactTargets[occ - 1];
          if (!target) return '';
          return target.selectedOptions[0]?.textContent?.trim() ?? '';
        }

        // Pass 2: substring fallback (only when no exact match exists).
        let count = 0;
        for (const sel of selects) {
          const hasSub = Array.from(sel.options).some((o) =>
            o.textContent?.trim().toLowerCase().includes(text.toLowerCase()),
          );
          if (hasSub) {
            count++;
            if (count === occ) {
              return sel.selectedOptions[0]?.textContent?.trim() ?? '';
            }
          }
        }
        return '';
      }, { text: optionText, occ: occurrence });
    };

    const readInput = async (index: number): Promise<string> => {
      return this.modal.evaluate((modalEl, idx) => {
        const input = modalEl.querySelectorAll('input')[idx] as HTMLInputElement | null;
        return input?.value ?? '';
      }, index);
    };

    for (const { key, occurrence } of SECTION_1_SELECTS) {
      const expected = order[key];
      const actual = await readSelect(expected, occurrence);
      if (actual.trim().toLowerCase() !== expected.trim().toLowerCase()) {
        mismatches.push({
          description: `select "${key}" (occ ${occurrence}): "${actual}" ≠ "${expected}"`,
          repair: () => this.setModalSelectByOption(expected, occurrence),
        });
      }
    }
    for (const { key, occurrence } of SECTION_2_SELECTS) {
      const expected = order[key];
      const actual = await readSelect(expected, occurrence);
      if (actual.trim().toLowerCase() !== expected.trim().toLowerCase()) {
        mismatches.push({
          description: `select "${key}" (occ ${occurrence}): "${actual}" ≠ "${expected}"`,
          repair: () => this.setModalSelectByOption(expected, occurrence),
        });
      }
    }
    for (const { key, index } of TEXT_INPUTS) {
      const expected = order[key];
      const actual = await readInput(index);
      if (actual.trim() !== expected.trim()) {
        mismatches.push({
          description: `input #${index} ("${key}"): "${actual}" ≠ "${expected}"`,
          repair: () => this.setModalInputByIndex(index, expected),
        });
      }
    }

    // UF inputs (id="uf", one per section) + free-text textareas
    const ufInputs = this.modal.locator('input#uf');
    const ufCount = await ufInputs.count();
    for (let i = 0; i < ufCount; i++) {
      const actual = await ufInputs.nth(i).inputValue().catch(() => '');
      if (actual.trim() !== order.uf.trim()) {
        mismatches.push({
          description: `uf input #${i}: "${actual}" ≠ "${order.uf}"`,
          repair: () => this.fillUfInputs(order.uf),
        });
      }
    }
    const textareas = this.modal.locator('textarea');
    const taCount = await textareas.count();
    for (let i = 0; i < taCount; i++) {
      const actual = await textareas.nth(i).inputValue().catch(() => '');
      if (actual.trim() !== order.additionalInformation.trim()) {
        mismatches.push({
          description: `textarea #${i}: "${actual.slice(0, 30)}" ≠ "${order.additionalInformation.slice(0, 30)}"`,
          repair: () => this.fillAdditionalInformation(order.additionalInformation),
        });
      }
    }

    return mismatches;
  }

  // =========================================================================
  // Save & Verify
  // =========================================================================

  /**
   * Click Save in the Dialysis Order modal, wait for the modal to close, and
   * read any success confirmation (SweetAlert2 popup or success toast).
   *
   * @returns The success message text, or empty string if no popup/toast was
   *          detected (the modal-closed fallback).
   * @throws If a non-success (validation/error) SweetAlert2 popup appears — the
   *         thrown message carries the server's popup text so the test report
   *         shows exactly which field was rejected.
   */
  async saveDialysisOrder(): Promise<string> {
    const saveButton = this.modal.locator(
      'a[wire\\:click*="save"], button[wire\\:click*="save"], a:has-text("Save")',
    ).first();

    await saveButton.click({ timeout: 10000 });
    await this.waitForAnimation(1500);

    // SweetAlert2 popup (success or validation error)
    const swal = this.page.locator('.swal2-popup').first();
    if (await swal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = ((await swal.textContent()) ?? '').trim().replace(/\s+/g, ' ');
      const ok = swal.locator('button:has-text("OK"), .swal2-confirm').first();
      if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) {
        await ok.click();
        await this.waitForAnimation(500);
      }
      if (/success|saved|created/i.test(text)) {
        console.log(`[DialysisOrder] Success popup: "${text}"`);
        return text;
      }
      // Validation error (or unexpected) popup — fail loudly with the server's
      // message so the test report shows exactly which field was rejected
      // instead of a bare `toBeTruthy()` failure.
      console.warn(`[DialysisOrder] SweetAlert2 response: "${text}"`);
      await this.page.screenshot({ path: 'test-results/artifacts/dialysis-order-swal.png' }).catch(() => {});
      throw new Error(`[DialysisOrder] Save failed — non-success popup: "${text}"`);
    }

    // Modal should close after a successful save (Livewire table reload)
    await this.modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.waitForAnimation(1500);

    // Standard success toast
    const toast = this.page.locator(
      '.alert-success, .toast-success, .success-message, [class*="success"]',
    ).first();
    if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
      const message = ((await toast.textContent()) ?? '').trim();
      console.log(`[DialysisOrder] Success toast: "${message}"`);
      return message;
    }

    // Modal closed without a toast — treat as success (the table-row assertion
    // in the test is the definitive verification).
    console.log('[DialysisOrder] Modal closed after Save (no toast detected)');
    return 'Order saved (modal closed)';
  }

  /**
   * Read the newest row of the dialysis orders table.
   *
   * Order numbers increase monotonically (1, 2, 3, …), so the "newest" row is
   * the one whose leading number is the HIGHEST among all data rows — not
   * merely the first row in DOM order (mirrors getNewestLabOrderRow()). The
   * table renders its header row inside <tbody>, so rows containing "Order
   * Date" are excluded.
   */
  async getNewestOrderRow(): Promise<string> {
    const ordersTable = this.ordersCard.locator('table').filter({
      has: this.page.locator('th:has-text("Acknowledgement")'),
    }).first();

    const dataRows = ordersTable.locator('tbody tr').filter({ hasNotText: 'Order Date' });
    await dataRows.first().waitFor({ state: 'visible', timeout: 15000 });

    const texts = await dataRows.allTextContents();
    let best: string = '';
    let bestNumber = -1;
    for (const raw of texts) {
      const text = raw.replace(/\s+/g, ' ').trim();
      const num = parseInt(text, 10);
      if (!Number.isNaN(num) && num > bestNumber) {
        bestNumber = num;
        best = text;
      }
    }
    console.log(`[DialysisOrder] Newest order row: "${best}"`);
    return best;
  }

  // =========================================================================
  // Lab Order (Labs & Imaging → Create Lab Order)
  // =========================================================================

  /**
   * Open the Physician Orders → Labs & Imaging → Create Lab Order form
   * (?tab=lab_orders) on the patient detail page. The creation form renders
   * directly on the tab (no modal): a Lab Company select, a collection-by
   * select, a due date input, free-text textareas, and test rows with
   * Tom Select search widgets.
   */
  async openLabOrderTab(): Promise<void> {
    await this.dismissAllergiesAlertIfPresent();
    await this.click(this.physicianOrdersNavLink);
    await this.waitForAnimation(800);

    await this.labsImagingNavLink.waitFor({ state: 'visible', timeout: 5000 });
    await this.click(this.labsImagingNavLink);
    await this.waitForPageLoad().catch(() => {});
    await this.page.waitForURL(/\?tab=lab_orders/, { timeout: 10000 }).catch(() => {});
    await this.waitForAnimation(1000);

    // Ensure the creation form rendered (Save button wire:click="update")
    await this.page.locator(
      'a[wire\\:click*="update"], button[wire\\:click*="update"]',
    ).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  /**
   * Set a plain <select> on the page by OPTION TEXT (evaluate-based, native
   * change/input events — the same pattern used for the dialysis modal).
   */
  private async setPageSelectByOptionText(
    select: Locator,
    optionText: string,
  ): Promise<void> {
    const ok = await select.evaluate((selEl, text) => {
      const sel = selEl as HTMLSelectElement;
      let match = Array.from(sel.options).find((o) => o.textContent?.trim() === text);
      if (!match) match = Array.from(sel.options).find((o) =>
        o.textContent?.trim().toLowerCase().includes(text.toLowerCase()),
      );
      if (!match) return false;
      sel.value = match.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, optionText);

    if (!ok) {
      throw new Error(`[LabOrder] Could not select "${optionText}"`);
    }
    await this.waitForAnimation(350);
  }

  /** Fill a plain input by native value setter + events. */
  private async setPageInputValue(input: Locator, value: string): Promise<void> {
    const ok = await input.evaluate((el, val) => {
      const inp = el as HTMLInputElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value',
      )?.set;
      if (nativeSetter) nativeSetter.call(inp, val);
      else inp.value = val;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return inp.value === val;
    }, value);
    if (!ok) {
      throw new Error(`[LabOrder] Could not fill input "${value}"`);
    }
    await this.waitForAnimation(300);
  }

  /** Fill a textarea by native value setter + events. */
  private async setPageTextareaValue(textarea: Locator, value: string): Promise<void> {
    const ok = await textarea.evaluate((el, val) => {
      const ta = el as HTMLTextAreaElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value',
      )?.set;
      if (nativeSetter) nativeSetter.call(ta, val);
      else ta.value = val;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return ta.value === val;
    }, value);
    if (!ok) {
      throw new Error(`[LabOrder] Could not fill textarea "${value}"`);
    }
    await this.waitForAnimation(300);
  }

  /**
   * Pick a Lab Test from a test row's "Search Lab Test" Tom Select widget.
   *
   * The widget is a Tom Select search: click the control, type a query, then
   * click the matching dropdown option. The dropdown is matched by option
   * text (`:visible` scoped) because the page contains many hidden Tom
   * Select instances (one per historical order modal) with the same options.
   *
   * @param row       The test row (<tr wire:key="test-N-lab">) to fill
   * @param query     Text to type into the search box
   * @param exactText Exact option text to click in the dropdown
   */
  private async selectLabTestInRow(row: Locator, query: string, exactText: string): Promise<void> {
    const wrapper = row.locator('div.ts-wrapper.lab-test-search').first();
    await wrapper.locator('.ts-control').first().click({ timeout: 10000 });
    await this.waitForAnimation(500);

    await wrapper.locator('.ts-control input').first().fill(query);
    await this.waitForAnimation(1500);

    const option = this.page.locator('.ts-dropdown:visible .option')
      .filter({ hasText: exactText }).first();
    await option.waitFor({ state: 'visible', timeout: 8000 });
    await option.click();
    await this.waitForAnimation(800);

    // Verify the underlying select registered the pick
    const picked = await row.locator('select.lab-test-search').evaluate(
      (sel) => (sel as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '',
    );
    if (!picked.toLowerCase().includes(exactText.toLowerCase())) {
      throw new Error(`[LabOrder] Lab test not picked — got "${picked}"`);
    }
    await this.waitForAnimation(500);
  }

  /**
   * Click the "Add" button (wire:click="addTest") to append a new test row,
   * then wait for the second test row to render.
   */
  async addLabTestRow(): Promise<void> {
    const addButton = this.page.locator(
      'a[wire\\:click*="addTest"]:visible, button[wire\\:click*="addTest"]:visible',
    ).first();

    // Livewire re-renders make the button transiently "hidden" — force click,
    // then fall back to a programmatic click if Playwright refuses.
    await addButton.click({ force: true, timeout: 10000 }).catch(async (err) => {
      console.warn('[LabOrder] Add button force-click failed, using programmatic click:', err.message);
      await addButton.evaluate((el) => (el as HTMLElement).click());
    });
    await this.waitForAnimation(1500);

    // Wait for the SECOND test row to render (row 0 always exists on load)
    const secondRow = this.page.locator('tr[wire\\:key^="test-"]:visible').nth(1);
    await secondRow.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fill the entire "Create Lab Order" form with the provided data.
   *
   * The form renders directly on the tab (no modal). Lab Tests are picked from
   * the test rows' Tom Select search widgets: row 0 uses `order.labTest`, then
   * the Add button appends a second row filled with `order.labTest2`.
   */
  async fillLabOrderForm(order: LabOrderData): Promise<void> {
    // The page contains one hidden historical-order modal per past order, each
    // duplicating the form's input ids (e.g. #selectedLabCompany, #comment), so
    // every creation-form locator must be scoped to the VISIBLE form via :visible.

    // --- Header selects ---
    await this.setPageSelectByOptionText(
      this.page.locator('select#selectedLabCompany:visible'),
      order.labCompany,
    );
    await this.setPageSelectByOptionText(
      this.page.locator('select[name="selected_collection_by"]:visible'),
      order.collectionBy,
    );

    // --- Due date + free text ---
    await this.setPageInputValue(this.page.locator('input[name="dueDate"]:visible'), order.dueDate);
    await this.setPageTextareaValue(this.page.locator('textarea#comment:visible'), order.comment);
    await this.setPageTextareaValue(this.page.locator('textarea[name="description"]:visible'), order.description);
    await this.setPageTextareaValue(this.page.locator('textarea[name="notes"]:visible'), order.notes);

    // --- Lab Test (first test row) ---
    const testRows = this.page.locator('tr[wire\\:key^="test-"]:visible');
    await testRows.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.selectLabTestInRow(testRows.first(), order.labTest, order.labTest);

    // --- Lab Test (second test row, added via the Add button) ---
    await this.addLabTestRow();
    await this.selectLabTestInRow(testRows.nth(1), order.labTest2, order.labTest2);

    // Livewire re-renders the test rows after addTest — confirm row 0's pick
    // survived the re-render (both selections are verified this way).
    const firstPicked = await testRows.first().locator('select.lab-test-search').evaluate(
      (sel) => (sel as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '',
    );
    if (!firstPicked.toLowerCase().includes(order.labTest.toLowerCase())) {
      throw new Error(
        `[LabOrder] Row 0 Lab Test lost after addTest re-render — got "${firstPicked}"`,
      );
    }
  }

  /**
   * Click Save in the Lab Order form (wire:click="update"), then read any
   * SweetAlert2 feedback. There is no reliable success toast for lab orders,
   * so the test verifies via the orders table row instead.
   */
  async saveLabOrder(): Promise<string> {
    const saveButton = this.page.locator(
      'a[wire\\:click*="update"], button[wire\\:click*="update"]',
    ).first();
    await saveButton.click({ timeout: 10000 });
    await this.waitForAnimation(2000);

    const swal = this.page.locator('.swal2-popup').first();
    if (await swal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = ((await swal.textContent()) ?? '').trim().replace(/\s+/g, ' ');
      const ok = swal.locator('button:has-text("OK"), .swal2-confirm').first();
      if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) {
        await ok.click();
        await this.waitForAnimation(500);
      }
      if (/success|saved|created/i.test(text)) {
        console.log(`[LabOrder] Success popup: "${text}"`);
        return text;
      }
      console.warn(`[LabOrder] SweetAlert2 response: "${text}"`);
      return '';
    }

    // Livewire validation failures render as inline error alerts (no SweetAlert)
    const errorAlert = this.page.locator(
      '.alert-danger:visible, [class*="error"]:visible, .invalid-feedback:visible',
    ).first();
    if (await errorAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
      const message = ((await errorAlert.textContent()) ?? '').trim().replace(/\s+/g, ' ').slice(0, 300);
      console.warn(`[LabOrder] Inline validation error: "${message}"`);
      await this.page.screenshot({ path: 'test-results/artifacts/lab-order-validation-error.png' }).catch(() => {});
      return '';
    }

    // Livewire reloads the orders table after a successful save
    await this.waitForAnimation(2500);
    console.log('[LabOrder] No SweetAlert after Save (table row assertion verifies)');
    return 'Order saved (no popup detected)';
  }

  /**
   * Read the newest lab order row on the page.
   *
   * The patient page renders several tables that carry `wire:key="lab-order-*"`
   * rows (the creation form's test rows, historical-order modals, and a
   * "Result ready" widget table that appears earlier in the DOM), so the
   * "newest" row is the one with the HIGHEST order number among all visible
   * rows — not merely the first one in DOM order.
   */
  async getNewestLabOrderRow(): Promise<string> {
    const rows = this.page.locator('tr[wire\\:key^="lab-order-"]:visible');
    await rows.first().waitFor({ state: 'visible', timeout: 15000 });

    const texts = await rows.allTextContents();
    let best: string = '';
    let bestNumber = -1;
    for (const raw of texts) {
      const text = raw.replace(/\s+/g, ' ').trim();
      const num = parseInt(text, 10);
      if (!Number.isNaN(num) && num > bestNumber) {
        bestNumber = num;
        best = text;
      }
    }
    console.log(`[LabOrder] Newest order row: "${best}"`);
    return best;
  }
}
