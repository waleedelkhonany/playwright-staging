// =========================================================================
// Employee Data Type
// =========================================================================

/**
 * EmployeeData — fields of the /employees/create form (Main Info tab).
 *
 * Field names mirror the Livewire `wire:model` properties on staging
 * (verified via scripts/inspect-employee-create.ts):
 *
 *   - Select fields (title, status, gender, maritalStatus, nationality,
 *     religion, language) are matched by their OPTION LABEL text via
 *     selectOption({ label }) — the page object maps label → value.
 *   - idType is a RADIO value: 'national_id' | 'passport' | 'iqama'.
 *   - The SCFHS/NPHIES license section is only rendered when a licensed
 *     title (e.g. Nurse, Physician) is selected — the page object waits
 *     for it to become visible before filling those fields.
 *   - Branches (Main Branch) and Systems (In Center) are pre-selected and
 *     locked on staging — normally left untouched.
 *
 * NOTE: nationalId / scfhsLicenseNumber / nphiesProviderId are validated
 * server-side for UNIQUENESS — the loader's DYNAMIC generators
 * (src/helpers/employee-data.loader.ts) must produce fresh values on every
 * run.
 */
export interface EmployeeData {
  /** Required — full display name (input placeholder "Enter Name") */
  name?: string;

  /** Required — Title select option label (e.g. "Nurse", "Physician") */
  title?: string;

  /** Status select option label: "Active" | "Inactive" | "Terminated" */
  status?: string;

  /** Required — Gender select option label: "Male" | "Female" */
  gender?: string;

  /** Marital status select option label */
  maritalStatus?: string;

  /** Required — Nationality select option label (e.g. "Saudi Arabian") */
  nationality?: string;

  /** Required — ID Type radio value: national_id | passport | iqama */
  idType?: string;

  /** Required — National ID / Passport / Iqama number (server: UNIQUE per idType) */
  nationalId?: string;

  /** Required — ID Expiration date (YYYY-MM-DD) */
  expirationDate?: string;

  /** Date of birth (YYYY-MM-DD) */
  dateOfBirth?: string;

  /** Required — Religion select option label (e.g. "Islam") */
  religion?: string;

  /** Preferred Language select option label (e.g. "English") */
  language?: string;

  /** Required (licensed titles) — SCFHS License Number (server: UNIQUE) */
  scfhsLicenseNumber?: string;

  /** Required (licensed titles) — SCFHS License Expiry Date (YYYY-MM-DD) */
  scfhsLicenseExpiryDate?: string;

  /** Required (licensed titles) — NPHIES Provider ID (server: UNIQUE) */
  nphiesProviderId?: string;

  /**
   * Branches (multi-select, Select2) — pre-selected with the locked current
   * branch on staging; only overridden if explicitly provided.
   */
  branches?: string[];

  /**
   * Systems (multi-select, Select2) — pre-selected with the locked current
   * system on staging; only overridden if explicitly provided.
   */
  systems?: string[];
}
