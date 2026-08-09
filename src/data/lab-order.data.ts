// =========================================================================
// Lab Order — data type
// =========================================================================
//
// Data model for the "Create Lab Order" form opened from the
// Physician Orders → Labs & Imaging → Create Lab Order tab
// (?tab=lab_orders) on the Patient detail page.
//
// Unlike the Dialysis Order (a modal), the Lab Order form renders directly
// on the tab: it has a Lab Company select, a collection-by select, a due
// date input, free-text comment/description/notes textareas, and one or more
// "test rows" — each row containing a Lab Test Tom Select search widget
// ("Search Lab Test") and a Lab Profile Tom Select.
//
// Field values are the OPTION TEXTS exactly as rendered in the form
// (e.g. "Alfarabi (E-Order)"). `labTest` is the exact option text picked
// from the Lab Test search dropdown (e.g. "Sodium (Na+)").
//
// Test data lives in config/physician-order-scenarios/lab-order.scenario.json
// and is loaded via src/helpers/lab-order-data.loader.ts (getLabOrderData).

export interface LabOrderData {
  /** Lab company option text, e.g. "Alfarabi (E-Order)" */
  labCompany: string;
  /** Collection-by: "nurse" | "patient" | "lab" */
  collectionBy: string;
  /** Due date as YYYY-MM-DD (filled into the dueDate text input) */
  dueDate: string;
  /** Exact Lab Test option text to pick from the search dropdown, e.g. "Sodium (Na+)" */
  labTest: string;
  /** Exact Lab Test option text for the SECOND test row (added via the Add button) */
  labTest2: string;
  /** Free-text comment */
  comment: string;
  /** Free-text description */
  description: string;
  /** Free-text notes */
  notes: string;
}
