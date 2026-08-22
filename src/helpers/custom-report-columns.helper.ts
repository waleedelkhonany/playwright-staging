/**
 * =============================================================================
 * Custom Report Columns Helper — CHECKLIST resolution against the catalog
 * =============================================================================
 *
 * Custom Reports scenarios pick their report columns with a CHECKLIST that
 * mirrors choose-fields.catalog.json: every catalog key listed exactly once
 * under its group, with true/false per field.
 *
 *   "selectAll": true,                       // optional — short-circuits to ALL
 *   "columns": {
 *     "patient-info":       { "patientId": true, "mrn": true, "dob": false, ... },
 *     "session-details":    { "sessionDate": true, ... },
 *     ...
 *   }
 *
 * resolveColumnsFromChecklist() validates the checklist in BOTH directions —
 *   - unknown keys (typos / removed fields) fail loudly
 *   - catalog keys missing from the checklist fail loudly (the developer
 *     likely added new Choose Fields — add them and decide true/false)
 * — then returns the comma-separated field list the page object consumes
 *   ("ALL" when selectAll is set, "" when the scenario has no checklist).
 */

export interface ChooseFieldEntry {
  key: string;
  id?: string;
  label?: string;
}

export interface ChooseFieldsCatalogShape {
  _fields: Record<string, ChooseFieldEntry[]>;
}

export interface ColumnsChecklistShape {
  selectAll?: boolean;
  columns?: Record<string, Record<string, boolean>>;
}

/**
 * Validate the scenario's columns checklist against the catalog and return
 * the `fields` value for the page object:
 *   - "ALL"                  when checklist.selectAll === true
 *   - ""                     when the scenario has no columns block
 *   - "key1,key2,..."        the checked (true) keys otherwise
 */
export function resolveColumnsFromChecklist(
  catalog: ChooseFieldsCatalogShape,
  checklist: ColumnsChecklistShape,
): string {
  const catalogKeys: string[] = Object.values(catalog._fields)
    .flat()
    .map((entry) => entry.key);

  if (checklist.selectAll === true) {
    console.log(`[Columns] selectAll=true → ALL ${catalogKeys.length} choose-fields will be included`);
    return 'ALL';
  }

  if (!checklist.columns) return ''; // checklist not used in this scenario

  const groups = Object.entries(checklist.columns);
  const checklistKeys = groups.flatMap(([, group]) => Object.keys(group));
  const selected = groups
    .flatMap(([, group]) => Object.entries(group))
    .filter(([, on]) => on === true)
    .map(([key]) => key);

  const unknown = checklistKeys.filter((k) => !catalogKeys.includes(k));
  if (unknown.length > 0) {
    throw new Error(
      `[CustomReports] Scenario checklist has key(s) NOT in choose-fields.catalog.json: ` +
      `${JSON.stringify(unknown)}. Fix the typo or update the catalog.`,
    );
  }

  const missing = catalogKeys.filter((k) => !checklistKeys.includes(k));
  if (missing.length > 0) {
    throw new Error(
      `[CustomReports] Scenario checklist is MISSING catalog key(s): ${JSON.stringify(missing)}. ` +
      `Add them (the developer likely added new Choose Fields) so every option stays visible.`,
    );
  }

  console.log(`[Columns] ${selected.length}/${catalogKeys.length} chosen: ${selected.join(',') || '(none)'}`);
  return selected.join(',');
}
