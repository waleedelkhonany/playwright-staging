/**
 * ReferralData — typed payload for the Referral (Referrals) visit-form.
 *
 * The form is reached from the visit edit page via the "Referrals" tab
 * (`a#referrals-tab`), which opens
 * `/load/visit-form/{visitId}/referrals` — a standalone Livewire form.
 * Every control is bound via `wire:model="data.<...>"` (no `name`
 * attributes).
 *
 * Sections (in DOM order):
 *   1. Patient Information   (read-only header — name, MRN, DOB — NOT part of
 *                             this model)
 *   2. Referral details      (referral_date, referral_type select, referral
 *                             hospital select)
 *   3. Documents to print    (print_monthly_medical_report /
 *                             print_system_medical_report / print_lab_result /
 *                             print_last_3_flowsheets checkboxes)
 *   4. Referral reason       (referral_reason textarea)
 *   5. Completion            (completion_date, comments textarea)
 *
 * The file-upload inputs (`uploadFile` signature pad, `inputGroupFileImage`
 * attachment) open file dialogs and the hidden `uploaded_media_ids` input is
 * set by the upload — all three are intentionally NOT part of this model.
 *
 * Every field is optional — an empty string / undefined means "do not touch
 * this field" (the page object skips it). Field values must match the real
 * option texts / checkbox labels on staging (see the scenario JSON):
 *   - select values are the OPTION TEXTS (e.g. "Elective",
 *     "Dr. Soliman Fakeeh Hospital") — what the readback returns
 *   - checkbox values are their LABEL texts (e.g. "Monthly Medical Report")
 *     — what the readback returns
 *   - date values are "YYYY-MM-DD"
 */
export interface ReferralData {
  // --- Referral details ---
  /** Text/date — referral date (YYYY-MM-DD) */
  referralDate?: string;
  /** Select — "Emergency" | "Elective" | "Other" */
  referralType?: string;
  /** Select — the hospital the patient is referred to (option text) */
  referralHospitalId?: string;

  // --- Documents to print ---
  /** Checkbox id "print_monthly_medical_report" — label "Monthly Medical Report" */
  printMonthlyMedicalReport?: string;
  /** Checkbox id "print_system_medical_report" — label "System Medical Report" */
  printSystemMedicalReport?: string;
  /** Checkbox id "print_lab_result" — label "Lab Result" */
  printLabResult?: string;
  /** Checkbox id "print_last_3_flowsheets" — label "Last 3 Flow Sheets" */
  printLast3Flowsheets?: string;

  // --- Referral reason ---
  /** Textarea — placeholder "Enter referral reason" */
  referralReason?: string;

  // --- Completion ---
  /** Text/date — completion date (YYYY-MM-DD) */
  completionDate?: string;
  /** Textarea — comments (input id "Comments") */
  comments?: string;
}
