import { type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * HeaderPage — Page Object Model for the CareConnect KSA top navigation header.
 *
 * Provides locators and verification methods for:
 * - Branch selector (e.g., "Main Branch", "Jeddah", etc.)
 * - Location / System selector (e.g., "In Center", "Home Hemodialysis")
 *
 * Expected header structure (Livewire component):
 *   <select wire:model.live="branch_id" name="branch_id">
 *     <option value="1">Main Branch</option>
 *     ...
 *   </select>
 *   <select wire:model.live="system" name="location_id">
 *     <option value="1">In Center</option>
 *     ...
 *   </select>
 *
 * Note: All DOM interactions use page.evaluate() because Livewire manages
 * the <select> elements via JavaScript, making Playwright locator-based
 * interactions unreliable. Reading uses selectedIndex, and writing uses
 * the native value setter + dispatchEvent to trigger Livewire listeners.
 *
 * Attribute matching uses JS getAttribute() inside the evaluate callbacks
 * instead of CSS selectors to avoid escaping issues with Livewire's
 * `wire:model.live` attribute names (colon + dot in attribute names).
 *
 * @see config/config.json — headerContext section for configurable targets
 */
export class HeaderPage extends BasePage {
  // =========================================================================
  // Getters — Current Values
  // =========================================================================

  /**
   * Get the currently selected Branch text from the header.
   */
  async getSelectedBranch(): Promise<string> {
    return this.page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const sel = selects.find(s => {
        const name = s.getAttribute('name');
        const wireModel = s.getAttribute('wire:model');
        const wireModelLive = s.getAttribute('wire:model.live');
        return name === 'branch_id'
          || (wireModel != null && wireModel.includes('branch'))
          || (wireModelLive != null && wireModelLive.includes('branch'));
      });
      if (!sel) return '';
      const idx = sel.selectedIndex;
      return idx >= 0 ? (sel.options[idx]?.textContent?.trim() ?? '') : '';
    });
  }

  /**
   * Get the currently selected Location / System text from the header.
   */
  async getSelectedLocation(): Promise<string> {
    return this.page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const sel = selects.find(s => {
        const name = s.getAttribute('name');
        const wireModel = s.getAttribute('wire:model');
        const wireModelLive = s.getAttribute('wire:model.live');
        if (name === 'location_id' || name === 'system_id') return true;
        if (wireModel != null) {
          if (wireModel.includes('location') || wireModel.includes('Location')
            || wireModel.includes('system') || wireModel.includes('System')) return true;
        }
        if (wireModelLive != null) {
          if (wireModelLive.includes('location') || wireModelLive.includes('system')) return true;
        }
        return false;
      });
      if (!sel) return '';
      const idx = sel.selectedIndex;
      return idx >= 0 ? (sel.options[idx]?.textContent?.trim() ?? '') : '';
    });
  }

  // =========================================================================
  // Actions — Select / Switch
  // =========================================================================

  /**
   * Select a Branch by its visible option text.
   *
   * Finds the matching `<option>`, sets the select value, and dispatches
   * change + input events to notify Livewire of the update.
   *
   * @param branchName - The visible text of the branch option (e.g., "Main Branch", "Jeddah")
   * @returns true if the branch was found and selected, false otherwise
   */
  async selectBranch(branchName: string): Promise<boolean> {
    const result = await this.page.evaluate((name: string) => {
      const selects = Array.from(document.querySelectorAll('select'));
      const sel = selects.find(s => {
        const n = s.getAttribute('name');
        const wireModel = s.getAttribute('wire:model');
        const wireModelLive = s.getAttribute('wire:model.live');
        return n === 'branch_id'
          || (wireModel != null && wireModel.includes('branch'))
          || (wireModelLive != null && wireModelLive.includes('branch'));
      });
      if (!sel) return 'Select element not found';

      const option = Array.from(sel.options).find(
        o => o.textContent?.trim() === name,
      );
      if (!option) return `Option "${name}" not found`;

      sel.value = option.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      return null; // success
    }, branchName);

    if (result !== null) {
      console.warn(`[Header] selectBranch("${branchName}"): ${result}`);
      return false;
    }

    await this.waitForAnimation(1000);
    console.log(`[Header] Branch switched to "${branchName}"`);
    return true;
  }

  /**
   * Select a Location / System by its visible option text.
   *
   * Finds the matching `<option>`, sets the select value, and dispatches
   * change + input events to notify Livewire of the update.
   *
   * @param locationName - The visible text of the location option (e.g., "In Center", "Home Hemodialysis")
   * @returns true if the location was found and selected, false otherwise
   */
  async selectLocation(locationName: string): Promise<boolean> {
    const result = await this.page.evaluate((name: string) => {
      const selects = Array.from(document.querySelectorAll('select'));
      const sel = selects.find(s => {
        const n = s.getAttribute('name');
        const wireModel = s.getAttribute('wire:model');
        const wireModelLive = s.getAttribute('wire:model.live');
        if (n === 'location_id' || n === 'system_id') return true;
        if (wireModel != null) {
          if (wireModel.includes('location') || wireModel.includes('Location')
            || wireModel.includes('system') || wireModel.includes('System')) return true;
        }
        if (wireModelLive != null) {
          if (wireModelLive.includes('location') || wireModelLive.includes('system')) return true;
        }
        return false;
      });
      if (!sel) return 'Select element not found';

      const option = Array.from(sel.options).find(
        o => o.textContent?.trim() === name,
      );
      if (!option) return `Option "${name}" not found`;

      sel.value = option.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      return null; // success
    }, locationName);

    if (result !== null) {
      console.warn(`[Header] selectLocation("${locationName}"): ${result}`);
      return false;
    }

    await this.waitForAnimation(1000);
    console.log(`[Header] Location switched to "${locationName}"`);
    return true;
  }

  /**
   * Ensure the header is showing the target Branch and Location.
   *
   * Reads the current values first and only switches if there's a mismatch.
   * This is an idempotent operation — if the header is already correct,
   * no changes are made.
   *
   * @param targetBranch - The desired branch name
   * @param targetLocation - The desired location name
   * @returns An object indicating whether each was already correct or was switched
   */
  async ensureContext(
    targetBranch: string,
    targetLocation: string,
  ): Promise<{ branchOk: boolean; locationOk: boolean; branchSwitched: boolean; locationSwitched: boolean }> {
    const [currentBranch, currentLocation] = await Promise.all([
      this.getSelectedBranch(),
      this.getSelectedLocation(),
    ]);

    let branchSwitched = false;
    let locationSwitched = false;

    if (currentBranch !== targetBranch) {
      console.log(
        `[Header] Branch needs switch: "${currentBranch}" → "${targetBranch}"`,
      );
      branchSwitched = await this.selectBranch(targetBranch);
    } else {
      console.log(`[Header] Branch already correct: "${targetBranch}"`);
    }

    if (currentLocation !== targetLocation) {
      console.log(
        `[Header] Location needs switch: "${currentLocation}" → "${targetLocation}"`,
      );
      locationSwitched = await this.selectLocation(targetLocation);
    } else {
      console.log(`[Header] Location already correct: "${targetLocation}"`);
    }

    const branchOk = currentBranch === targetBranch || branchSwitched;
    const locationOk = currentLocation === targetLocation || locationSwitched;

    return { branchOk, locationOk, branchSwitched, locationSwitched };
  }

  // =========================================================================
  // Verification
  // =========================================================================

  /**
   * Verify that the header shows the expected branch name.
   */
  async verifyBranch(expectedBranch: string): Promise<boolean> {
    const actual = await this.getSelectedBranch();
    const match = actual === expectedBranch;
    if (!match) {
      console.warn(
        `[Header] Branch mismatch: expected "${expectedBranch}", got "${actual}"`,
      );
    }
    return match;
  }

  /**
   * Verify that the header shows the expected location / system name.
   */
  async verifyLocation(expectedLocation: string): Promise<boolean> {
    const actual = await this.getSelectedLocation();
    const match = actual === expectedLocation;
    if (!match) {
      console.warn(
        `[Header] Location mismatch: expected "${expectedLocation}", got "${actual}"`,
      );
    }
    return match;
  }

  /**
   * Verify both Branch and Location in the header simultaneously.
   */
  async verifyHeaderContext(
    expectedBranch: string,
    expectedLocation: string,
  ): Promise<boolean> {
    const [actualBranch, actualLocation] = await Promise.all([
      this.getSelectedBranch(),
      this.getSelectedLocation(),
    ]);

    const branchOk = actualBranch === expectedBranch;
    const locationOk = actualLocation === expectedLocation;

    if (!branchOk || !locationOk) {
      console.log(`[Header] Context verification:
  Branch:   expected="${expectedBranch}"   actual="${actualBranch}"
  Location: expected="${expectedLocation}"  actual="${actualLocation}"`);
    }

    return branchOk && locationOk;
  }

  /**
   * Get all available Branch options from the header dropdown.
   */
  async getAvailableBranchOptions(): Promise<string[]> {
    return this.page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const sel = selects.find(s => {
        const name = s.getAttribute('name');
        const wireModel = s.getAttribute('wire:model');
        const wireModelLive = s.getAttribute('wire:model.live');
        return name === 'branch_id'
          || (wireModel != null && wireModel.includes('branch'))
          || (wireModelLive != null && wireModelLive.includes('branch'));
      });
      if (!sel) return [];
      return Array.from(sel.options).map(o => o.textContent?.trim() ?? '');
    });
  }

  /**
   * Get all available Location options from the header dropdown.
   */
  async getAvailableLocationOptions(): Promise<string[]> {
    return this.page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const sel = selects.find(s => {
        const name = s.getAttribute('name');
        const wireModel = s.getAttribute('wire:model');
        const wireModelLive = s.getAttribute('wire:model.live');
        if (name === 'location_id' || name === 'system_id') return true;
        if (wireModel != null) {
          if (wireModel.includes('location') || wireModel.includes('Location')
            || wireModel.includes('system') || wireModel.includes('System')) return true;
        }
        if (wireModelLive != null) {
          if (wireModelLive.includes('location') || wireModelLive.includes('system')) return true;
        }
        return false;
      });
      if (!sel) return [];
      return Array.from(sel.options).map(o => o.textContent?.trim() ?? '');
    });
  }
}
