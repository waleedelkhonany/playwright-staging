/**
 * VascularAccessData — typed payload for the VASCULAR ACCESS ASSESSMENT TOOL
 * form.
 *
 * The form is reached from the visit edit page via the "VASCULAR ACCESS
 * ASSESSMENT TOOL" tab (`a#vascular-access-assessment-tab`), which opens
 * `/load/visit-form/{visitId}/vascular-access-assessment` (target=_blank) — a
 * standalone Livewire form. Every control is bound via
 * `wire:model="data.<...>"` or `wire:model.live="data.<...>"` (no `name`
 * attributes).
 *
 * Sections (in DOM order):
 *   1. Patient Information   (read-only header — name, MRN, DOB — NOT part of
 *                             this model)
 *   2. Access Type           (select: AVF / AVG / CVC tunneled / CVC
 *                             temporary, each with its site/date/checkbox)
 *   3. K. Needle Insertion Assessment Tool (AVF/AVG) — scoring checkboxes
 *      (b_redness, b_swelling, b_discharge, b_hematoma, c_thrill, c_temp,
 *      c_tenderness, d_bruit, e_function) that compute a total score
 *   4. L. Hemodialysis Catheter Bundle — scoring checkboxes (f_*, g_*)
 *   5. Post-care             (dressing applied Yes/No + date, tego changed
 *                             Yes/No + date)
 *   6. Interventions         (low / moderate / high risk action checkboxes,
 *                             e.g. low_continue_assessment)
 *
 * The total score (`data.vascular_total_score`, id `vascularTotalInput`) is a
 * computed read-only field and the signature-image upload (`uploadFile`) opens
 * a file dialog — both are intentionally NOT part of this model.
 *
 * Every field is optional — an empty string / undefined means "do not touch
 * this field" (the page object skips it). Field values must match the real
 * option texts / checkbox ids on staging (see the scenario JSON).
 */
export interface VascularAccessData {
  // --- Access Type ---
  /** Select — "Arteriovenous Fistula (AVF)" | "Arteriovenous Graft (AVG)" | "Central Venous Catheter – Tunneled" | "Central Venous Catheter – Temporary" */
  accessType?: string;
  /** Select — AVF site (e.g. "Right Radiocephalic AVF (Wrist)") */
  avfSite?: string;
  /** Text/date — AVF creation date */
  avfDate?: string;
  /** Checkbox id "access_type_avf" — confirms AVF access type */
  accessTypeAvf?: string;

  // --- K. Needle Insertion Assessment Tool (AVF/AVG) — scoring checkboxes ---
  /** Checkbox id "b_redness_0" — redness score */
  bRedness?: string;
  /** Checkbox id "b_swelling_0" — swelling score */
  bSwelling?: string;
  /** Checkbox id "c_thrill_10" — thrill score */
  cThrill?: string;
  /** Checkbox id "c_temp_0" — temperature score */
  cTemp?: string;
  /** Checkbox id "c_tenderness_0" — tenderness score */
  cTenderness?: string;
  /** Checkbox id "d_bruit_20" — bruit score */
  dBruit?: string;
  /** Checkbox id "e_function_clean_0" — cannulation site condition score */
  eFunction?: string;

  // --- Post-care ---
  /** Radio — dressing applied: "Yes" | "No" */
  dressingApplied?: string;
  /** Text/date — dressing change date */
  dressingChangeDate?: string;
  /** Radio — tego changed: "Yes" | "No" */
  tegoChanged?: string;
  /** Text/date — tego change date */
  tegoChangeDate?: string;

  // --- Interventions (low risk) ---
  /** Checkbox id "low_continue_assessment" — label "Continue routine HHD assessment" */
  lowContinueAssessment?: string;
  /** Checkbox id "low_dressing_technique" — label "Ensure proper dressing technique" */
  lowDressingTechnique?: string;
  /** Checkbox id "low_educate_access_care" — label "Educate patient & caregiver on access care" */
  lowEducateAccessCare?: string;
}
