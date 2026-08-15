/**
 * =============================================================================
 * E2E Test: Add a Patient Address (Profile → Addresses)
 * =============================================================================
 *
 * Covers the complete happy path for adding an address to an existing patient
 * from within the patient's detail page, under the "Profile" section of the
 * sidebar → "Addresses" tab:
 *
 *   1. Auto-login (via auth fixture) + header context sync
 *   2. Navigate to Patients and open the target patient (config.json)
 *   3. Click the "Addresses" tab (Profile section) → ?tab=addresses
 *   4. Click "Add New" → ?tab=addresses&view=create
 *   5. Fill the Livewire address form (Address, Area, City; Is Default optional)
 *   6. Click Save — the form re-renders silently (no toast/redirect)
 *   7. Open the Addresses list and assert the new address row is present
 *
 * Notes:
 *   - The target patient is read from config.json
 *     (appointment.targetPatientIdentifier) — the single source of truth
 *     shared by every patient test.
 *   - The Address/City fields are typed with real keystrokes: this Livewire
 *     component's plain wire:model bindings ignore a single synthetic fill().
 *   - The form embeds a Google Maps search component whose initialization can
 *     re-render (and truncate) the Address textarea — the page object waits
 *     for the map to settle before typing.
 *
 * @see config/config.json — appointment.targetPatientIdentifier
 * @see config/address-scenarios/full-address.scenario.json — address payload
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import { getAddressData } from '../src/helpers/address-data.loader';
import config from '../config/config.json';

test.describe('E2E: Add Patient Address', () => {
  // The flow includes the Google Map settle wait and slow keystroke typing,
  // so allow more headroom than the 60s default.
  test.setTimeout(120_000);

  test('should add an address for the target patient under the Profile tab', async ({ patientsPage }) => {
    // -----------------------------------------------------------------------
    // 1. Load configurable test parameters
    //    Target patient from config.json; address payload from the scenario file.
    // -----------------------------------------------------------------------
    const targetPatient = config.appointment.targetPatientIdentifier;
    const address = getAddressData('full-address.scenario.json');

    console.log('═══════════════════════════════════════════════');
    console.log('  ADD ADDRESS TEST CONFIGURATION');
    console.log(`  Target Patient:  ${targetPatient}`);
    console.log(`  Address:         ${address.address}`);
    console.log(`  Area:            ${address.area}`);
    console.log(`  City:            ${address.city}`);
    console.log('═══════════════════════════════════════════════\n');

    // -----------------------------------------------------------------------
    // 2. Execute the full add-address workflow:
    //    Patients → search & open patient → Addresses tab → Add New → fill → save
    // -----------------------------------------------------------------------
    await patientsPage.addAddress(targetPatient, address);
    console.log(`✅ Address form saved for patient ${targetPatient}`);

    // -----------------------------------------------------------------------
    // 3. Verify — the save re-renders the form silently, so open the Addresses
    //    list and assert the new row (address text + city) is present.
    // -----------------------------------------------------------------------
    await patientsPage.openAddressesList();
    const visible = await patientsPage.isAddressVisibleInList(address);
    expect(visible).toBe(true);
    console.log(`✅ Address "${address.address}" visible in the Addresses list\n`);
  });
});
