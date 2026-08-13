import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { DiscontinuationData } from '../data/discontinuation.data';

/**
 * DiscontinuationPage — Page Object Model for the REFUSAL/DISCONTINUATION OF
 * HEMODIALYSIS SESSION/S form.
 *
 * The form is reached from the visit edit page (`/visits/{id}/edit`) via the
 * "Discontinue Of Hemodialysis" tab (`a#dis-of-hemodialysis-tab`, href
 * "load/visit-form/{id}/dis-of-hemodialysis"). Like the Patient Assessment
 * tab, it opens in a NEW browser tab (target="_blank"), so this page object
 * navigates directly to `/load/visit-form/{visitId}/dis-of-hemodialysis`
 * instead (behaviorally equivalent, robust in headless runs).
 *
 * The form is a standalone Livewire component. Every control is bound via
 * `wire:model="data.<path>"` (NO `name` attributes), so all locators are
 * `[wire\:model="..."]` attribute selectors.
 *
 * The form is BILINGUAL — each section is rendered twice (English `*_en`
 * bindings + Arabic `*_ar` bindings) and the save() handler persists both
 * sides. The scenario payload fills both.
 *
 * The patient header (name/MRN/DOB) is read-only and the signature-image
 * upload (`uploadFile` / `uploaded_media_id`) opens a file dialog — both are
 * intentionally NOT part of the FIELD_MAP.
 *
 * On success the component navigates and the URL gains `?row_id={id}` (the
 * saved record id) — that URL change is the save signal (no SweetAlert on
 * this form, same as the Patient Assessment).
 *
 * @example
 *   const discPage = new DiscontinuationPage(page);
 *   await discPage.openVisitDiscontinuation('1005'); // Visits dir → edit icon → form
 *   await discPage.fillDiscontinuationForm(data);    // every section, EN + AR
 *   const rowId = await discPage.saveDiscontinuation();
 *
 * @see config/config.json — visitId (target visit)
 * @see config/discontinuation-scenarios/discontinuation.scenario.json — form payload
 */

/** How a Discontinuation field is filled. */
type FieldKind = 'text' | 'textarea' | 'select' | 'checkbox' | 'datetime';

/**
 * Map of DiscontinuationData key → DOM field + fill kind.
 *
 * Every field is located by its `wire:model` binding
 * (e.g. `data.discontinue_reason_en`). Checkboxes are matched individually
 * by their input `id` (e.g. `Discontinuation`, `إيقاف`) in addition to the
 * binding, mirroring the Patient Assessment page object.
 */
interface FieldSpec {
  /** The `wire:model` binding value (e.g. `data.discontinue_reason_en`) */
  wire: string;
  kind: FieldKind;
  /** For checkboxes: the input `id` to check (e.g. `Discontinuation`) */
  id?: string;
}

/**
 * Single source of truth mapping the data model to the real staging DOM
 * (verified via scripts/inspect-discontinuation-form.ts / probe on visit 1005).
 */
const FIELD_MAP: Record<keyof DiscontinuationData, FieldSpec> = {
  // --- Reason / refusal — English side ---
  discontinueServicesEn:  { wire: 'data.discontinue_hemodialysis_services_en', kind: 'checkbox', id: 'Discontinuation' },
  examinationRefusalEn:   { wire: 'data.examination_refusal_en', kind: 'checkbox', id: 'Refusal' },
  discontinueReasonEn:    { wire: 'data.discontinue_reason_en', kind: 'textarea' },
  hyperkalemiaEn:         { wire: 'data.hyperkalemia_en', kind: 'checkbox', id: 'Hyperkalemia' },
  cardiacEn:              { wire: 'data.cardiac_en', kind: 'checkbox', id: 'Cardiac' },
  pulmonaryEn:            { wire: 'data.pulmonary_en', kind: 'checkbox', id: 'Pulmonary' },
  acidosisEn:             { wire: 'data.acidosis_en', kind: 'checkbox', id: 'Acidosis' },
  othersEn:               { wire: 'data.others_en', kind: 'textarea' },

  // --- Witness Information — English side ---
  witnessNameEn:          { wire: 'data.witness_signature_signature_name', kind: 'text' },
  witnessRelationshipEn:  { wire: 'data.witness_relationship_en', kind: 'select' },
  witnessDatetimeEn:      { wire: 'data.witness_datetime_en', kind: 'datetime' },
  witnessAddressEn:       { wire: 'data.witness_address_en', kind: 'text' },

  // --- Reason why patient is unable to sign — English side ---
  inabilityReasonEn:      { wire: 'data.inability_reason_en', kind: 'textarea' },

  // --- Relative Information — English side ---
  relativeNameEn:         { wire: 'data.relative_signature_signature_name', kind: 'text' },
  relativeRelationEn:     { wire: 'data.relative_relation_en', kind: 'select' },
  relativeDatetimeEn:     { wire: 'data.relative_datetime_en', kind: 'datetime' },

  // --- Doctor Information — English side ---
  doctorNameEn:           { wire: 'data.doctor_name_en', kind: 'text' },
  doctorDatetimeEn:       { wire: 'data.doctor_datetime_en', kind: 'datetime' },

  // --- Interpreter Information — English side ---
  interpreterNameEn:      { wire: 'data.interpreter_signature_signature_name', kind: 'text' },
  interpreterDatetimeEn:  { wire: 'data.interpreter_datetime_en', kind: 'datetime' },

  // --- Reason / refusal — Arabic side ---
  discontinueServicesAr:  { wire: 'data.discontinue_hemodialysis_services_ar', kind: 'checkbox', id: 'إيقاف' },
  examinationRefusalAr:   { wire: 'data.examination_refusal_ar', kind: 'checkbox', id: 'رفض' },
  discontinueReasonAr:    { wire: 'data.discontinue_reason_ar', kind: 'textarea' },
  hyperkalemiaAr:         { wire: 'data.hyperkalemia_ar', kind: 'checkbox', id: 'الدم' },
  cardiacAr:              { wire: 'data.cardiac_ar', kind: 'checkbox', id: 'القلب' },
  pulmonaryAr:            { wire: 'data.pulmonary_ar', kind: 'checkbox', id: 'رئوية' },
  acidosisAr:             { wire: 'data.acidosis_ar', kind: 'checkbox', id: 'حموضة' },
  othersAr:               { wire: 'data.others_ar', kind: 'textarea' },

  // --- Witness Information — Arabic side ---
  witnessNameAr:          { wire: 'data.witness_signature_ar_signature_name', kind: 'text' },
  witnessRelationshipAr:  { wire: 'data.witness_relationship_ar', kind: 'select' },
  witnessDatetimeAr:      { wire: 'data.witness_datetime_ar', kind: 'datetime' },
  witnessAddressAr:       { wire: 'data.witness_address_ar', kind: 'text' },

  // --- Reason why patient is unable to sign — Arabic side ---
  inabilityReasonAr:      { wire: 'data.inability_reason_ar', kind: 'textarea' },

  // --- Relative Information — Arabic side ---
  relativeNameAr:         { wire: 'data.relative_signature_ar_signature_name', kind: 'text' },
  relativeRelationAr:     { wire: 'data.relative_relation_ar', kind: 'select' },
  relativeDatetimeAr:     { wire: 'data.relative_datetime_ar', kind: 'datetime' },

  // --- Doctor Information — Arabic side ---
  doctorNameAr:           { wire: 'data.doctor_name_ar', kind: 'text' },
  doctorDatetimeAr:       { wire: 'data.doctor_datetime_ar', kind: 'datetime' },

  // --- Interpreter Information — Arabic side ---
  interpreterNameAr:      { wire: 'data.interpreter_signature_ar_signature_name', kind: 'text' },
  interpreterDatetimeAr:  { wire: 'data.interpreter_datetime_ar', kind: 'datetime' },
};

export class DiscontinuationPage extends BasePage {
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
   * Open the Discontinue Of Hemodialysis form of the given visit:
   *
   *   1. Open the Visits directory (`/visits`) and find the row whose first
   *      column equals the visit ID
   *   2. Click the edit icon (`fa-pen-to-square`, inside `a[title="Edit"]`)
   *      under the Actions column → `/visits/{id}/edit`
   *   3. Navigate directly to the Discontinue Of Hemodialysis form
   *      (`/load/visit-form/{id}/dis-of-hemodialysis`) — the "Discontinue Of
   *      Hemodialysis" tab on the edit page opens exactly this URL in a new
   *      tab (`target="_blank"`), so navigating to it is equivalent.
   *
   * @param visitId The visit ID shown in the Visits directory (e.g. "1005")
   */
  async openVisitDiscontinuation(visitId: string): Promise<void> {
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
    console.log(`[Discontinuation] Visit ${visitId} found — clicking edit icon...`);
    await editLink.click();

    await this.page.waitForURL(
      new RegExp(`/visits/${visitId}/edit`),
      { timeout: 20_000 },
    );
    await this.waitForPageLoad().catch(() => {});
    await this.waitForAnimation(1000);

    // 3. Discontinue Of Hemodialysis form (the tab opens this same URL in a new tab)
    console.log(`[Discontinuation] Opening Discontinue Of Hemodialysis form for visit ${visitId}...`);
    await this.goto(`/load/visit-form/${visitId}/dis-of-hemodialysis`);
    await this.waitForAnimation(2000);

    await this.saveButton.waitFor({ state: 'visible', timeout: 20_000 });
    console.log('[Discontinuation] Discontinue Of Hemodialysis form opened');
  }

  // =========================================================================
  // Form filling
  // =========================================================================

  /**
   * Build the CSS selector for a Discontinuation control from its
   * `wire:model` binding, e.g. `[wire\:model="data.discontinue_reason_en"]`.
   */
  private fieldSelector(spec: FieldSpec): string {
    return `[wire\\:model="${spec.wire}"]`;
  }

  /**
   * Set a single Discontinuation field identified by its `wire:model`
   * binding (plus its input `id` for checkboxes).
   *
   * Uses page.evaluate with native value setters + input/change events — the
   * same pattern proven for the Flow Sheet and the Patient Assessment. Works
   * for every binding mode on this form:
   *   - checkboxes → set checked + change/input (matched by id)
   *   - selects    → pick the option whose text matches, set value + change
   *   - text/number/textarea/datetime-local → native setter + input/change
   *
   * @throws Error if the control or the value cannot be found, so failures
   *               point at the exact field rather than a later assertion.
   */
  private async setField(spec: FieldSpec, value: string): Promise<void> {
    const base = this.fieldSelector(spec);
    const ok = await this.page.evaluate(({ base, value, kind, id }) => {
      const root = document;

      if (kind === 'checkbox') {
        const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]${base}#${id}`);
        if (!el) return false;
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      if (kind === 'select') {
        const el = root.querySelector<HTMLSelectElement>(base);
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

      const el = root.querySelector<HTMLElement>(base);
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
    }, { base, value, kind: spec.kind, id: spec.id ?? '' });

    if (!ok) {
      throw new Error(`[Discontinuation] Could not set field "${spec.wire}" = "${value}"`);
    }
    // Small settle wait per field — Livewire `wire:model` live fields sync
    // on input.
    await this.waitForAnimation(100);
  }

  /**
   * Fill the Discontinue Of Hemodialysis form section by section from the
   * scenario data (both the EN and AR sides). Iterates the FIELD_MAP in DOM
   * section order and sets every field that has a value in `data`
   * (empty/undefined = skip).
   */
  async fillDiscontinuationForm(data: DiscontinuationData): Promise<void> {
    const entries = Object.entries(FIELD_MAP) as Array<[keyof DiscontinuationData, FieldSpec]>;
    let filled = 0;

    for (const [key, spec] of entries) {
      const value = data[key];
      if (value === undefined || value === null || value === '') continue;
      await this.setField(spec, value);
      filled++;
    }

    console.log(`[Discontinuation] Filled ${filled} field(s) across all sections (EN + AR)`);
  }

  // =========================================================================
  // Save & Verify
  // =========================================================================

  /**
   * Click the Discontinuation "Save" button and wait for the server
   * response.
   *
   * There is no SweetAlert on this form — on success the component navigates
   * and the URL gains `?row_id={id}` (the id of the saved record), which is
   * the save signal.
   *
   * @returns The saved record `row_id` (e.g. "2823")
   * @throws Error if the URL never gains `?row_id=` after saving
   */
  async saveDiscontinuation(): Promise<string> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.saveButton.click({ timeout: 10_000 });

    // Success = URL gains ?row_id={id}
    const rowIdPattern = /row_id=(\d+)/;
    try {
      await this.page.waitForURL(rowIdPattern, { timeout: 25_000 });
    } catch {
      await this.page.screenshot({
        path: 'test-results/artifacts/discontinuation-save-failed.png',
        fullPage: true,
      }).catch(() => {});
      throw new Error(
        '[Discontinuation] Save did not complete — URL never gained ?row_id=. ' +
        `Current URL: ${this.page.url()}`,
      );
    }

    const rowId = this.page.url().match(rowIdPattern)?.[1] ?? 'unknown';
    console.log(`[Discontinuation] ✅ Saved — record row_id=${rowId}`);
    // Give the Livewire re-render time to settle before verifying values.
    await this.waitForAnimation(2500);
    return rowId;
  }

  /**
   * Read back the current value of a Discontinuation field (by its
   * `wire:model` binding). Used to verify a saved value survived the save
   * round-trip.
   */
  async getFieldValue(spec: FieldSpec): Promise<string> {
    const base = this.fieldSelector(spec);
    return this.page.evaluate(({ base, kind, id }) => {
      const root = document;

      if (kind === 'checkbox') {
        const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]${base}#${id}`);
        if (!el || !el.checked) return '';
        const lbl = el.id ? root.querySelector(`label[for="${el.id}"]`) : null;
        return (lbl?.textContent || el.value || '').trim();
      }

      if (kind === 'select') {
        const el = root.querySelector<HTMLSelectElement>(base);
        if (!el) return '';
        return el.selectedOptions[0]?.textContent?.trim() ?? '';
      }

      const el = root.querySelector<HTMLElement>(base);
      if (!el) return '';
      return (el as HTMLInputElement).value || '';
    }, { base, kind: spec.kind, id: spec.id ?? '' });
  }

  /**
   * Verify that key Discontinuation values persisted after saving (the
   * Livewire re-render reflects server state, so a value that survived means
   * it was committed). Checks representative fields from both the EN and AR
   * sides.
   *
   * @param data The filled scenario data
   * @throws Error listing every field whose value did not persist
   */
  async verifySavedValues(data: DiscontinuationData): Promise<void> {
    // Representative fields: EN checkbox, EN textarea, EN select, EN text,
    // AR checkbox, AR select — covering every fill kind + both languages.
    const checks: Array<{ key: keyof DiscontinuationData; spec: FieldSpec }> = [
      { key: 'discontinueServicesEn', spec: FIELD_MAP.discontinueServicesEn },
      { key: 'discontinueReasonEn', spec: FIELD_MAP.discontinueReasonEn },
      { key: 'witnessRelationshipEn', spec: FIELD_MAP.witnessRelationshipEn },
      { key: 'doctorNameEn', spec: FIELD_MAP.doctorNameEn },
      { key: 'inabilityReasonEn', spec: FIELD_MAP.inabilityReasonEn },
      { key: 'discontinueServicesAr', spec: FIELD_MAP.discontinueServicesAr },
      { key: 'witnessRelationshipAr', spec: FIELD_MAP.witnessRelationshipAr },
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
        console.log(`[Discontinuation] ✅ Saved value verified — ${key} = "${expected}"`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`[Discontinuation] Saved values not persisted after save:\n  - ${missing.join('\n  - ')}`);
    }
  }
}
