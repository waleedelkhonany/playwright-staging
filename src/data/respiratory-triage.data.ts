/**
 * RespiratoryTriageData — typed payload for the Respiratory Triage Checklist
 * form.
 *
 * Unlike the other visit-form tabs (Patient Assessment, Discontinue Of
 * Hemodialysis, Vascular Access), the "Respiratory Triage" tab opens a LIST
 * page (`/load/visit-form/{visitId}/respiratory-triage`) with an "Add New"
 * button whose href is `load/form/{patientId}/respiratory-triage?display=create`
 * (a PATIENT-level Livewire form, not visit-level). The page object navigates
 * the same path: visit edit page → Respiratory Triage tab → click "Add New".
 *
 * Every control is bound via `wire:model="data.<...>"` (no `name` attributes).
 * Sections (in DOM order):
 *   1. Patient Information   (read-only header — NOT part of this model)
 *   2. Triage date + vitals  (date, height, weight, temperature)
 *   3. Dialysis?             (radio Yes/No)
 *   4. Symptom scores        (exposure, fever ped/adult, cough ped/adult, SOB
 *                             ped/adult, headache ped/adult, nausea ped/adult,
 *                             chronic disease ped/adult, total score)
 *   5. Nurse signature       (name + id — the signed_by/signed_at hidden
 *                             fields are set by the signature pad, not mapped)
 *   6. Physician signature   (name + id)
 *   7. Disposition           (radio iso/er/opd — isolation / ER / OPD)
 *   8. Doctor signature      (name + id)
 *
 * Every field is optional — an empty string / undefined means "do not touch
 * this field" (the page object skips it). Field values must match the real
 * option texts / radio values on staging (see the scenario JSON). The hidden
 * signature fields (nurse_signature_signed_by, nurse_signature_signed_at,
 * physician_signature_*, doctor_signature_*) are set by the signature pad and
 * are intentionally NOT part of this model.
 */
export interface RespiratoryTriageData {
  // --- Triage info + vitals ---
  /** Text/date — triage date (YYYY-MM-DD) */
  date?: string;
  /** Number — height (cm) */
  height?: string;
  /** Number — weight (kg) */
  weight?: string;
  /** Number — temperature (°C) */
  temperature?: string;

  // --- Dialysis? ---
  /** Radio — "Yes" | "No" (id dialysis_yes / dialysis_no) */
  dialysis?: string;

  // --- Symptom scores (per-category, pediatric + adult) ---
  /** Text — exposure score */
  exposureScore?: string;
  /** Text — fever score (pediatric) */
  feverPed?: string;
  /** Text — fever score (adult) */
  feverAdult?: string;
  /** Text — cough score (pediatric) */
  coughPed?: string;
  /** Text — cough score (adult) */
  coughAdult?: string;
  /** Text — shortness of breath score (pediatric) */
  sobPed?: string;
  /** Text — shortness of breath score (adult) */
  sobAdult?: string;
  /** Text — headache score (pediatric) */
  headachePed?: string;
  /** Text — headache score (adult) */
  headacheAdult?: string;
  /** Text — nausea/vomiting score (pediatric) */
  nauseaPed?: string;
  /** Text — nausea/vomiting score (adult) */
  nauseaAdult?: string;
  /** Text — chronic disease score (pediatric) */
  chronicPed?: string;
  /** Text — chronic disease score (adult) */
  chronicAdult?: string;
  /** Text — total triage score */
  totalScore?: string;

  // --- Nurse signature ---
  /** Text — nurse name */
  nurseName?: string;
  /** Text — nurse id */
  nurseId?: string;

  // --- Physician signature ---
  /** Text — physician name */
  physicianName?: string;
  /** Text — physician id */
  physicianId?: string;

  // --- Disposition ---
  /** Radio — isolation: "yes" | "no" */
  iso?: string;
  /** Radio — emergency room: "yes" | "no" */
  er?: string;
  /** Radio — outpatient department: "yes" | "no" */
  opd?: string;

  // --- Doctor signature ---
  /** Text — doctor name */
  doctorName?: string;
  /** Text — doctor id */
  doctorId?: string;
}
