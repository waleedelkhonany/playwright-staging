// =========================================================================
// Types
// =========================================================================

/**
 * Data for the patient Address form (patient detail page → Profile section →
 * Addresses tab → "Add New"). Field bindings map to the Livewire component
 * `patients::addresses` (`wire:model="data.*"`):
 *
 *   - address  → textarea `data.address`   (required)
 *   - area     → select  `data.area_id`    (required — display text, e.g. "Riyadh")
 *   - city     → text    `data.city`       (required)
 *   - isDefault → checkbox `data.is_default`
 *   - mapAddress → text `data.map_address` (Google Maps search — optional)
 *
 * See scripts/inspect-patient-address.ts for the inspected DOM.
 */
export interface AddressData {
  /** Address line — required textarea (wire:model="data.address") */
  address?: string;

  /** Area display text — required select (wire:model="data.area_id"), e.g. "Riyadh" */
  area?: string;

  /** City — required text input (wire:model="data.city") */
  city?: string;

  /** Mark as default address (wire:model="data.is_default") */
  isDefault?: boolean;

  /** Optional Google Maps search text (wire:model="data.map_address") */
  mapAddress?: string;
}
