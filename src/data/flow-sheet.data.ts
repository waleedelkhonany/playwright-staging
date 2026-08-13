/**
 * FlowSheetData — typed payload for the Flow Sheet form.
 *
 * Mirrors the Flow Sheet tab (Livewire component `patients::flowsheet`) on
 * the visit edit page, grouped by section in DOM order:
 *
 *   1. Outside Dialysis
 *   2. Pain Assessment
 *   3. Fall Risk Assessment
 *   4. Pre-Treatment Vascular Access Assessment
 *   5. Alarms Test
 *   6. Pre-Treatment Vitals
 *   7. Nursing Action (row 0)
 *   8. Dialysis Parameters (row 0)
 *   9. Post-Treatment Vascular Access Assessment
 *  10. Post Treatment Assessment
 *
 * Every field is optional — an empty string / undefined means "do not touch
 * this field" (the page object skips it). Field values must match the real
 * option texts / radio labels on staging (see the scenario JSON).
 */
export interface FlowSheetData {
  // --- Outside Dialysis ---
  /** Radio: "Yes" | "No" */
  outsideDialysis?: string;

  // --- Pain Assessment ---
  /** Text — tool used for the pain assessment */
  painToolUsed?: string;
  /** Select — body location (e.g. "Head", "Back", "Other") */
  painLocation?: string;
  /** Select — "Once" | "Daily" | "Weekly" | "Monthly" | "Occasional" | "Constant" */
  painFrequency?: string;
  /** Text — radiating to */
  painRadiating?: string;
  /** Radio — "Constant" | "Dull" | "Sharp" */
  painType?: string;
  /** Text — when it occurs */
  painOccurs?: string;
  /** Text — when ambulating */
  painAmbulating?: string;
  /** Text — when resting */
  painResting?: string;
  /** Text — when eating */
  painEating?: string;
  /** Text — relieved by */
  painRelieved?: string;
  /** Text — worsens by */
  painWorsens?: string;
  /** Radio — pain rating 0-10 */
  painRating?: string;

  // --- Fall Risk Assessment ---
  /** Radio — fall risk score 0-9 */
  fallRiskScore?: string;
  /** Radio — "Yes" | "No" */
  fallRiskHighRisk?: string;
  /** Radio — "Yes" | "No" */
  fallRiskPhysicianNotified?: string;
  /** Textarea — reason (required when physician must be called) */
  fallRiskReason?: string;

  // --- Pre-Treatment Vascular Access Assessment ---
  /** Select — "AVF" | "AVG" | "Tunneled CVC" | "Non-tunneled CVC" */
  vasAccessPreType?: string;
  /** Select — "Right IJ" | "Left IJ" | "Right Femoral" | ... | "Other" */
  vasAccessPreSite?: string;
  /** Select — "Thrill Present" | "Thrill Weak" | "No Thrill" */
  vasAccessPrePatency?: string;
  /** Select — "Normal" | "Weak" | "Absent" */
  vasAccessPreBruit?: string;
  /** Select — "Intact" | "Damaged" | "Loose" */
  vasAccessPreCatheterCondition?: string;
  /** Select — "Clean & Dry" | "Redness" | "Swelling" | ... */
  vasAccessPreExitSite?: string;
  /** Select — "Clean & Intact" | "Loose" | "Wet" | "Soiled" | "Changed" */
  vasAccessPreDressing?: string;
  /** Select — "None" | "Suspected" */
  vasAccessPreInfectionSigns?: string;
  /** Select — pain score 0-10 */
  vasAccessPrePainScore?: string;
  /** Select — "None" | "Mild" | "Moderate" | "Severe" */
  vasAccessPreEdema?: string;
  /** Select — "None" | "Present" */
  vasAccessPreHematoma?: string;
  /** Select — "Suitable" | "Difficult" | "Not Suitable" */
  vasAccessPreCannulationSite?: string;
  /** Select — "Good" | "Fair" | "Poor" */
  vasAccessPreBloodFlow?: string;
  /** Select — "Yes" | "No (Physician Review Required)" */
  vasAccessPreReady?: string;

  // --- Alarms Test ---
  /** Radio — "YES" | "NO" */
  alarmsPassed?: string;
  /** Number — intake (L) */
  alarmsIntake?: string;
  /** Number — output (L) */
  alarmsOutput?: string;
  /** Text — FF % */
  alarmsFfPercent?: string;
  /** Text — dialyzer */
  alarmsDialyzer?: string;
  /** Text — temperature */
  alarmsTemp?: string;
  /** Radio — "av_fistula" | "av_graft" | "cvc_temporary" | "permacath" */
  alarmsVascular?: string;
  /** Text — Na */
  alarmsNa?: string;
  /** Text — HCO3 */
  alarmsHco3?: string;
  /** Text — K */
  alarmsK?: string;
  /** Text — glucose */
  alarmsGlucose?: string;

  // --- Pre-Treatment Vitals ---
  /** Number — height (cm) */
  preVitalHeight?: string;
  /** Number — pre weight (kg) */
  preVitalWeight?: string;
  /** Number — dry weight (kg) */
  preVitalWeightDry?: string;
  /** Number — systolic BP (mmHg) */
  preVitalBpSystolic?: string;
  /** Number — diastolic BP (mmHg) */
  preVitalBpDiastolic?: string;
  /** Select — BP site (e.g. "Right Upper Arm") */
  preVitalBpSite?: string;
  /** Number — respiratory rate */
  preVitalRr?: string;
  /** Number — pulse rate value */
  preVitalPrValue?: string;
  /** Select — pulse site: "Radial" | "Carotid" | "Apical" | "Dorsalis pedis" | "Popliteal" */
  preVitalPr?: string;
  /** Number — temperature (°C) */
  preVitalTemp?: string;
  /** Select — "Oral" | "Axilla" | "Tympanic" | "Temponal" */
  preVitalTempMethod?: string;
  /** Number — SPO2 (%) */
  preVitalSpo2?: string;
  /** Number — RBS (mg/dl) */
  preVitalRbs?: string;

  // --- Nursing Action (row 0) ---
  nursingActionTime?: string;
  nursingActionFocus?: string;
  nursingAction?: string;
  nursingActionEvaluation?: string;
  nursingActionName?: string;

  // --- Dialysis Parameters (row 0) ---
  dialysisTime?: string;
  dialysisBpSystolic?: string;
  dialysisBpDiastolic?: string;
  /** Select — BP site */
  dialysisBpSite?: string;
  dialysisPulse?: string;
  dialysisDialysateRate?: string;
  dialysisUfRate?: string;
  dialysisBfr?: string;
  dialysisDialysateVolume?: string;
  dialysisUfVolume?: string;
  dialysisVenous?: string;
  dialysisEffluent?: string;
  dialysisAccess?: string;
  /** Textarea — comments */
  dialysisComments?: string;
  dialysisInitials?: string;

  // --- Post-Treatment Vascular Access Assessment ---
  /** Select — "<10 min" | "10–20 min" | ">20 min" */
  vasAccessPostHemostasisTime?: string;
  /** Select — "None" | "Mild" | "Moderate" | "Severe" */
  vasAccessPostBleeding?: string;
  /** Select — "Present" | "Weak" | "Absent" */
  vasAccessPostThrill?: string;
  /** Select — "Normal" | "Weak" | "Absent" */
  vasAccessPostBruit?: string;
  /** Select — "Yes" | "No" */
  vasAccessPostCatheterLocked?: string;
  /** Select — "Heparin" | "Citrate" | "Other" */
  vasAccessPostLockingSolution?: string;
  /** Select — "Yes" | "No" */
  vasAccessPostDressingApplied?: string;
  /** Select — "Clean" | "Bleeding" | "Oozing" | "Redness" */
  vasAccessPostExitSite?: string;
  /** Select — pain 0-10 */
  vasAccessPostPain?: string;
  /** Select — "None" | "Difficult Cannulation" | "Infiltration" | ... */
  vasAccessPostComplications?: string;
  /** Select — "Stable" | "Needs Review" | "Physician Notified" */
  vasAccessPostDischargeStatus?: string;
  /** Textarea — REQUIRED by the server before saving */
  vasAccessPostNurseComments?: string;
  /** Textarea — physician notification */
  vasAccessPostPhysicianNotification?: string;

  // --- Post Treatment Assessment ---
  // This section is an editable table (class `table-compact`) whose controls
  // have NO `name` attribute — they are bound via `wire:model.defer` on
  // `data.post_assessment.*` (see FIELD_MAP in flow-sheet.page.ts).
  /** Number — BP sitting systolic (placeholder 120) */
  postAssessBpSystolic?: string;
  /** Number — BP sitting diastolic (placeholder 80) */
  postAssessBpDiastolic?: string;
  /** Select — BP site (e.g. "Right Upper Arm") */
  postAssessBpSite?: string;
  /** Number — pulse (bpm) */
  postAssessPulse?: string;
  /** Number — temperature (°C) */
  postAssessTemp?: string;
  /** Select — "Oral" | "Axilla" | "Tympanic" | "Temponal" */
  postAssessTempMethod?: string;
  /** Number — SpO2 (%) */
  postAssessSpo2?: string;
  /** Number — respiratory rate (cpm) */
  postAssessRr?: string;
  /** Number — RBS (mg/dl) */
  postAssessRbs?: string;
  /** Number — weight (Kg) */
  postAssessWeight?: string;
  /** Number — treatment time hours */
  postAssessTxTimeHr?: string;
  /** Number — treatment time minutes */
  postAssessTxTimeMin?: string;
  /** Number — treatment time liters */
  postAssessTxTimeL?: string;
  /** Number — dialysate (L) */
  postAssessDialysateL?: string;
  /** Text — UF */
  postAssessUf?: string;
  /** Text — BLP */
  postAssessBlp?: string;
  /** Text — catheter lock used */
  postAssessCatheterLock?: string;
  /** Text — arterial access */
  postAssessArterialAccess?: string;
  /** Text — venous access */
  postAssessVenousAccess?: string;
  /** Radio — "YES" | "NO" (machine disinfected) */
  postAssessMachineDisinfected?: string;
  /** Textarea — access/bleeding problems */
  postAssessAccessProblems?: string;
  /** Text — needle sites held */
  postAssessNeedleSitesHeld?: string;
  /** Textarea — medical complaints */
  postAssessMedicalComplaints?: string;
  /** Textarea — non-medical incidence */
  postAssessNonMedicalIncidence?: string;
  /** Text — initials */
  postAssessInitials?: string;
}
