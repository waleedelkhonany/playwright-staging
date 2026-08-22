/**
 * CustomReportData — typed payload for the NEW Custom Reports feature
 * (Reports module → /reports/custom-reports).
 *
 * The feature has three screens, all plain server-rendered forms (NOT
 * Livewire — regular GET/POST round-trips):
 *
 *   1. My Reports      `/reports/custom-reports`          — saved reports list
 *      (Name / Type / Fields / Schedule / Next run / Last run / Created /
 *       Status / Actions: Download · Edit · Toggle Visibility · Delete —
 *       Delete uses a NATIVE `confirm()` dialog, not SweetAlert)
 *   2. Report Builder  `/reports/custom-reports/builder`  — the report designer
 *      State is carried entirely in QUERY PARAMS (?subject=sessions&
 *      filters[rangeMode]=weekly&...). Preset range modes (daily / weekly /
 *      monthly) DISABLE the date inputs; only `filters[rangeMode]=custom`
 *      makes `filters[dateFrom]` / `filters[dateTo]` editable.
 *      Column selection is a checkbox group `name="fields[]"` with STABLE ids
 *      `field-{group}-{key}` (e.g. `field-patient-info-patientId`,
 *      `field-treatment-data-ufVolume`) — groups differ per subject.
 *      Submit button label reflects the selection: "Preview Report (N fields)".
 *   3. Preview         `/reports/custom-reports/preview`  — results table +
 *      CSV/PDF/Excel export links + a "Save Report" form
 *      (POST `/reports/custom-reports`: name*, recipients*,
 *       frequency radio [one_time|weekly|monthly|quarterly],
 *       visibility radio [private|public]; the built report rides along in
 *       hidden inputs). Success redirects back to My Reports with a toast
 *       `"{name}" has been saved.`
 *
 * Field values must match the real option texts / ids on staging (see
 * config/custom-report-scenarios/*.scenario.json):
 *   - `subject`     : "sessions" | "patients" | "providers"
 *   - `rangeMode`   : "daily" | "weekly" | "monthly" | "custom"
 *   - filter values : SELECT OPTION TEXTS (e.g. "In Center")
 *   - `fields`      : COMMA-SEPARATED column keys (the id suffix, e.g.
 *                     "patientId,mrn,name,sessionDate,visitStatus,ufVolume").
 *                     Keys must be unique-enough suffixes of the real ids.
 *
 * Every field is optional — an empty string / undefined means "do not touch
 * this field" (the page object skips it).
 */
export interface CustomReportData {
  // --- Builder: report shape ---
  /** Subject card — option value: "sessions" | "patients" | "providers" */
  subject?: string;
  /** Range mode — "daily" | "weekly" | "monthly" | "custom" */
  rangeMode?: string;
  /** Date input `filters[dateFrom]` (YYYY-MM-DD) — only editable in custom mode */
  dateFrom?: string;
  /** Date input `filters[dateTo]` (YYYY-MM-DD) — only editable in custom mode */
  dateTo?: string;

  // --- Builder: filters (SELECT OPTION TEXTS, "" = leave untouched) ---
  /** Select `filters[branchId]` — e.g. "All Branches", "Main Branch", "Jeddah" */
  branchFilter?: string;
  /** Select `filters[system]` — "All Systems" | "In Center" | "Home Hemodialysis" */
  systemFilter?: string;
  /** Select `filters[visitStatus]` — e.g. "All Statuses", "Completed" */
  visitStatusFilter?: string;

  // --- Builder: columns ---
  /**
   * Comma-separated column keys checked into `fields[]` (all other boxes are
   * UNCHECKED first, so the resulting columns are exactly this list).
   * Example: "patientId,mrn,name,sessionDate,visitStatus,ufVolume".
   */
  fields?: string;

  // --- Preview: Save Report form (optional — "" / undefined skips saving) ---
  /** Saved report display name (unique per run — use "DYNAMIC") */
  saveReport?: string;
  /** Radio `frequency` — "one_time" | "weekly" | "monthly" | "quarterly" */
  frequency?: string;
  /** Radio `visibility` — "private" | "public" */
  visibility?: string;
  /** Recipient emails (REQUIRED by the server form — comma-separated) */
  recipients?: string;
}
