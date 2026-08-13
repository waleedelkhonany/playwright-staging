/**
 * PatientAssessmentData — typed payload for the Patient Assessment form.
 *
 * The Patient Assessment form is reached from the visit edit page via the
 * \"Patient Assessment\" tab (`a#patient-assessment-tab`), which opens
 * `/load/visit-form/{visitId}/patient-assessment` (target=_blank) — a
 * standalone Livewire form. Every field is bound via
 * `wire:model="data.<...>"` (no `name` attributes).
 *
 * Sections (in DOM order):
 *   1. Patient Information  (allergy)
 *   2. Assessment           (initial/re-assessment, mental status, alertness,
 *                            caregiver, vitals — vitals/pain/height/weight are
 *                            READ-ONLY, auto-filled from the Flow Sheet)
 *   3. Medical History      (medical/medication history, family history,
 *                            contraptions/equipment)
 *   4. Surgical History     (row 0)
 *   5. Social History       (living situation, dwelling, languages, hobbies)
 *   6. Referral             (disaster planning / social worker / allied health)
 *   7. History Given By     (who provided the history + relationship)
 *
 * Every field is optional — an empty string / undefined means \"do not touch
 * this field\" (the page object skips it). Field values must match the real
 * option texts / radio values / checkbox ids on staging (see the scenario
 * JSON). The read-only fields (bp_sys, bp_dias, temp, spo2, respiratory_rate,
 * pulse_rate, pain_score, location, duration, height, weight, designation)
 * are intentionally NOT part of this model — they are computed server-side.
 */
export interface PatientAssessmentData {
  // --- Patient Information ---
  /** Textarea — allergies */
  allergy?: string;

  // --- Assessment ---
  /** Radio — \"initial\" | \"reassessment\" */
  initialAssessment?: string;
  /** Checkbox — mental status label/id (e.g. \"Oriented\") */
  mentalStatus?: string;
  /** Radio — \"Always\" | \"Sometimes\" | \"Never\" */
  patientAlert?: string;
  /** Radio — \"yes\" | \"no\" */
  caregiver?: string;
  /** Text — type of pain (editable, unlike pain score which is read-only) */
  typeOfPain?: string;
  /** Text — ambulatory status */
  ambulatoryStatus?: string;
  /** Text — ambulation distance */
  distance?: string;
  /** Text — ambulation device */
  device?: string;
  /** Text — lung auscultation */
  lungAuscultation?: string;
  /** Radio — oxygen use: \"yes\" | \"no\" */
  oxygenUse?: string;
  /** Text — oxygen use description */
  oxygenUseText?: string;
  /** Text — litres per minute */
  litPerMinute?: string;
  /** Radio — weight loss: \"yes\" | \"no\" */
  weightLoss?: string;
  /** Text — weight loss amount */
  weightLossAmount?: string;
  /** Number — appetite score */
  appetite?: string;
  /** Number — diet score */
  diet?: string;

  // --- Medical History ---
  /** Textarea — medical history */
  medicalHistory?: string;
  /** Text — mother's medical history */
  motherMedicalHistory?: string;
  /** Text — father's medical history */
  fatherMedicalHistory?: string;
  /** Textarea — medication history */
  medicationHistory?: string;
  /** Radio — contraptions/equipment group 1: \"IV\" | \"Feeding\" | \"Ventilator\" | \"Oxygen\" | \"Pump\" | \"Assistive\" */
  equipmentG1?: string;
  /** Radio — contraptions/equipment group 2: \"Catheter\" | \"Feeding_tube\" | \"Nebulizer\" | \"BiPAP_CPAP\" | \"Drains\" */
  equipmentG2?: string;

  // --- Surgical History (row 0) ---
  /** Text — surgical history description */
  surgicalHistory?: string;
  /** Text — place of surgery */
  surgicalPlace?: string;

  // --- Social History ---
  /** Radio — living situation: \"yes\" | \"no\" */
  livingSituation?: string;
  /** Text — who lives with the patient */
  indivWithPatient?: string;
  /** Radio — dwelling type: \"flat\" | \"house\" | \"villa\" | \"other\" */
  dwellingType?: string;
  /** Text — floor */
  floor?: string;
  /** Text — room */
  room?: string;
  /** Radio — elevator available: \"yes\" | \"no\" */
  elevator?: string;
  /** Text — primary caregiver */
  primaryCaregiver?: string;
  /** Text — available assist for patient */
  avaAssistPatient?: string;
  /** Radio — caregiver received instructions: \"yes\" | \"no\" | \"na\" */
  caregiverInstructions?: string;
  /** Text — patient primary language */
  patientPrimaryLang?: string;
  /** Text — patient secondary language */
  patientSecondaryLang?: string;
  /** Text — religion */
  religion?: string;
  /** Text — family primary language */
  familyPrimaryLang?: string;
  /** Text — family secondary language */
  familySecondaryLang?: string;
  /** Text — hobbies */
  hobbies?: string;
  /** Text — occupation history */
  occupationHistory?: string;

  // --- Referral (checkboxes) ---
  /** Checkbox — referral id \"disaster_planning\" */
  referralDisasterPlanning?: string;
  /** Checkbox — referral id \"social_worker\" */
  referralSocialWorker?: string;
  /** Checkbox — referral id \"allied_health_professionals\" */
  referralAlliedHealth?: string;

  // --- History Given By ---
  /** Text — who provided the history (e.g. \"Test Nurse\") */
  historyGivenBy?: string;
  /** Text — relationship to patient (e.g. \"Nurse\") */
  relationshipToPatient?: string;
}
