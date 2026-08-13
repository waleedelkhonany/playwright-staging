import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { VascularAccessData } from '../data/vascular-access.data';

/**
 * VascularAccessPage — Page Object Model for the VASCULAR ACCESS ASSESSMENT
 * TOOL form.
 *
 * The form is reached from the visit edit page (`/visits/{id}/edit`) via the
 * "VASCULAR ACCESS ASSESSMENT TOOL" tab (`a#vascular-access-assessment-tab`,
 * href "load/visit-form/{id}/vascular-access-assessment"). Like the Patient
 * Assessment / Discontinue Of Hemodialysis tabs, it opens in a NEW browser tab
 * (target="_blank"), so this page object navigates directly to
 * `/load/visit-form/{visitId}/vascular-access-assessment` instead
 * (behaviorally equivalent, robust in headless runs).
 *
 * The form is a standalone Livewire component with NO `name` attributes.
 * Bindings are a MIX of two forms (verified on staging):
 *   - plain `wire:model="data.<path>"` — dates (avf_date,
 *     dressing_change_date, tego_change_date) and the low/moderate/high risk
 *     intervention checkboxes (low_continue_assessment, ...)
 *   - `wire:model.live="data.<path>"` — the access-type selects
 *     (access_type, avf_site), the access-type checkboxes (access_type_avf),
 *     ALL scoring checkboxes (b_redness_0, c_thrill_10, ...), and the
 *     post-care radios (dressing_applied, tego_changed)
 *
 * Locators therefore try the `wire:model` attribute AND the
 * `wire:model.live` attribute (a `[wire\:model="X"], [wire\:model\.live="X"]`
 * selector union) — a single `[wire\:model="X"]` selector misses the live
 * fields (they have NO plain wire:model attribute).
 *
 * Scoring checkboxes (b_*, c_*, d_*, e_*, f_*, g_*) carry `data-score` and
 * `data-group` attributes and are matched individually by their input `id`
 * (they have no label text). The total score input (`vascularTotalInput`,
 * `data.vascular_total_score`) is a read-only computed field and the
 * signature-image upload (`uploadFile`) opens a file dialog — both are
 * intentionally NOT part of the FIELD_MAP.
 *
 * On success the component navigates and the URL gains `?row_id={id}` (the
 * saved record id) — that URL change is the save signal (no SweetAlert on
 * this form, same as the Patient Assessment / Discontinuation).
 *
 * @example
 *   const vaPage = new VascularAccessPage(page);
 *   await vaPage.openVisitVascularAccess('1005'); // Visits dir → edit icon → form
 *   await vaPage.fillVascularAccessForm(data);    // access type + scoring + post-care
 *   const rowId = await vaPage.saveVascularAccess();
 *
 * @see config/config.json — vascularAccess.visitId (target visit)
 * @see config/vascular-access-scenarios/vascular-access.scenario.json — form payload
 */

/** How a Vascular Access field is filled. */
type FieldKind = 'text' | 'select' | 'checkbox' | 'radio';

/**
 * Map of VascularAccessData key → DOM field + fill kind.
 *
 * Every field is located by its `wire:model` / `wire:model.live` binding
 * (e.g. `data.access_type`). Checkboxes and radios are matched individually
 * by their input `id` (e.g. `b_redness_0`, `dressingYes`) in addition to the
 * binding.
 */
interface FieldSpec {
  /** The binding value (e.g. `data.access_type`); matched as wire:model OR wire:model.live */
  wire: string;
  kind: FieldKind;
  /** For checkboxes/radios: the input `id` to check (e.g. `b_redness_0`) */
  id?: string;
}

/**
 * Single source of truth mapping the data model to the real staging DOM
 * (verified via scripts/inspect-vascular-access.ts / probe on visit 1005).
 */
const FIELD_MAP: Record<keyof VascularAccessData, FieldSpec> = {
  // Access Type
  accessType:             { wire: 'data.access_type', kind: 'select' },
  avfSite:                { wire: 'data.avf_site', kind: 'select' },
  avfDate:                { wire: 'data.avf_date', kind: 'text' },
  accessTypeAvf:          { wire: 'data.access_type_avf', kind: 'checkbox', id: 'access_type_avf' },

  // K. Needle Insertion Assessment Tool (AVF/AVG) — scoring checkboxes
  bRedness:               { wire: 'data.b_redness_0', kind: 'checkbox', id: 'b_redness_0' },
  bSwelling:              { wire: 'data.b_swelling_0', kind: 'checkbox', id: 'b_swelling_0' },
  cThrill:                { wire: 'data.c_thrill_10', kind: 'checkbox', id: 'c_thrill_10' },
  cTemp:                  { wire: 'data.c_temp_0', kind: 'checkbox', id: 'c_temp_0' },
  cTenderness:            { wire: 'data.c_tenderness_0', kind: 'checkbox', id: 'c_tenderness_0' },
  dBruit:                 { wire: 'data.d_bruit_20', kind: 'checkbox', id: 'd_bruit_20' },
  eFunction:              { wire: 'data.e_function_clean_0', kind: 'checkbox', id: 'e_function_clean_0' },

  // Post-care
  dressingApplied:        { wire: 'data.dressing_applied', kind: 'radio', id: 'dressingYes' },
  dressingChangeDate:     { wire: 'data.dressing_change_date', kind: 'text' },
  tegoChanged:            { wire: 'data.tego_changed', kind: 'radio', id: 'tegoNo' },
  tegoChangeDate:         { wire: 'data.tego_change_date', kind: 'text' },

  // Interventions (low risk)
  lowContinueAssessment:  { wire: 'data.low_continue_assessment', kind: 'checkbox', id: 'low_continue_assessment' },
  lowDressingTechnique:   { wire: 'data.low_dressing_technique', kind: 'checkbox', id: 'low_dressing_technique' },
  lowEducateAccessCare:   { wire: 'data.low_educate_access_care', kind: 'checkbox', id: 'low_educate_access_care' },
};

export class VascularAccessPage extends BasePage {
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
   * Open the Vascular Access Assessment form of the given visit:
   *
   *   1. Open the Visits directory (`/visits`) and find the row whose first
   *      column equals the visit ID
   *   2. Click the edit icon (`fa-pen-to-square`, inside `a[title="Edit"]`)
   *      under the Actions column → `/visits/{id}/edit`
   *   3. Navigate directly to the Vascular Access Assessment form
   *      (`/load/visit-form/{id}/vascular-access-assessment`) — the "VASCULAR
   *      ACCESS ASSESSMENT TOOL" tab on the edit page opens exactly this URL
   *      in a new tab (`target="_blank"`), so navigating to it is equivalent.
   *
   * @param visitId The visit ID shown in the Visits directory (e.g. "1005")
   */
  async openVisitVascularAccess(visitId: string): Promise<void> {
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
    console.log(`[VascularAccess] Visit ${visitId} found — clicking edit icon...`);
    await editLink.click();

    await this.page.waitForURL(
      new RegExp(`/visits/${visitId}/edit`),
      { timeout: 20_000 },
    );
    await this.waitForPageLoad().catch(() => {});
    await this.waitForAnimation(1000);

    // 3. Vascular Access Assessment form (the tab opens this same URL in a new tab)
    console.log(`[VascularAccess] Opening Vascular Access Assessment form for visit ${visitId}...`);
    await this.goto(`/load/visit-form/${visitId}/vascular-access-assessment`);
    await this.waitForAnimation(2000);

    await this.saveButton.waitFor({ state: 'visible', timeout: 20_000 });
    console.log('[VascularAccess] Vascular Access Assessment form opened');
  }

  // =========================================================================
  // Form filling
  // =========================================================================

  /**
   * Build the CSS selector for a Vascular Access control from its binding.
   *
   * The form mixes plain `wire:model` and `wire:model.live` attributes, so the
   * selector is a UNION of both attribute forms — a single `[wire\:model="X"]`
   * would silently miss the live fields (e.g. `data.access_type` exists only
   * as `wire:model.live`).
   */
  private fieldSelector(spec: FieldSpec): string {
    return `[wire\\:model="${spec.wire}"], [wire\\:model\\.live="${spec.wire}"]`;
  }

  /**
   * Set a single Vascular Access field identified by its binding (plus its
   * input `id` for checkboxes/radios).
   *
   * Uses page.evaluate with native value setters + input/change events — the
   * same pattern proven for the Flow Sheet / Patient Assessment /
   * Discontinuation. Works for every binding mode on this form:
   *   - checkboxes → set checked + change/input (matched by id)
   *   - radios     → set checked + change/input (matched by id)
   *   - selects    → pick the option whose text matches, set value + change
   *   - text/date  → native setter + input/change
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

      if (kind === 'radio') {
        const el = root.querySelector<HTMLInputElement>(`input[type="radio"]#${id}`);
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
      throw new Error(`[VascularAccess] Could not set field "${spec.wire}" = "${value}"`);
    }
    // Small settle wait per field — `wire:model.live` fields sync on input and
    // the scoring checkboxes trigger Livewire re-renders (total score recompute).
    await this.waitForAnimation(120);
  }

  /**
   * Fill the Vascular Access Assessment form section by section from the
   * scenario data. Iterates the FIELD_MAP in DOM section order and sets every
   * field that has a value in `data` (empty/undefined = skip).
   *
   * The postcare radios (dressing_applied / tego_changed) are re-asserted at
   * the end: they carry `wire:change` handlers that trigger Livewire server
   * round-trips, and a round-trip fired by the FIRST radio can re-render with
   * the second radio's previous (unchecked) state and clobber it before Save.
   * Re-setting them as the LAST writes makes their change events the freshest
   * requests, so the server commits both.
   */
  async fillVascularAccessForm(data: VascularAccessData): Promise<void> {
    const entries = Object.entries(FIELD_MAP) as Array<[keyof VascularAccessData, FieldSpec]>;
    let filled = 0;

    for (const [key, spec] of entries) {
      const value = data[key];
      if (value === undefined || value === null || value === '') continue;
      await this.setField(spec, value);
      filled++;
    }

    // Re-assert the postcare radios LAST (see method docblock above).
    for (const key of ['dressingApplied', 'tegoChanged'] as Array<keyof VascularAccessData>) {
      const value = data[key];
      if (value === undefined || value === null || value === '') continue;
      await this.setField(FIELD_MAP[key], value);
      // Let the wire:change round-trip settle before the next write.
      await this.waitForAnimation(1500);
    }

    console.log(`[VascularAccess] Filled ${filled} field(s) across all sections (+2 postcare radio re-asserts)`);
  }

  // =========================================================================
  // Save & Verify
  // =========================================================================

  /**
   * Click the Vascular Access "Save" button and wait for the server response.
   *
   * There is no SweetAlert on this form — on success the component navigates
   * and the URL gains `?row_id={id}` (the id of the saved record), which is
   * the save signal.
   *
   * @returns The saved record `row_id` (e.g. "2825")
   * @throws Error if the URL never gains `?row_id=` after saving
   */
  async saveVascularAccess(): Promise<string> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.saveButton.click({ timeout: 10_000 });

    // Success = URL gains ?row_id={id}
    const rowIdPattern = /row_id=(\d+)/;
    try {
      await this.page.waitForURL(rowIdPattern, { timeout: 25_000 });
    } catch {
      await this.page.screenshot({
        path: 'test-results/artifacts/vascular-access-save-failed.png',
        fullPage: true,
      }).catch(() => {});
      throw new Error(
        '[VascularAccess] Save did not complete — URL never gained ?row_id=. ' +
        `Current URL: ${this.page.url()}`,
      );
    }

    const rowId = this.page.url().match(rowIdPattern)?.[1] ?? 'unknown';
    console.log(`[VascularAccess] ✅ Saved — record row_id=${rowId}`);
    // Give the Livewire re-render time to settle before verifying values.
    await this.waitForAnimation(2500);
    return rowId;
  }

  /**
   * Read back the current value of a Vascular Access field. Used to verify a
   * saved value survived the save round-trip.
   */
  async getFieldValue(spec: FieldSpec): Promise<string> {
    const selector = this.fieldSelector(spec);
    return this.page.evaluate(({ selector, kind, id }) => {
      const root = document;

      if (kind === 'checkbox') {
        const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]#${id}`);
        if (!el || !el.checked) return '';
        // Scoring checkboxes have no label — fall back to their id.
        const lbl = el.id ? root.querySelector(`label[for="${el.id}"]`) : null;
        return (lbl?.textContent || el.id || el.value || '').trim();
      }

      if (kind === 'radio') {
        const el = root.querySelector<HTMLInputElement>(`input[type="radio"]#${id}`);
        if (!el || !el.checked) return '';
        const lbl = el.id ? root.querySelector(`label[for="${el.id}"]`) : null;
        return (lbl?.textContent || el.value || '').trim();
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
   * Verify that key Vascular Access values persisted after saving (the
   * Livewire re-render reflects server state, so a value that survived means
   * it was committed). Checks representative fields from every fill kind.
   *
   * @param data The filled scenario data
   * @throws Error listing every field whose value did not persist
   */
  async verifySavedValues(data: VascularAccessData): Promise<void> {
    // Representative fields: a select, a live-bound scoring checkbox, a
    // radio, a plain wire:model date, and a low-risk intervention checkbox.
    const checks: Array<{ key: keyof VascularAccessData; spec: FieldSpec }> = [
      { key: 'accessType', spec: FIELD_MAP.accessType },
      { key: 'avfSite', spec: FIELD_MAP.avfSite },
      { key: 'bRedness', spec: FIELD_MAP.bRedness },
      { key: 'dressingApplied', spec: FIELD_MAP.dressingApplied },
      { key: 'dressingChangeDate', spec: FIELD_MAP.dressingChangeDate },
      { key: 'lowContinueAssessment', spec: FIELD_MAP.lowContinueAssessment },
      { key: 'tegoChanged', spec: FIELD_MAP.tegoChanged },
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
        console.log(`[VascularAccess] ✅ Saved value verified — ${key} = "${expected}"`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`[VascularAccess] Saved values not persisted after save:\n  - ${missing.join('\n  - ')}`);
    }
  }
}
