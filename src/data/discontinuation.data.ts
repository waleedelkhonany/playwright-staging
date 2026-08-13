/**
 * DiscontinuationData — typed payload for the REFUSAL/DISCONTINUATION OF
 * HEMODIALYSIS SESSION/S form.
 *
 * The form is reached from the visit edit page via the "Discontinue Of
 * Hemodialysis" tab (`a#dis-of-hemodialysis-tab`), which opens
 * `/load/visit-form/{visitId}/dis-of-hemodialysis` (target=_blank) — a
 * standalone Livewire form. Every field is bound via
 * `wire:model="data.<...>"` (no `name` attributes).
 *
 * The form is BILINGUAL — every section appears twice, once in English
 * (`*_en` bindings) and once in Arabic (`*_ar` bindings), and the save()
 * handler persists both sides. Sections (in DOM order):
 *   1. Patient Information        (read-only header — name, MRN, DOB — NOT
 *                                  part of this model)
 *   2. Reason for refusal/discontinuation — checkboxes
 *      (Discontinuation of hemodialysis services, Refusal to consent,
 *      Hyperkalemia, Cardiac Arrest, Pulmonary Edema, Severe Acidosis) +
 *      free-text reason textarea + "Others" textarea
 *   3. Witness Information        (name, relationship select, datetime,
 *                                  address)
 *   4. Reason why patient is unable to sign (textarea)
 *   5. Relative Information       (name, relationship select, datetime)
 *   6. Doctor Information         (name, datetime)
 *   7. Interpreter Information    (name, datetime)
 *
 * Every field is optional — an empty string / undefined means "do not touch
 * this field" (the page object skips it). Field values must match the real
 * option texts / radio values / checkbox ids on staging (see the scenario
 * JSON). The signature-image upload (`uploadFile` / `uploaded_media_id`) is
 * intentionally NOT part of this model.
 */
export interface DiscontinuationData {
  // --- Reason / refusal — English side ---
  /** Checkbox id "Discontinuation" — discontinue hemodialysis services */
  discontinueServicesEn?: string;
  /** Checkbox id "Refusal" — refusal to consent to examination/HD sessions */
  examinationRefusalEn?: string;
  /** Textarea — reason for discontinuation (EN) */
  discontinueReasonEn?: string;
  /** Checkbox id "Hyperkalemia" */
  hyperkalemiaEn?: string;
  /** Checkbox id "Cardiac" — cardiac arrest */
  cardiacEn?: string;
  /** Checkbox id "Pulmonary" — pulmonary edema */
  pulmonaryEn?: string;
  /** Checkbox id "Acidosis" — severe acidosis */
  acidosisEn?: string;
  /** Textarea — other reasons (EN) */
  othersEn?: string;

  // --- Witness Information — English side ---
  /** Text — witness name */
  witnessNameEn?: string;
  /** Select — witness relationship (e.g. "Spouse", "Son", ...) */
  witnessRelationshipEn?: string;
  /** Datetime-local — witness signature datetime (YYYY-MM-DDTHH:MM) */
  witnessDatetimeEn?: string;
  /** Text — witness address */
  witnessAddressEn?: string;

  // --- Reason why patient is unable to sign — English side ---
  /** Textarea — why the patient could not sign (EN) */
  inabilityReasonEn?: string;

  // --- Relative Information — English side ---
  /** Text — relative name */
  relativeNameEn?: string;
  /** Select — relative relationship (e.g. "Spouse", "Son", ...) */
  relativeRelationEn?: string;
  /** Datetime-local — relative signature datetime */
  relativeDatetimeEn?: string;

  // --- Doctor Information — English side ---
  /** Text — doctor name */
  doctorNameEn?: string;
  /** Datetime-local — doctor signature datetime */
  doctorDatetimeEn?: string;

  // --- Interpreter Information — English side ---
  /** Text — interpreter name */
  interpreterNameEn?: string;
  /** Datetime-local — interpreter signature datetime */
  interpreterDatetimeEn?: string;

  // --- Reason / refusal — Arabic side ---
  /** Checkbox id "إيقاف" — إيقاف خدمات غسيل الكلى */
  discontinueServicesAr?: string;
  /** Checkbox id "رفض" — رفض الموافقة على الفحص/جلسات غسيل الكلى/التحقيقات */
  examinationRefusalAr?: string;
  /** Textarea — سبب إيقاف الخدمة (AR) */
  discontinueReasonAr?: string;
  /** Checkbox id "الدم" — فرط بوتاسيوم الدم */
  hyperkalemiaAr?: string;
  /** Checkbox id "القلب" — توقف القلب */
  cardiacAr?: string;
  /** Checkbox id "رئوية" — وذمة رئوية */
  pulmonaryAr?: string;
  /** Checkbox id "حموضة" — حموضة الدم */
  acidosisAr?: string;
  /** Textarea — أسباب أخرى (AR) */
  othersAr?: string;

  // --- Witness Information — Arabic side ---
  /** Text — اسم الشاهد */
  witnessNameAr?: string;
  /** Select — صلة قرابة الشاهد (e.g. "زوج/زوجة") */
  witnessRelationshipAr?: string;
  /** Datetime-local — تاريخ/وقت توقيع الشاهد */
  witnessDatetimeAr?: string;
  /** Text — عنوان الشاهد */
  witnessAddressAr?: string;

  // --- Reason why patient is unable to sign — Arabic side ---
  /** Textarea — سبب عدم قدرة المريض على التوقيع (AR) */
  inabilityReasonAr?: string;

  // --- Relative Information — Arabic side ---
  /** Text — اسم القريب */
  relativeNameAr?: string;
  /** Select — علاقة القريب (e.g. "ابن") */
  relativeRelationAr?: string;
  /** Datetime-local — تاريخ/وقت توقيع القريب */
  relativeDatetimeAr?: string;

  // --- Doctor Information — Arabic side ---
  /** Text — اسم الطبيب */
  doctorNameAr?: string;
  /** Datetime-local — تاريخ/وقت توقيع الطبيب */
  doctorDatetimeAr?: string;

  // --- Interpreter Information — Arabic side ---
  /** Text — اسم المترجم */
  interpreterNameAr?: string;
  /** Datetime-local — تاريخ/وقت توقيع المترجم */
  interpreterDatetimeAr?: string;
}
