import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { ReferralData } from '../data/referral.data';

/**
 * ReferralPage — Page Object Model for the Referral (Referrals) visit-form.
 *
 * The form is reached from the visit edit page (`/visits/{id}/edit`) via the
 * "Referrals" tab (`a#referrals-tab`, href "load/visit-form/{id}/referrals").
 * Like the Patient Assessment / Discontinue Of Hemodialysis / Vascular Access
 * tabs, it opens in a NEW browser tab (target="_blank"), so this page object
 * navigates directly to `/load/visit-form/{visitId}/referrals` instead
 * (behaviorally equivalent, robust in headless runs).
 *
 * The form is a standalone Livewire component with NO `name` attributes —
 * every control is bound via `wire:model="data.<path>"` and has an `id`
 * (verified on staging). Bindings are a MIX of two forms (same as the
 * Vascular Access POM): the date/text/textarea fields are plain
 * `wire:model="data.*"` while the selects are `wire:model.live="data.*"`.
 * Field kinds found on staging:
 *   - text/date inputs    (referral_date, completion_date)
 *   - selects             (referral_type, referral_hospital_id)
 *   - checkboxes          (print_monthly_medical_report, ...)
 *   - textareas           (referral_reason, comments)
 * There are NO radios on this form.
 *
 * The file-upload inputs (`uploadFile` — signature pad, and
 * `inputGroupFileImage` — attachment) open file dialogs and the hidden
 * `uploaded_media_ids` input is set by the upload — all three are
 * intentionally NOT part of the FIELD_MAP.
 *
 * On success the component navigates and the URL gains `?row_id={id}` (the
 * saved record id) — that URL change is the save signal (no SweetAlert on
 * this form, same as the Patient Assessment / Discontinuation / Vascular
 * Access forms).
 *
 * @example
 *   const referralPage = new ReferralPage(page);
 *   await referralPage.openVisitReferral('1005'); // Visits dir → edit icon → form
 *   await referralPage.fillReferralForm(data);    // referral details + prints + reason
 *   const rowId = await referralPage.saveReferral();
 *
 * @see config/config.json — visitId (target visit)
 * @see config/referral-scenarios/referral.scenario.json — form payload
 */

/** How a Referral field is filled. */
type FieldKind = 'text' | 'select' | 'checkbox' | 'textarea';

/**
 * Map of ReferralData key → DOM field + fill kind.
 *
 * Every field is located by its `wire:model` binding (e.g. `data.referral_type`).
 * Checkboxes are matched individually by their input `id` (e.g.
 * `print_monthly_medical_report`) in addition to the binding.
 */
interface FieldSpec {
  /** The `wire:model` binding value (e.g. `data.referral_type`) */
  wire: string;
  kind: FieldKind;
  /** For checkboxes: the input `id` to check (e.g. `print_monthly_medical_report`) */
  id?: string;
}

/**
 * Single source of truth mapping the data model to the real staging DOM
 * (verified via scripts/inspect-referral.ts / probe on visit 1005).
 */
const FIELD_MAP: Record<keyof ReferralData, FieldSpec> = {
  // Referral details
  referralDate:           { wire: 'data.referral_date', kind: 'text' },
  referralType:           { wire: 'data.referral_type', kind: 'select' },
  referralHospitalId:     { wire: 'data.referral_hospital_id', kind: 'select' },

  // Documents to print
  printMonthlyMedicalReport: { wire: 'data.print_monthly_medical_report', kind: 'checkbox', id: 'print_monthly_medical_report' },
  printSystemMedicalReport:  { wire: 'data.print_system_medical_report', kind: 'checkbox', id: 'print_system_medical_report' },
  printLabResult:            { wire: 'data.print_lab_result', kind: 'checkbox', id: 'print_lab_result' },
  printLast3Flowsheets:      { wire: 'data.print_last_3_flowsheets', kind: 'checkbox', id: 'print_last_3_flowsheets' },

  // Referral reason
  referralReason:         { wire: 'data.referral_reason', kind: 'textarea' },

  // Completion
  completionDate:         { wire: 'data.completion_date', kind: 'text' },
  comments:               { wire: 'data.comments', kind: 'textarea' },
};

export class ReferralPage extends BasePage {
  /** The Save button at the bottom of the form (wire:click="save"). */
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = page.locator('button[wire\\:click="save"]').first();
  }

  // =========================================================================
  // Navigation
  // =========================================================================

  /**
   * Open the Referral form of the given visit:
   *
   *   1. Open the Visits directory (`/visits`) and find the row whose first
   *      column equals the visit ID
   *   2. Click the edit icon (`fa-pen-to-square`, inside `a[title="Edit"]`)
   *      under the Actions column → `/visits/{id}/edit`
   *   3. Navigate directly to the Referral form
   *      (`/load/visit-form/{id}/referrals`) — the "Referrals" tab on the
   *      edit page opens exactly this URL in a new tab (`target="_blank"`),
   *      so navigating to it is equivalent.
   *
   * @param visitId The visit ID shown in the Visits directory (e.g. "1005")
   */
  async openVisitReferral(visitId: string): Promise<void> {
    // 1. Visits directory
    await this.goto('/visits');
    await this.waitForAnimation(1500);

    // The visit ID is the first cell of its row.
    const visitRow = this.page.locator(
      `table tbody tr:has(td:first-child:text-is("${visitId}"))`,
    ).first();
    await visitRow.waitFor({ state: 'visible', timeout: 20_000 });

    // 2. Edit icon under the Actions column (a[title="Edit"] wraps the icon)
    const editLink = visitRow.locator('a[title="Edit"]').first();
    await editLink.waitFor({ state: 'visible', timeout: 10_000 });
    console.log(`[Referral] Visit ${visitId} found — clicking edit icon...`);
    await editLink.click();

    await this.page.waitForURL(
      new RegExp(`/visits/${visitId}/edit`),
      { timeout: 20_000 },
    );
    await this.waitForPageLoad().catch(() => {});
    await this.waitForAnimation(1000);

    // 3. Referral form (the tab opens this same URL in a new tab)
    console.log(`[Referral] Opening Referral form for visit ${visitId}...`);
    await this.goto(`/load/visit-form/${visitId}/referrals`);
    await this.waitForAnimation(2000);

    await this.saveButton.waitFor({ state: 'visible', timeout: 20_000 });
    console.log('[Referral] Referral form opened');
  }

  // =========================================================================
  // Form filling
  // =========================================================================

  /**
   * Build the CSS selector for a Referral control from its binding.
   *
   * The form MIXES binding modes (verified on staging): the date/comments
   * fields are plain `wire:model="data.*"` while the selects are
   * `wire:model.live="data.*"` — so the selector is a UNION of both
   * attribute forms, exactly like the Vascular Access POM. A single
   * `[wire\:model="X"]` would silently miss the live fields.
   */
  private fieldSelector(spec: FieldSpec): string {
    return `[wire\\:model="${spec.wire}"], [wire\\:model\\.live="${spec.wire}"]`;
  }

  /**
   * Set a single Referral field identified by its `wire:model` binding (plus
   * its input `id` for checkboxes).
   *
   * Uses page.evaluate with native value setters + input/change events — the
   * same pattern proven for the other visit-form POMs:
   *   - checkboxes → set checked + change/input (matched by id)
   *   - selects    → pick the option whose text matches, set value + change
   *   - text/date  → native setter + input/change
   *   - textareas  → native setter + input/change
   *
   * @throws Error if the control or the value cannot be found, so failures
   *               point at the exact field rather than a later assertion.
   */
  private async setField(spec: FieldSpec, value: string): Promise<void> {
    const selector = this.fieldSelector(spec);
    const ok = await this.page.evaluate(({ selector, value, kind, id }) => {
      const root = document;

      if (kind === 'checkbox') {
        const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]#${id}`);
        if (!el) return false;
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      if (kind === 'select') {
        const el = root.querySelector<HTMLSelectElement>(selector);
        if (!el) return false;
        const match = Array.from(el.options).find((o) => o.textContent?.trim() === value)
          || Array.from(el.options).find((o) =>
            o.textContent?.trim().toLowerCase().includes(value.toLowerCase()),
          );
        if (!match) return false;
        el.value = match.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      const el = root.querySelector<HTMLElement>(selector);
      if (!el) return false;

      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value);
      else (el as HTMLInputElement).value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, { selector, value, kind: spec.kind, id: spec.id ?? '' });

    if (!ok) {
      throw new Error(`[Referral] Could not set field "${spec.wire}" = "${value}"`);
    }
    // Small settle wait per field — Livewire `wire:model` fields sync on input.
    await this.waitForAnimation(100);
  }

  /**
   * Fill the Referral form section by section from the scenario data.
   * Iterates the FIELD_MAP in DOM section order and sets every field that has
   * a value in `data` (empty/undefined = skip).
   */
  async fillReferralForm(data: ReferralData): Promise<void> {
    const entries = Object.entries(FIELD_MAP) as Array<[keyof ReferralData, FieldSpec]>;
    let filled = 0;

    for (const [key, spec] of entries) {
      const value = data[key];
      if (value === undefined || value === null || value === '') continue;
      await this.setField(spec, value);
      filled++;
    }

    console.log(`[Referral] Filled ${filled} field(s) across all sections`);
  }

  // =========================================================================
  // Save & Verify
  // =========================================================================

  /**
   * Click the Referral "Save" button and wait for the server response.
   *
   * There is no SweetAlert on this form — on success the component navigates
   * and the URL gains `?row_id={id}` (the id of the saved record), which is
   * the save signal.
   *
   * @returns The saved record `row_id` (e.g. "2846")
   * @throws Error if the URL never gains `?row_id=` after saving
   */
  async saveReferral(): Promise<string> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.saveButton.click({ timeout: 10_000 });

    // Success = URL gains ?row_id={id}
    const rowIdPattern = /row_id=(\d+)/;
    try {
      await this.page.waitForURL(rowIdPattern, { timeout: 25_000 });
    } catch {
      await this.page.screenshot({
        path: 'test-results/artifacts/referral-save-failed.png',
        fullPage: true,
      }).catch(() => {});
      throw new Error(
        '[Referral] Save did not complete — URL never gained ?row_id=. ' +
        `Current URL: ${this.page.url()}`,
      );
    }

    const rowId = this.page.url().match(rowIdPattern)?.[1] ?? 'unknown';
    console.log(`[Referral] ✅ Saved — record row_id=${rowId}`);
    // Give the Livewire re-render time to settle before verifying values.
    await this.waitForAnimation(2500);
    return rowId;
  }

  /**
   * Read back the current value of a Referral field. Used to verify a saved
   * value survived the save round-trip.
   */
  async getFieldValue(spec: FieldSpec): Promise<string> {
    const selector = this.fieldSelector(spec);
    return this.page.evaluate(({ selector, kind, id }) => {
      const root = document;

      if (kind === 'checkbox') {
        const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]#${id}`);
        if (!el || !el.checked) return '';
        const lbl = el.id ? root.querySelector(`label[for="${el.id}"]`) : null;
        return (lbl?.textContent || el.id || el.value || '').trim();
      }

      if (kind === 'select') {
        const el = root.querySelector<HTMLSelectElement>(selector);
        if (!el) return '';
        return el.selectedOptions[0]?.textContent?.trim() ?? '';
      }

      const el = root.querySelector<HTMLElement>(selector);
      if (!el) return '';
      return (el as HTMLInputElement).value || '';
    }, { selector, kind: spec.kind, id: spec.id ?? '' });
  }

  /**
   * Verify that key Referral values persisted after saving (the Livewire
   * re-render reflects server state, so a value that survived means it was
   * committed). Checks representative fields from every fill kind.
   *
   * @param data The filled scenario data
   * @throws Error listing every field whose value did not persist
   */
  async verifySavedValues(data: ReferralData): Promise<void> {
    // Representative fields covering every fill kind.
    const checks: Array<{ key: keyof ReferralData; spec: FieldSpec }> = [
      { key: 'referralDate', spec: FIELD_MAP.referralDate },
      { key: 'referralType', spec: FIELD_MAP.referralType },
      { key: 'referralHospitalId', spec: FIELD_MAP.referralHospitalId },
      { key: 'printMonthlyMedicalReport', spec: FIELD_MAP.printMonthlyMedicalReport },
      { key: 'printLabResult', spec: FIELD_MAP.printLabResult },
      { key: 'referralReason', spec: FIELD_MAP.referralReason },
      { key: 'completionDate', spec: FIELD_MAP.completionDate },
      { key: 'comments', spec: FIELD_MAP.comments },
    ];

    const missing: string[] = [];
    for (const { key, spec } of checks) {
      const expected = data[key];
      if (expected === undefined || expected === null || expected === '') continue;
      const actual = (await this.getFieldValue(spec)).trim().toLowerCase();
      const want = expected.trim().toLowerCase();
      if (!actual || !actual.includes(want)) {
        missing.push(`"${key}": expected "${expected}", got "${actual || '<empty>'}"`);
      } else {
        console.log(`[Referral] ✅ Saved value verified — ${key} = "${expected}"`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`[Referral] Saved values not persisted after save:\n  - ${missing.join('\n  - ')}`);
    }
  }
}
