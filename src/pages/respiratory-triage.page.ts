import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { RespiratoryTriageData } from '../data/respiratory-triage.data';

/**
 * RespiratoryTriagePage — Page Object Model for the Respiratory Triage
 * Checklist form.
 *
 * Unlike the other visit-form tabs, the "Respiratory Triage" tab on the visit
 * edit page (`a#respiratory-triage-tab`, href
 * "load/visit-form/{id}/respiratory-triage") opens a LIST page, NOT a form.
 * The list page has an "Add New" button whose href is
 * `load/form/{patientId}/respiratory-triage?display=create` — a PATIENT-level
 * Livewire create form. This page object follows the exact user path:
 *
 *   1. /visits → find the visit row → click the edit icon
 *   2. Navigate to `/load/visit-form/{visitId}/respiratory-triage` (the tab)
 *   3. Click "Add New" → `/load/form/{patientId}/respiratory-triage?display=create`
 *
 * The form is a standalone Livewire component with NO `name` attributes —
 * every control is bound via `wire:model="data.<path>"` (plain, no .live
 * modifier). Field kinds found on staging: text/number inputs and radios.
 * Radios come in two flavors:
 *   - `data.dialysis` — has ids (`dialysis_yes` / `dialysis_no`) with labels
 *     "Yes"/"No"
 *   - `data.iso` / `data.er` / `data.opd` — NO ids, raw values "yes"/"no"
 *
 * On success (no SweetAlert) the component redirects and the URL changes from
 * `?display=create` to `?display=index` — the index list of saved records.
 * The saved record's id is read from the list (the newest row id), and
 * persistence is verified by clicking its Edit action
 * (`wire:click="changeDisplay('form',{id})"`), which navigates to
 * `?display=form&row_id={id}`, and reading representative values back.
 *
 * The hidden signature fields (nurse_signature_signed_by / _signed_at,
 * physician_signature_*, doctor_signature_*) are set by the signature pad and
 * are intentionally NOT part of the FIELD_MAP.
 *
 * @example
 *   const rtPage = new RespiratoryTriagePage(page);
 *   await rtPage.openVisitRespiratoryTriage('1005'); // Visits dir → edit icon → tab → Add New
 *   await rtPage.fillRespiratoryTriageForm(data);    // vitals + scores + signatures + disposition
 *   const rowId = await rtPage.saveRespiratoryTriage(); // ?display=create → ?display=index
 *   await rtPage.verifySavedValues(data, rowId);     // edit mode readback
 *
 * @see config/config.json — respiratoryTriage.visitId (target visit)
 * @see config/respiratory-triage-scenarios/respiratory-triage.scenario.json — form payload
 */

/** How a Respiratory Triage field is filled. */
type FieldKind = 'text' | 'radio';

/**
 * Map of RespiratoryTriageData key → DOM field + fill kind.
 *
 * Every field is located by its `wire:model` binding (e.g. `data.height`).
 * Radios are matched by their input `id` when present (e.g. `dialysis_yes`),
 * otherwise by value/label within the group (e.g. `data.iso` = "yes").
 */
interface FieldSpec {
  /** The `wire:model` binding value (e.g. `data.height`) */
  wire: string;
  kind: FieldKind;
  /** For id'd radios: the input `id` to check (e.g. `dialysis_yes`) */
  id?: string;
}

/**
 * Single source of truth mapping the data model to the real staging DOM
 * (verified via scripts/inspect-respiratory-triage-form.ts / probe on staging).
 */
const FIELD_MAP: Record<keyof RespiratoryTriageData, FieldSpec> = {
  // Triage info + vitals
  date:                { wire: 'data.date', kind: 'text' },
  height:              { wire: 'data.height', kind: 'text' },
  weight:              { wire: 'data.weight', kind: 'text' },
  temperature:         { wire: 'data.temperature', kind: 'text' },

  // Dialysis?
  dialysis:            { wire: 'data.dialysis', kind: 'radio', id: 'dialysis_yes' },

  // Symptom scores
  exposureScore:       { wire: 'data.exposure_score', kind: 'text' },
  feverPed:            { wire: 'data.fever_ped', kind: 'text' },
  feverAdult:          { wire: 'data.fever_adult', kind: 'text' },
  coughPed:            { wire: 'data.cough_ped', kind: 'text' },
  coughAdult:          { wire: 'data.cough_adult', kind: 'text' },
  sobPed:              { wire: 'data.sob_ped', kind: 'text' },
  sobAdult:            { wire: 'data.sob_adult', kind: 'text' },
  headachePed:         { wire: 'data.headache_ped', kind: 'text' },
  headacheAdult:       { wire: 'data.headache_adult', kind: 'text' },
  nauseaPed:           { wire: 'data.nausea_ped', kind: 'text' },
  nauseaAdult:         { wire: 'data.nausea_adult', kind: 'text' },
  chronicPed:          { wire: 'data.chronic_ped', kind: 'text' },
  chronicAdult:        { wire: 'data.chronic_adult', kind: 'text' },
  totalScore:          { wire: 'data.total_score', kind: 'text' },

  // Nurse signature
  nurseName:           { wire: 'data.nurse_name', kind: 'text' },
  nurseId:             { wire: 'data.nurse_id', kind: 'text' },

  // Physician signature
  physicianName:       { wire: 'data.physician_name', kind: 'text' },
  physicianId:         { wire: 'data.physician_id', kind: 'text' },

  // Disposition
  iso:                 { wire: 'data.iso', kind: 'radio' },
  er:                  { wire: 'data.er', kind: 'radio' },
  opd:                 { wire: 'data.opd', kind: 'radio' },

  // Doctor signature
  doctorName:          { wire: 'data.doctor_name', kind: 'text' },
  doctorId:            { wire: 'data.doctor_id', kind: 'text' },
};

export class RespiratoryTriagePage extends BasePage {
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
   * Open the Respiratory Triage create form for the given visit:
   *
   *   1. Open the Visits directory (`/visits`) and find the row whose first
   *      column equals the visit ID
   *   2. Click the edit icon (`fa-pen-to-square`, inside `a[title="Edit"]`)
   *      under the Actions column → `/visits/{id}/edit`
   *   3. Navigate to the Respiratory Triage tab
   *      (`/load/visit-form/{id}/respiratory-triage`) — a LIST page
   *   4. Click "Add New" → `/load/form/{patientId}/respiratory-triage?display=create`
   *      (the patient-level create form; the patient id comes from the href)
   *
   * @param visitId The visit ID shown in the Visits directory (e.g. "1005")
   */
  async openVisitRespiratoryTriage(visitId: string): Promise<void> {
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
    console.log(`[RespiratoryTriage] Visit ${visitId} found — clicking edit icon...`);
    await editLink.click();

    await this.page.waitForURL(
      new RegExp(`/visits/${visitId}/edit`),
      { timeout: 20_000 },
    );
    await this.waitForPageLoad().catch(() => {});
    await this.waitForAnimation(1000);

    // 3. Respiratory Triage tab → list page
    console.log(`[RespiratoryTriage] Opening Respiratory Triage tab for visit ${visitId}...`);
    await this.goto(`/load/visit-form/${visitId}/respiratory-triage`);
    await this.waitForAnimation(2000);

    // 4. Click "Add New" → patient-level create form
    const addNew = this.page.locator(
      'a.btn:has-text("Add New"), button:has-text("Add New")',
    ).first();
    await addNew.waitFor({ state: 'visible', timeout: 15_000 });
    const href = await addNew.getAttribute('href').catch(() => '');
    console.log(`[RespiratoryTriage] Add New href: ${href}`);
    if (href) {
      await this.goto(href);
    } else {
      await addNew.click();
    }
    await this.waitForAnimation(3000);

    await this.saveButton.waitFor({ state: 'visible', timeout: 20_000 });
    console.log('[RespiratoryTriage] Respiratory Triage create form opened');
  }

  // =========================================================================
  // Form filling
  // =========================================================================

  /**
   * Build the CSS selector for a Respiratory Triage control from its
   * `wire:model` binding, e.g. `[wire\:model="data.height"]`.
   */
  private fieldSelector(spec: FieldSpec): string {
    return `[wire\\:model="${spec.wire}"]`;
  }

  /**
   * Set a single Respiratory Triage field identified by its `wire:model`
   * binding (plus its input `id` for id'd radios).
   *
   * Uses page.evaluate with native value setters + input/change events — the
   * same pattern proven for the other visit-form POMs:
   *   - radios with an id  → check that id (dialysis_yes / dialysis_no)
   *   - radios without ids → check the radio whose value/label matches
   *     (data.iso / data.er / data.opd = "yes"/"no")
   *   - text/number inputs → native setter + input/change
   *
   * @throws Error if the control or the value cannot be found, so failures
   *               point at the exact field rather than a later assertion.
   */
  private async setField(spec: FieldSpec, value: string): Promise<void> {
    const base = this.fieldSelector(spec);
    const ok = await this.page.evaluate(({ base, value, kind, id }) => {
      const root = document;

      if (kind === 'radio') {
        let el: HTMLInputElement | null = null;
        if (id) {
          el = root.querySelector<HTMLInputElement>(`input[type="radio"]#${id}`);
        } else {
          const radios = Array.from(
            root.querySelectorAll<HTMLInputElement>(`input[type="radio"]${base}`),
          );
          el = radios.find((r) => r.value.toLowerCase() === value.toLowerCase())
            || radios.find((r) => {
              const lbl = r.id ? root.querySelector(`label[for="${r.id}"]`) : null;
              return (lbl?.textContent || '').trim().toLowerCase() === value.toLowerCase();
            }) || null;
        }
        if (!el) return false;
        el.checked = true;
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
      throw new Error(`[RespiratoryTriage] Could not set field "${spec.wire}" = "${value}"`);
    }
    // Small settle wait per field — Livewire `wire:model` fields sync on input.
    await this.waitForAnimation(100);
  }

  /**
   * Fill the Respiratory Triage form section by section from the scenario
   * data. Iterates the FIELD_MAP in DOM section order and sets every field
   * that has a value in `data` (empty/undefined = skip).
   */
  async fillRespiratoryTriageForm(data: RespiratoryTriageData): Promise<void> {
    const entries = Object.entries(FIELD_MAP) as Array<[keyof RespiratoryTriageData, FieldSpec]>;
    let filled = 0;

    for (const [key, spec] of entries) {
      const value = data[key];
      if (value === undefined || value === null || value === '') continue;
      await this.setField(spec, value);
      filled++;
    }

    console.log(`[RespiratoryTriage] Filled ${filled} field(s) across all sections`);
  }

  // =========================================================================
  // Save & Verify
  // =========================================================================

  /**
   * Click the Respiratory Triage "Save" button and wait for the server
   * response.
   *
   * There is no SweetAlert on this form — on success the component redirects
   * and the URL changes from `?display=create` to `?display=index` (the list
   * of saved Respiratory Triage records), which is the save signal.
   *
   * @returns The id of the saved record (the newest row in the index list)
   * @throws Error if the URL never leaves `?display=create` after saving
   */
  async saveRespiratoryTriage(): Promise<string> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.saveButton.click({ timeout: 10_000 });

    // Success = redirect to the index list (?display=index)
    try {
      await this.page.waitForURL(/display=index/, { timeout: 25_000 });
    } catch {
      await this.page.screenshot({
        path: 'test-results/artifacts/respiratory-triage-save-failed.png',
        fullPage: true,
      }).catch(() => {});
      throw new Error(
        '[RespiratoryTriage] Save did not complete — URL never changed to ?display=index. ' +
        `Current URL: ${this.page.url()}`,
      );
    }
    await this.waitForAnimation(2000);

    // Read the saved record id = the NEWEST row id in the index list.
    const rowId = await this.readNewestRowId();
    console.log(`[RespiratoryTriage] ✅ Saved — record row_id=${rowId}`);
    // Give the Livewire re-render time to settle before verifying values.
    await this.waitForAnimation(1500);
    return rowId;
  }

  /**
   * Read the newest row id from the Respiratory Triage index table (the list
   * page shown after save). Row ids are the first cell of each data row; the
   * newest record has the highest id, so the max numeric id is returned.
   */
  private async readNewestRowId(): Promise<string> {
    await this.page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15_000 });
    const ids = await this.page.evaluate(() => {
      const out: number[] = [];
      document.querySelectorAll('table tbody tr').forEach((row) => {
        const firstCell = row.querySelector('td:first-child');
        const val = parseInt(firstCell?.textContent?.trim() ?? '', 10);
        if (!Number.isNaN(val)) out.push(val);
      });
      return out;
    });
    if (ids.length === 0) {
      throw new Error('[RespiratoryTriage] No saved records found in the index list after save');
    }
    return String(Math.max(...ids));
  }

  /**
   * Read back the current value of a Respiratory Triage field. Used to verify
   * a saved value survived the save round-trip.
   */
  async getFieldValue(spec: FieldSpec): Promise<string> {
    const base = this.fieldSelector(spec);
    return this.page.evaluate(({ base, kind, id }) => {
      const root = document;

      if (kind === 'radio') {
        // The checked radio of the group; prefer its LABEL text (matches
        // scenario values like "Yes") and fall back to its value ("yes").
        const checked = root.querySelector<HTMLInputElement>(`input[type="radio"]${base}:checked`);
        if (!checked) return '';
        const lbl = checked.id ? root.querySelector(`label[for="${checked.id}"]`) : null;
        return (lbl?.textContent || checked.value || '').trim();
      }

      const el = root.querySelector<HTMLElement>(base);
      if (!el) return '';
      return (el as HTMLInputElement).value || '';
    }, { base, kind: spec.kind, id: spec.id ?? '' });
  }

  /**
   * Verify that key Respiratory Triage values persisted after saving.
   *
   * Opens the saved record in EDIT mode (click the row's Edit action →
   * `?display=form&row_id={id}`, the Livewire re-render reflects server state)
   * and reads back representative fields: a date, vitals, the dialysis radio,
   * a symptom score, and a disposition radio.
   *
   * @param data   The filled scenario data
   * @param rowId  The saved record id returned by saveRespiratoryTriage()
   * @throws Error listing every field whose value did not persist
   */
  async verifySavedValues(data: RespiratoryTriageData, rowId: string): Promise<void> {
    // Open the saved record in edit mode via the row's Edit action.
    const row = this.page.locator(
      `table tbody tr:has(td:first-child:text-is("${rowId}"))`,
    ).first();
    await row.waitFor({ state: 'visible', timeout: 15_000 });
    const editBtn = row.locator('button[title="Edit"], a[title="Edit"]').first();
    await editBtn.waitFor({ state: 'visible', timeout: 10_000 });
    console.log(`[RespiratoryTriage] Opening record ${rowId} in edit mode...`);
    await editBtn.click();
    await this.page.waitForURL(
      new RegExp(`row_id=${rowId}`),
      { timeout: 15_000 },
    );
    await this.waitForAnimation(2000);

    // Representative fields covering every fill kind.
    const checks: Array<{ key: keyof RespiratoryTriageData; spec: FieldSpec }> = [
      { key: 'date', spec: FIELD_MAP.date },
      { key: 'height', spec: FIELD_MAP.height },
      { key: 'temperature', spec: FIELD_MAP.temperature },
      { key: 'dialysis', spec: FIELD_MAP.dialysis },
      { key: 'sobAdult', spec: FIELD_MAP.sobAdult },
      { key: 'nurseName', spec: FIELD_MAP.nurseName },
      { key: 'iso', spec: FIELD_MAP.iso },
      { key: 'doctorName', spec: FIELD_MAP.doctorName },
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
        console.log(`[RespiratoryTriage] ✅ Saved value verified — ${key} = "${expected}"`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`[RespiratoryTriage] Saved values not persisted after save:\n  - ${missing.join('\n  - ')}`);
    }
  }
}
