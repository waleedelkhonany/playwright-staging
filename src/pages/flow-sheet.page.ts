import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { FlowSheetData } from '../data/flow-sheet.data';

/**
 * FlowSheetPage — Page Object Model for the Flow Sheet form.
 *
 * The Flow Sheet lives on the visit edit page (`/visits/{id}/edit` → "Flow
 * Sheet" tab, `#flowsheet`), as a single Livewire component
 * (`patients::flowsheet`). The component renders the form as sections
 * (Outside Dialysis, Machines, Pain Assessment, Fall Risk Assessment,
 * Pre-Treatment Vascular Access, Alarms Test, Pre-Treatment Vitals, Nursing
 * Action, Dialysis Parameters, Dialysis Medications, Post-Treatment Vascular
 * Access, Post Treatment Assessment) with ONE Save button at the bottom
 * (`wire:click="save"`) that persists the whole form.
 *
 * Fields are a mix of:
 *   - `wire:model.defer` radios  (e.g. `meta[outside_dialysis]`) — synced
 *     into the Livewire state on change
 *   - `wire:model` live inputs   (e.g. `meta[pre_treatment_vital][height]`) —
 *     synced on input
 *   - name-only inputs/selects   (e.g. `meta[vascular_access_pre][access_type]`)
 *     — read by the save() handler from the request `meta` payload
 *
 * All of them are set with a native value setter + input/change events via
 * page.evaluate (the proven pattern from PatientsPage / PhysicianOrdersPage),
 * which Livewire picks up regardless of binding mode. Verified empirically
 * that a live wire:model sync (height) does NOT reset previously-filled
 * name-only fields.
 *
 * On success the component shows a SweetAlert2 popup "Flow sheet saved
 * successfully!" (its Yes/No/Cancel buttons are hidden — it auto-dismisses
 * after a few seconds). A failed save shows a "Validation failed: ..." popup
 * with the server's message.
 *
 * @example
 *   const flowSheetPage = new FlowSheetPage(page);
 *   await flowSheetPage.openVisitFlowSheet('981');   // Visits dir → edit icon → Flow Sheet tab
 *   await flowSheetPage.fillFlowSheetForm(data);     // section by section
 *   const result = await flowSheetPage.saveFlowSheet();
 *
 * @see config/config.json — visitId (target visit)
 * @see config/flow-sheet-scenarios/flow-sheet.scenario.json — form payload
 */

/** How a Flow Sheet field is filled. */
type FieldKind = 'text' | 'select' | 'radio' | 'textarea';

/**
 * Map of FlowSheetData key → DOM field + fill kind.
 *
 * Every field is located by its `name` attribute (e.g. `meta[pain_assessment][location]`)
 * EXCEPT the Post Treatment Assessment table (`table-compact`), whose controls have
 * NO `name` attribute — they are bound via `wire:model.defer="data.post_assessment.*"`
 * instead. Those entries set `wire` (the binding value) and leave `name` empty.
 */
interface FieldSpec {
  /** The `name` attribute of the form control (e.g. `meta[pain_assessment][location]`) */
  name?: string;
  /** The `wire:model.defer` binding value for controls without a name attribute (e.g. `data.post_assessment.pulse`) */
  wire?: string;
  kind: FieldKind;
}

/**
 * Single source of truth mapping the data model to the real staging DOM
 * (verified via scripts/inspect-flow-sheet-*.ts on visit 981).
 */
const FIELD_MAP: Record<keyof FlowSheetData, FieldSpec> = {
  // Outside Dialysis
  outsideDialysis:            { name: 'meta[outside_dialysis]', kind: 'radio' },

  // Pain Assessment
  painToolUsed:               { name: 'meta[pain_assessment][pain_present_tool_used]', kind: 'text' },
  painLocation:               { name: 'meta[pain_assessment][location]', kind: 'select' },
  painFrequency:              { name: 'meta[pain_assessment][frequency]', kind: 'select' },
  painRadiating:              { name: 'meta[pain_assessment][radiating]', kind: 'text' },
  painType:                   { name: 'meta[pain_assessment][type]', kind: 'radio' },
  painOccurs:                 { name: 'meta[pain_assessment][occurs]', kind: 'text' },
  painAmbulating:             { name: 'meta[pain_assessment][ambulating]', kind: 'text' },
  painResting:                { name: 'meta[pain_assessment][resting]', kind: 'text' },
  painEating:                 { name: 'meta[pain_assessment][eating]', kind: 'text' },
  painRelieved:               { name: 'meta[pain_assessment][relieved]', kind: 'text' },
  painWorsens:                { name: 'meta[pain_assessment][worsens]', kind: 'text' },
  painRating:                 { name: 'meta[pain_assessment][rating]', kind: 'radio' },

  // Fall Risk Assessment
  fallRiskScore:              { name: 'meta[fall_risk_assessment][score]', kind: 'radio' },
  fallRiskHighRisk:           { name: 'meta[fall_risk_assessment][high_risk]', kind: 'radio' },
  fallRiskPhysicianNotified:  { name: 'meta[fall_risk_assessment][physician_notified]', kind: 'radio' },
  fallRiskReason:             { name: 'meta[fall_risk_assessment][reason]', kind: 'textarea' },

  // Pre-Treatment Vascular Access Assessment
  vasAccessPreType:           { name: 'meta[vascular_access_pre][access_type]', kind: 'select' },
  vasAccessPreSite:           { name: 'meta[vascular_access_pre][access_site]', kind: 'select' },
  vasAccessPrePatency:        { name: 'meta[vascular_access_pre][access_patency]', kind: 'select' },
  vasAccessPreBruit:          { name: 'meta[vascular_access_pre][bruit]', kind: 'select' },
  vasAccessPreCatheterCondition: { name: 'meta[vascular_access_pre][catheter_condition]', kind: 'select' },
  vasAccessPreExitSite:       { name: 'meta[vascular_access_pre][exit_site_appearance]', kind: 'select' },
  vasAccessPreDressing:       { name: 'meta[vascular_access_pre][dressing_status]', kind: 'select' },
  vasAccessPreInfectionSigns: { name: 'meta[vascular_access_pre][infection_signs]', kind: 'select' },
  vasAccessPrePainScore:      { name: 'meta[vascular_access_pre][pain_score]', kind: 'select' },
  vasAccessPreEdema:          { name: 'meta[vascular_access_pre][edema]', kind: 'select' },
  vasAccessPreHematoma:       { name: 'meta[vascular_access_pre][hematoma]', kind: 'select' },
  vasAccessPreCannulationSite: { name: 'meta[vascular_access_pre][cannulation_site]', kind: 'select' },
  vasAccessPreBloodFlow:      { name: 'meta[vascular_access_pre][blood_flow_before_start]', kind: 'select' },
  vasAccessPreReady:          { name: 'meta[vascular_access_pre][ready_for_dialysis]', kind: 'select' },

  // Alarms Test
  alarmsPassed:               { name: 'meta[alarms_test][passed]', kind: 'radio' },
  alarmsIntake:               { name: 'meta[alarms_test][intake]', kind: 'text' },
  alarmsOutput:               { name: 'meta[alarms_test][output]', kind: 'text' },
  alarmsFfPercent:            { name: 'meta[alarms_test][ff_percent]', kind: 'text' },
  alarmsDialyzer:             { name: 'meta[alarms_test][dialyzer]', kind: 'text' },
  alarmsTemp:                 { name: 'meta[alarms_test][temp]', kind: 'text' },
  alarmsVascular:             { name: 'meta[alarms_test][vascular]', kind: 'radio' },
  alarmsNa:                   { name: 'meta[alarms_test][na]', kind: 'text' },
  alarmsHco3:                 { name: 'meta[alarms_test][hco3]', kind: 'text' },
  alarmsK:                    { name: 'meta[alarms_test][k]', kind: 'text' },
  alarmsGlucose:              { name: 'meta[alarms_test][glucose]', kind: 'text' },

  // Pre-Treatment Vitals
  preVitalHeight:             { name: 'meta[pre_treatment_vital][height]', kind: 'text' },
  preVitalWeight:             { name: 'meta[pre_treatment_vital][weight]', kind: 'text' },
  preVitalWeightDry:          { name: 'meta[pre_treatment_vital][weight_dry]', kind: 'text' },
  preVitalBpSystolic:         { name: 'meta[pre_treatment_vital][bp_systolic]', kind: 'text' },
  preVitalBpDiastolic:        { name: 'meta[pre_treatment_vital][bp_diastolic]', kind: 'text' },
  preVitalBpSite:             { name: 'meta[pre_treatment_vital][bp_site]', kind: 'select' },
  preVitalRr:                 { name: 'meta[pre_treatment_vital][rr]', kind: 'text' },
  preVitalPrValue:            { name: 'meta[pre_treatment_vital][pr_value]', kind: 'text' },
  preVitalPr:                 { name: 'meta[pre_treatment_vital][pr]', kind: 'select' },
  preVitalTemp:               { name: 'meta[pre_treatment_vital][temp]', kind: 'text' },
  preVitalTempMethod:         { name: 'meta[pre_treatment_vital][temp_method]', kind: 'select' },
  preVitalSpo2:               { name: 'meta[pre_treatment_vital][spo2]', kind: 'text' },
  preVitalRbs:                { name: 'meta[pre_treatment_vital][rbs]', kind: 'text' },

  // Nursing Action (row 0)
  nursingActionTime:          { name: 'meta[hemodialysis][nursing_action][0][time]', kind: 'text' },
  nursingActionFocus:         { name: 'meta[hemodialysis][nursing_action][0][focus]', kind: 'text' },
  nursingAction:              { name: 'meta[hemodialysis][nursing_action][0][nursing_action]', kind: 'text' },
  nursingActionEvaluation:    { name: 'meta[hemodialysis][nursing_action][0][evaluation]', kind: 'text' },
  nursingActionName:          { name: 'meta[hemodialysis][nursing_action][0][name]', kind: 'text' },

  // Dialysis Parameters (row 0)
  dialysisTime:               { name: 'meta[hemodialysis][dialysis][0][time]', kind: 'text' },
  dialysisBpSystolic:         { name: 'meta[hemodialysis][dialysis][0][blood_pressure_systolic]', kind: 'text' },
  dialysisBpDiastolic:        { name: 'meta[hemodialysis][dialysis][0][blood_pressure_diastolic]', kind: 'text' },
  dialysisBpSite:             { name: 'meta[hemodialysis][dialysis][0][bp_site]', kind: 'select' },
  dialysisPulse:              { name: 'meta[hemodialysis][dialysis][0][pulse]', kind: 'text' },
  dialysisDialysateRate:      { name: 'meta[hemodialysis][dialysis][0][dialysate_rate]', kind: 'text' },
  dialysisUfRate:             { name: 'meta[hemodialysis][dialysis][0][uf_rate]', kind: 'text' },
  dialysisBfr:                { name: 'meta[hemodialysis][dialysis][0][bfr]', kind: 'text' },
  dialysisDialysateVolume:    { name: 'meta[hemodialysis][dialysis][0][dialysate_volume]', kind: 'text' },
  dialysisUfVolume:           { name: 'meta[hemodialysis][dialysis][0][uf_volume]', kind: 'text' },
  dialysisVenous:             { name: 'meta[hemodialysis][dialysis][0][venous]', kind: 'text' },
  dialysisEffluent:           { name: 'meta[hemodialysis][dialysis][0][effluent]', kind: 'text' },
  dialysisAccess:             { name: 'meta[hemodialysis][dialysis][0][access]', kind: 'text' },
  dialysisComments:           { name: 'meta[hemodialysis][dialysis][0][comments]', kind: 'textarea' },
  dialysisInitials:           { name: 'meta[hemodialysis][dialysis][0][initials]', kind: 'text' },

  // Post-Treatment Vascular Access Assessment
  vasAccessPostHemostasisTime: { name: 'meta[vascular_access_post][hemostasis_time]', kind: 'select' },
  vasAccessPostBleeding:      { name: 'meta[vascular_access_post][bleeding_after_needle_removal]', kind: 'select' },
  vasAccessPostThrill:        { name: 'meta[vascular_access_post][thrill_after]', kind: 'select' },
  vasAccessPostBruit:         { name: 'meta[vascular_access_post][bruit_after]', kind: 'select' },
  vasAccessPostCatheterLocked: { name: 'meta[vascular_access_post][catheter_locked]', kind: 'select' },
  vasAccessPostLockingSolution: { name: 'meta[vascular_access_post][locking_solution]', kind: 'select' },
  vasAccessPostDressingApplied: { name: 'meta[vascular_access_post][dressing_applied]', kind: 'select' },
  vasAccessPostExitSite:      { name: 'meta[vascular_access_post][exit_site_after]', kind: 'select' },
  vasAccessPostPain:          { name: 'meta[vascular_access_post][pain_after]', kind: 'select' },
  vasAccessPostComplications: { name: 'meta[vascular_access_post][complications]', kind: 'select' },
  vasAccessPostDischargeStatus: { name: 'meta[vascular_access_post][access_status_discharge]', kind: 'select' },
  vasAccessPostNurseComments: { name: 'meta[vascular_access_post][nurse_comments]', kind: 'textarea' },
  vasAccessPostPhysicianNotification: { name: 'meta[vascular_access_post][physician_notification]', kind: 'textarea' },

  // Post Treatment Assessment (table-compact — no `name` attrs, wired via
  // `wire:model.defer="data.post_assessment.*"`). UF Net (`uf_goal_2`) is a
  // read-only computed field and the signature buttons open modals, so both
  // are intentionally NOT mapped.
  postAssessBpSystolic:      { wire: 'data.post_assessment.bp_sitting_systolic', kind: 'text' },
  postAssessBpDiastolic:     { wire: 'data.post_assessment.bp_sitting_diastolic', kind: 'text' },
  postAssessBpSite:          { wire: 'data.post_assessment.bp_sitting_site', kind: 'select' },
  postAssessPulse:           { wire: 'data.post_assessment.pulse', kind: 'text' },
  postAssessTemp:            { wire: 'data.post_assessment.temp', kind: 'text' },
  postAssessTempMethod:      { wire: 'data.post_assessment.temp_method', kind: 'select' },
  postAssessSpo2:            { wire: 'data.post_assessment.spo2', kind: 'text' },
  postAssessRr:              { wire: 'data.post_assessment.rr', kind: 'text' },
  postAssessRbs:             { wire: 'data.post_assessment.rbs', kind: 'text' },
  postAssessWeight:          { wire: 'data.post_assessment.weight', kind: 'text' },
  postAssessTxTimeHr:        { wire: 'data.post_assessment.tx_time_hr', kind: 'text' },
  postAssessTxTimeMin:       { wire: 'data.post_assessment.tx_time_min', kind: 'text' },
  postAssessTxTimeL:         { wire: 'data.post_assessment.tx_time_l', kind: 'text' },
  postAssessDialysateL:      { wire: 'data.post_assessment.dialysate_l', kind: 'text' },
  postAssessUf:              { wire: 'data.post_assessment.uf', kind: 'text' },
  postAssessBlp:             { wire: 'data.post_assessment.blp', kind: 'text' },
  postAssessCatheterLock:    { wire: 'data.post_assessment.catheter_lock', kind: 'text' },
  postAssessArterialAccess:  { wire: 'data.post_assessment.arterial_access', kind: 'text' },
  postAssessVenousAccess:    { wire: 'data.post_assessment.venous_access', kind: 'text' },
  postAssessMachineDisinfected: { wire: 'data.post_assessment.machine_disinfected', kind: 'radio' },
  postAssessAccessProblems:  { wire: 'data.post_assessment.access_problems', kind: 'textarea' },
  postAssessNeedleSitesHeld: { wire: 'data.post_assessment.needle_sites_held', kind: 'text' },
  postAssessMedicalComplaints: { wire: 'data.post_assessment.medical_complaints', kind: 'textarea' },
  postAssessNonMedicalIncidence: { wire: 'data.post_assessment.non_medical_incidence', kind: 'textarea' },
  postAssessInitials:        { wire: 'data.post_assessment.initials', kind: 'text' },
};

export class FlowSheetPage extends BasePage {
  /** The Save button at the bottom of the Flow Sheet (wire:click="save"). */
  readonly saveButton: Locator;

  /** SweetAlert2 popup shown on success ("Flow sheet saved successfully!"). */
  readonly successPopup: Locator;

  constructor(page: Page) {
    super(page);

    // Scoped to the Flow Sheet tab to avoid matching other "Save" buttons
    // across the busy visit edit page (modals, other forms, etc.).
    this.saveButton = page.locator(
      '#flowsheet button[wire\\:click="save"]',
    ).first();

    this.successPopup = page.locator(
      '.swal2-popup:has-text("Flow sheet saved successfully!")',
    ).first();
  }

  // =========================================================================
  // Navigation
  // =========================================================================

  /**
   * Navigate to the Flow Sheet of the given visit:
   *
   *   1. Open the Visits directory (`/visits`) and find the row whose first
   *      column equals the visit ID
   *   2. Click the edit icon (`fa-pen-to-square`, inside `a[title="Edit"]`)
   *      under the Actions column → `/visits/{id}/edit`
   *   3. Click the "Flow Sheet" tab (`#flowsheet`)
   *
   * @param visitId The visit ID shown in the Visits directory (e.g. "1005")
   */
  async openVisitFlowSheet(visitId: string): Promise<void> {
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
    console.log(`[FlowSheet] Visit ${visitId} found — clicking edit icon...`);
    await editLink.click();

    // Wait for the visit edit page
    await this.page.waitForURL(
      new RegExp(`/visits/${visitId}/edit`),
      { timeout: 20_000 },
    );
    await this.waitForPageLoad().catch(() => {});
    await this.waitForAnimation(1000);

    // 3. Open the Flow Sheet tab
    await this.openFlowSheetTab();
  }

  /**
   * Click the "Flow Sheet" tab on the visit edit page. The tab is a nav link
   * (`a.nav-link[href="#flowsheet"]`); clicking it renders the Livewire
   * component with all sections and the Save button.
   */
  async openFlowSheetTab(): Promise<void> {
    const tab = this.page.locator(
      'a.nav-link[href="#flowsheet"]:has-text("Flow Sheet")',
    ).first();

    await tab.waitFor({ state: 'visible', timeout: 15_000 });
    await tab.click();

    // The tab updates the URL query (?tab=flowsheet) and Livewire mounts the
    // component — give the mount time to render before interacting.
    await this.page.waitForURL(/\?tab=flowsheet/, { timeout: 10_000 }).catch(() => {});
    await this.waitForAnimation(3000);

    await this.page.locator('#flowsheet-content').waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    console.log('[FlowSheet] Flow Sheet tab opened');
  }

  // =========================================================================
  // Form filling
  // =========================================================================

  /**
   * Build the CSS selector for a Flow Sheet control. Fields are located by
   * their `name` attribute, except the Post Treatment Assessment table whose
   * controls have no `name` — those are located by their
   * `wire:model.defer="data.post_assessment.*"` binding instead.
   */
  private fieldSelector(spec: FieldSpec): string {
    if (spec.wire) {
      // Escape the colon/dot in the attribute name for a CSS attribute selector.
      // Source `\\:` / `\\.` → single backslash at runtime (verified against
      // the real DOM: double backslashes are rejected by the CSS parser).
      return `[wire\\:model\\.defer="${spec.wire}"]`;
    }
    return `[name="${spec.name}"]`;
  }

  /**
   * Set a single Flow Sheet field identified by its `name` attribute (or its
   * `wire:model.defer` binding for the Post Treatment Assessment table).
   *
   * Uses page.evaluate with native value setters + input/change events — the
   * same pattern proven for Livewire forms elsewhere in this project. It works
   * for every binding mode found on the Flow Sheet:
   *   - `wire:model.defer` radios  → set checked + change/input
   *   - `wire:model` live inputs   → native setter + input/change
   *   - name-only inputs/selects   → native setter + input/change (read by
   *     the save() handler from the request meta payload)
   *
   * @throws Error if the control or the value cannot be found, so failures
   *               point at the exact field rather than a later assertion.
   */
  private async setField(spec: FieldSpec, value: string): Promise<void> {
    const selector = this.fieldSelector(spec);
    const ok = await this.page.evaluate(({ sel, v, k }) => {
      const root = document.querySelector('#flowsheet') || document;
      const el = root.querySelector<HTMLElement>(sel);
      if (!el) return false;

      if (k === 'radio') {
        // Match the group by the same selector, picking the radio whose value
        // or label text equals the scenario value.
        const radios = Array.from(
          root.querySelectorAll<HTMLInputElement>(`input[type="radio"]${sel}`),
        );
        const target = radios.find((r) => r.value.toLowerCase() === v.toLowerCase())
          || radios.find((r) => {
            const lbl = r.id ? document.querySelector(`label[for="${r.id}"]`) : null;
            return (lbl?.textContent || '').trim().toLowerCase() === v.toLowerCase();
          });
        if (!target) return false;
        target.checked = true;
        target.dispatchEvent(new Event('change', { bubbles: true }));
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      if (el.tagName === 'SELECT') {
        const selEl = el as HTMLSelectElement;
        const match = Array.from(selEl.options).find((o) => o.textContent?.trim() === v)
          || Array.from(selEl.options).find((o) =>
            o.textContent?.trim().toLowerCase().includes(v.toLowerCase()),
          );
        if (!match) return false;
        selEl.value = match.value;
        selEl.dispatchEvent(new Event('change', { bubbles: true }));
        selEl.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, v);
      else (el as HTMLInputElement).value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, { sel: selector, v: value, k: spec.kind });

    if (!ok) {
      throw new Error(`[FlowSheet] Could not set field "${spec.wire ?? spec.name}" = "${value}"`);
    }
    // Small settle wait per field — Livewire `wire:model` live fields sync
    // on input, and the page is heavy (hundreds of controls).
    await this.waitForAnimation(120);
  }

  /**
   * Fill the Flow Sheet form section by section from the scenario data.
   *
   * Iterates the FIELD_MAP in DOM section order and sets every field that has
   * a value in `data` (empty/undefined = skip). The machine select and the
   * dialysis-medications section are intentionally not part of the map — the
   * machine list is empty for this visit and the medications table shows
   * "No dialysis medications found for this patient."
   */
  async fillFlowSheetForm(data: FlowSheetData): Promise<void> {
    const entries = Object.entries(FIELD_MAP) as Array<[keyof FlowSheetData, FieldSpec]>;
    let filled = 0;

    for (const [key, spec] of entries) {
      const value = data[key];
      if (value === undefined || value === null || value === '') continue;
      await this.setField(spec, value);
      filled++;
    }

    console.log(`[FlowSheet] Filled ${filled} field(s) across all sections`);
  }

  // =========================================================================
  // Save & Verify
  // =========================================================================

  /**
   * Click the Flow Sheet "Save" button and wait for the server response.
   *
   * On success the component shows a SweetAlert2 popup titled "Flow sheet
   * saved successfully!" (its Yes/No/Cancel buttons are hidden — the popup
   * auto-dismisses after a few seconds). On failure it shows a
   * "Validation failed: ..." popup with the server's message.
   *
   * @returns The success popup text (e.g. "Flow sheet saved successfully!")
   * @throws Error with the server's message if a validation/error popup appears
   */
  async saveFlowSheet(): Promise<string> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.saveButton.click({ timeout: 10_000 });

    // The success/error popup appears ~1.5-2.5s after the Livewire round-trip.
    const swal = this.page.locator('.swal2-popup').first();
    await swal.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    if (await swal.isVisible({ timeout: 1000 }).catch(() => false)) {
      const text = ((await swal.textContent()) ?? '').trim().replace(/\s+/g, ' ');

      if (/saved successfully/i.test(text)) {
        console.log(`[FlowSheet] Success popup: "${text}"`);
        // The popup auto-dismisses; no button click needed. Wait for it to
        // clear so the next verification step reads settled DOM.
        await swal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
        return text;
      }

      // Validation (or unexpected) popup — surface the server's message.
      console.warn(`[FlowSheet] SweetAlert2 response: "${text}"`);
      await this.page.screenshot({
        path: 'test-results/artifacts/flow-sheet-validation-error.png',
        fullPage: true,
      }).catch(() => {});
      throw new Error(`[FlowSheet] Save failed — non-success popup: "${text}"`);
    }

    // No popup detected — screenshot for diagnostics, then fail loudly (the
    // success popup is the definitive signal for this form).
    await this.page.screenshot({
      path: 'test-results/artifacts/flow-sheet-no-popup.png',
      fullPage: true,
    }).catch(() => {});
    throw new Error('[FlowSheet] No success popup appeared after clicking Save');
  }

  /**
   * Read back the current value of a Flow Sheet field (by `name`, or by its
   * `wire:model.defer` binding for the Post Treatment Assessment table).
   * Used to verify a saved value survived the Livewire re-render.
   */
  async getFieldValue(spec: FieldSpec): Promise<string> {
    const selector = this.fieldSelector(spec);
    return this.page.evaluate(({ sel }) => {
      const root = document.querySelector('#flowsheet') || document;
      const el = root.querySelector<HTMLElement>(sel);
      if (!el) return '';
      if (el.tagName === 'SELECT') {
        return (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '';
      }
      if ((el as HTMLInputElement).type === 'radio') {
        // Prefer the checked radio's LABEL text (matches scenario values like
        // "Yes"/"No") and fall back to its value (e.g. av_fistula).
        const checked = root.querySelector<HTMLInputElement>(`input[type="radio"]${sel}:checked`);
        if (!checked) return '';
        const lbl = checked.id ? document.querySelector(`label[for="${checked.id}"]`) : null;
        return (lbl?.textContent || '').trim() || checked.value || '';
      }
      return (el as HTMLInputElement).value || '';
    }, { sel: selector });
  }

  /**
   * Verify that key Flow Sheet values persisted after saving (the Livewire
   * re-render reflects server state, so a value that survived means it was
   * committed).
   *
   * @param data The filled scenario data
   * @throws Error listing every field whose value did not persist
   */
  async verifySavedValues(data: FlowSheetData): Promise<void> {
    // Representative fields: the server-required textarea, a name-only
    // select, a wire:model.defer radio, and a live wire:model input.
    const checks: Array<{ key: keyof FlowSheetData; spec: FieldSpec }> = [
      { key: 'vasAccessPostNurseComments', spec: FIELD_MAP.vasAccessPostNurseComments },
      { key: 'vasAccessPreType', spec: FIELD_MAP.vasAccessPreType },
      { key: 'outsideDialysis', spec: FIELD_MAP.outsideDialysis },
      { key: 'preVitalHeight', spec: FIELD_MAP.preVitalHeight },
      // Post Treatment Assessment — the previously-unfilled section.
      { key: 'postAssessPulse', spec: FIELD_MAP.postAssessPulse },
      { key: 'postAssessMachineDisinfected', spec: FIELD_MAP.postAssessMachineDisinfected },
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
        console.log(`[FlowSheet] ✅ Saved value verified — ${key} = "${expected}"`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`[FlowSheet] Saved values not persisted after save:\n  - ${missing.join('\n  - ')}`);
    }
  }
}
