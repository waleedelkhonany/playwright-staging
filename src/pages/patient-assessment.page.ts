import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { PatientAssessmentData } from '../data/patient-assessment.data';

/**
 * PatientAssessmentPage — Page Object Model for the Patient Assessment form.
 *
 * The Patient Assessment form is reached from the visit edit page
 * (`/visits/{id}/edit`) via the "Patient Assessment" tab
 * (`a#patient-assessment-tab`, `href="load/visit-form/{id}/patient-assessment"`).
 * That tab has `target="_blank"` — it opens the form in a NEW browser tab —
 * so this page object navigates directly to
 * `/load/visit-form/{visitId}/patient-assessment` instead (behaviorally
 * equivalent, and far more robust in headless runs).
 *
 * The form is a standalone Livewire component. Unlike the Flow Sheet, every
 * control is bound via `wire:model="data.<path>"` (NO `name` attributes), so
 * all locators are `[wire\:model="..."]` attribute selectors.
 *
 * Fields that come pre-filled from the Flow Sheet of the same visit are
 * READ-ONLY (bp_sys, bp_dias, temp, spo2, respiratory_rate, pulse_rate,
 * pain_score, location, duration, height, weight, designation) and are
 * intentionally NOT part of the FIELD_MAP — the page object never touches
 * them.
 *
 * On success the component navigates and the URL gains `?row_id={id}` (the
 * saved Patient Assessment record id) — that URL change is the save signal
 * (there is no SweetAlert on this form, unlike the Flow Sheet).
 *
 * @example
 *   const paPage = new PatientAssessmentPage(page);
 *   await paPage.openVisitPatientAssessment('1005'); // Visits dir → edit icon → form
 *   await paPage.fillPatientAssessmentForm(data);    // section by section
 *   const rowId = await paPage.savePatientAssessment();
 *
 * @see config/config.json — visitId (target visit)
 * @see config/patient-assessment-scenarios/patient-assessment.scenario.json — form payload
 */

/** How a Patient Assessment field is filled. */
type FieldKind = 'text' | 'textarea' | 'radio' | 'checkbox';

/**
 * Map of PatientAssessmentData key → DOM field + fill kind.
 *
 * Every field is located by its `wire:model` binding
 * (e.g. `data.assessment.patient_alert`). Checkboxes are grouped under one
 * binding (`data.assessment.mental_status`, `data.referral.*`) and are
 * matched individually by their input `id` (e.g. `Oriented`,
 * `disaster_planning`).
 */
interface FieldSpec {
  /** The `wire:model` binding value (e.g. `data.assessment.patient_alert`) */
  wire: string;
  kind: FieldKind;
  /** For checkboxes: the input `id` to check (e.g. `Oriented`) */
  id?: string;
}

/**
 * Single source of truth mapping the data model to the real staging DOM
 * (verified via scripts/inspect-patient-assessment.ts / probe on visit 1005).
 * Read-only fields (vitals, pain score, height, weight, designation) are
 * deliberately absent.
 */
const FIELD_MAP: Record<keyof PatientAssessmentData, FieldSpec> = {
  // Patient Information
  allergy:                { wire: 'data.allergy', kind: 'textarea' },

  // Assessment
  initialAssessment:      { wire: 'data.initial_assessment', kind: 'radio' },
  mentalStatus:           { wire: 'data.assessment.mental_status', kind: 'checkbox', id: 'Oriented' },
  patientAlert:           { wire: 'data.assessment.patient_alert', kind: 'radio' },
  caregiver:              { wire: 'data.assessment.caregiver', kind: 'radio' },
  typeOfPain:             { wire: 'data.assessment.type_of_pain', kind: 'text' },
  ambulatoryStatus:       { wire: 'data.assessment.ambulatory_status', kind: 'text' },
  distance:               { wire: 'data.assessment.distance', kind: 'text' },
  device:                 { wire: 'data.assessment.device', kind: 'text' },
  lungAuscultation:       { wire: 'data.assessment.lung_ausculation', kind: 'text' },
  oxygenUse:              { wire: 'data.assessment.oxygen_use_radio', kind: 'radio' },
  oxygenUseText:          { wire: 'data.assessment.oxygen_use_text', kind: 'text' },
  litPerMinute:           { wire: 'data.assessment.lit_per_minute', kind: 'text' },
  weightLoss:             { wire: 'data.assessment.weight_loss', kind: 'radio' },
  weightLossAmount:       { wire: 'data.assessment.weight_loss_amount', kind: 'text' },
  appetite:               { wire: 'data.assessment.appetite', kind: 'text' },
  diet:                   { wire: 'data.assessment.diet', kind: 'text' },

  // Medical History
  medicalHistory:         { wire: 'data.medical_surgical_history.medical_history', kind: 'textarea' },
  motherMedicalHistory:   { wire: 'data.medical_surgical_history.mother_medical_history', kind: 'text' },
  fatherMedicalHistory:   { wire: 'data.medical_surgical_history.father_medical_history', kind: 'text' },
  medicationHistory:      { wire: 'data.medical_surgical_history.medication_history', kind: 'textarea' },
  equipmentG1:            { wire: 'data.medical_surgical_history.contraptions_equipment_g1', kind: 'radio' },
  equipmentG2:            { wire: 'data.medical_surgical_history.contraptions_equipment_g2', kind: 'radio' },

  // Surgical History (row 0)
  surgicalHistory:        { wire: 'data.surgical_history.0.surgical_history', kind: 'text' },
  surgicalPlace:          { wire: 'data.surgical_history.0.performed_place', kind: 'text' },

  // Social History
  livingSituation:        { wire: 'data.social_hostory.livingSituation', kind: 'radio' },
  indivWithPatient:       { wire: 'data.social_hostory.indiv_with_patient', kind: 'text' },
  dwellingType:           { wire: 'data.social_hostory.dwellingType', kind: 'radio' },
  floor:                  { wire: 'data.social_hostory.floor', kind: 'text' },
  room:                   { wire: 'data.social_hostory.room', kind: 'text' },
  elevator:               { wire: 'data.social_hostory.Elevator', kind: 'radio' },
  primaryCaregiver:       { wire: 'data.social_hostory.primary_caregiver', kind: 'text' },
  avaAssistPatient:       { wire: 'data.social_hostory.ava_assist_patient', kind: 'text' },
  caregiverInstructions:  { wire: 'data.social_hostory.caregiver_recieve_instruction', kind: 'radio' },
  patientPrimaryLang:     { wire: 'data.social_hostory.pr_pa_lang', kind: 'text' },
  patientSecondaryLang:   { wire: 'data.social_hostory.sec_pa_lang', kind: 'text' },
  religion:               { wire: 'data.social_hostory.religion', kind: 'text' },
  familyPrimaryLang:      { wire: 'data.social_hostory.pr_fam_lang', kind: 'text' },
  familySecondaryLang:    { wire: 'data.social_hostory.sec_fam_lang', kind: 'text' },
  hobbies:                { wire: 'data.social_hostory.hobbies', kind: 'text' },
  occupationHistory:      { wire: 'data.social_hostory.pa_occ_history', kind: 'text' },

  // Referral (checkboxes)
  referralDisasterPlanning: { wire: 'data.referral.disaster_planning', kind: 'checkbox', id: 'disaster_planning' },
  referralSocialWorker:     { wire: 'data.referral.social_worker', kind: 'checkbox', id: 'social_worker' },
  referralAlliedHealth:     { wire: 'data.referral.allied_health_professionals', kind: 'checkbox', id: 'allied_health_professionals' },

  // History Given By
  historyGivenBy:         { wire: 'data.history_given_by', kind: 'text' },
  relationshipToPatient:  { wire: 'data.relationship_to_patient', kind: 'text' },
};

export class PatientAssessmentPage extends BasePage {
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
   * Open the Patient Assessment form of the given visit:
   *
   *   1. Open the Visits directory (`/visits`) and find the row whose first
   *      column equals the visit ID
   *   2. Click the edit icon (`fa-pen-to-square`, inside `a[title="Edit"]`)
   *      under the Actions column → `/visits/{id}/edit`
   *   3. Navigate directly to the Patient Assessment form
   *      (`/load/visit-form/{id}/patient-assessment`) — the "Patient
   *      Assessment" tab on the edit page opens exactly this URL in a new tab
   *      (`target="_blank"`), so navigating to it is equivalent.
   *
   * @param visitId The visit ID shown in the Visits directory (e.g. "1005")
   */
  async openVisitPatientAssessment(visitId: string): Promise<void> {
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
    console.log(`[PatientAssessment] Visit ${visitId} found — clicking edit icon...`);
    await editLink.click();

    await this.page.waitForURL(
      new RegExp(`/visits/${visitId}/edit`),
      { timeout: 20_000 },
    );
    await this.waitForPageLoad().catch(() => {});
    await this.waitForAnimation(1000);

    // 3. Patient Assessment form (the tab opens this same URL in a new tab)
    console.log(`[PatientAssessment] Opening Patient Assessment form for visit ${visitId}...`);
    await this.goto(`/load/visit-form/${visitId}/patient-assessment`);
    await this.waitForAnimation(2000);

    await this.saveButton.waitFor({ state: 'visible', timeout: 20_000 });
    console.log('[PatientAssessment] Patient Assessment form opened');
  }

  // =========================================================================
  // Form filling
  // =========================================================================

  /**
   * Build the CSS selector for a Patient Assessment control from its
   * `wire:model` binding, e.g. `[wire\:model="data.allergy"]`.
   */
  private fieldSelector(spec: FieldSpec): string {
    return `[wire\\:model="${spec.wire}"]`;
  }

  /**
   * Set a single Patient Assessment field identified by its `wire:model`
   * binding (plus its input `id` for checkboxes).
   *
   * Uses page.evaluate with native value setters + input/change events — the
   * same pattern proven for the Flow Sheet. Works for every binding mode on
   * this form:
   *   - `wire:model` radios   → set checked + change/input (matched by value
   *     or label text)
   *   - `wire:model` checkboxes → set checked + change/input (matched by id)
   *   - `wire:model` text/number/textarea → native setter + input/change
   *
   * @throws Error if the control or the value cannot be found, so failures
   *               point at the exact field rather than a later assertion.
   */
  private async setField(spec: FieldSpec, value: string): Promise<void> {
    const base = this.fieldSelector(spec);
    const ok = await this.page.evaluate(({ base, value, kind, id }) => {
      const root = document;

      if (kind === 'radio') {
        const radios = Array.from(
          root.querySelectorAll<HTMLInputElement>(`input[type="radio"]${base}`),
        );
        const target = radios.find((r) => r.value.toLowerCase() === value.toLowerCase())
          || radios.find((r) => {
            const lbl = r.id ? root.querySelector(`label[for="${r.id}"]`) : null;
            return (lbl?.textContent || '').trim().toLowerCase() === value.toLowerCase();
          });
        if (!target) return false;
        target.checked = true;
        target.dispatchEvent(new Event('change', { bubbles: true }));
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      if (kind === 'checkbox') {
        const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]${base}#${id}`);
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
      throw new Error(`[PatientAssessment] Could not set field "${spec.wire}" = "${value}"`);
    }
    // Small settle wait per field — Livewire `wire:model` live fields sync
    // on input.
    await this.waitForAnimation(100);
  }

  /**
   * Fill the Patient Assessment form section by section from the scenario
   * data. Iterates the FIELD_MAP in DOM section order and sets every field
   * that has a value in `data` (empty/undefined = skip).
   */
  async fillPatientAssessmentForm(data: PatientAssessmentData): Promise<void> {
    const entries = Object.entries(FIELD_MAP) as Array<[keyof PatientAssessmentData, FieldSpec]>;
    let filled = 0;

    for (const [key, spec] of entries) {
      const value = data[key];
      if (value === undefined || value === null || value === '') continue;
      await this.setField(spec, value);
      filled++;
    }

    console.log(`[PatientAssessment] Filled ${filled} field(s) across all sections`);
  }

  // =========================================================================
  // Save & Verify
  // =========================================================================

  /**
   * Click the Patient Assessment "Save" button and wait for the server
   * response.
   *
   * Unlike the Flow Sheet there is no SweetAlert here — on success the
   * component navigates and the URL gains `?row_id={id}` (the id of the
   * saved Patient Assessment record), which is the save signal.
   *
   * @returns The saved assessment `row_id` (e.g. "2820")
   * @throws Error if the URL never gains `?row_id=` after saving
   */
  async savePatientAssessment(): Promise<string> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.saveButton.click({ timeout: 10_000 });

    // Success = URL gains ?row_id={id}
    const rowIdPattern = /row_id=(\d+)/;
    try {
      await this.page.waitForURL(rowIdPattern, { timeout: 25_000 });
    } catch {
      await this.page.screenshot({
        path: 'test-results/artifacts/patient-assessment-save-failed.png',
        fullPage: true,
      }).catch(() => {});
      throw new Error(
        '[PatientAssessment] Save did not complete — URL never gained ?row_id=. ' +
        `Current URL: ${this.page.url()}`,
      );
    }

    const rowId = this.page.url().match(rowIdPattern)?.[1] ?? 'unknown';
    console.log(`[PatientAssessment] ✅ Saved — assessment row_id=${rowId}`);
    // Give the Livewire re-render time to settle before verifying values.
    await this.waitForAnimation(2500);
    return rowId;
  }

  /**
   * Read back the current value of a Patient Assessment field (by its
   * `wire:model` binding). Used to verify a saved value survived the save
   * round-trip.
   */
  async getFieldValue(spec: FieldSpec): Promise<string> {
    const base = this.fieldSelector(spec);
    return this.page.evaluate(({ base, kind, id }) => {
      const root = document;

      if (kind === 'radio') {
        const checked = root.querySelector<HTMLInputElement>(`input[type="radio"]${base}:checked`);
        if (!checked) return '';
        // Prefer the checked radio's LABEL text (matches scenario values like
        // "Never") and fall back to its value (e.g. "flat").
        const lbl = checked.id ? root.querySelector(`label[for="${checked.id}"]`) : null;
        return (lbl?.textContent || '').trim() || checked.value || '';
      }

      if (kind === 'checkbox') {
        const el = root.querySelector<HTMLInputElement>(`input[type="checkbox"]${base}#${id}`);
        if (!el || !el.checked) return '';
        const lbl = el.id ? root.querySelector(`label[for="${el.id}"]`) : null;
        return (lbl?.textContent || el.value || '').trim();
      }

      const el = root.querySelector<HTMLElement>(base);
      if (!el) return '';
      return (el as HTMLInputElement).value || '';
    }, { base, kind: spec.kind, id: spec.id ?? '' });
  }

  /**
   * Verify that key Patient Assessment values persisted after saving (the
   * Livewire re-render reflects server state, so a value that survived means
   * it was committed).
   *
   * @param data The filled scenario data
   * @throws Error listing every field whose value did not persist
   */
  async verifySavedValues(data: PatientAssessmentData): Promise<void> {
    // Representative fields: a textarea, a radio by label, a radio by value,
    // a free-text input, and a checkbox.
    const checks: Array<{ key: keyof PatientAssessmentData; spec: FieldSpec }> = [
      { key: 'allergy', spec: FIELD_MAP.allergy },
      { key: 'patientAlert', spec: FIELD_MAP.patientAlert },
      { key: 'dwellingType', spec: FIELD_MAP.dwellingType },
      { key: 'medicationHistory', spec: FIELD_MAP.medicationHistory },
      { key: 'relationshipToPatient', spec: FIELD_MAP.relationshipToPatient },
      { key: 'mentalStatus', spec: FIELD_MAP.mentalStatus },
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
        console.log(`[PatientAssessment] ✅ Saved value verified — ${key} = "${expected}"`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`[PatientAssessment] Saved values not persisted after save:\n  - ${missing.join('\n  - ')}`);
    }
  }
}
