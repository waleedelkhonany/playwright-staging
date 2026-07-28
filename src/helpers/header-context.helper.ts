/**
 * =============================================================================
 * Header Context Helper
 * =============================================================================
 *
 * Integrated, reusable helper for managing the Branch and Location (System)
 * context in the top navigation header.
 *
 * Workflow:
 *   1. Reads target branch and location from config.json
 *   2. Checks the current values in the header
 *   3. If they don't match, automatically selects/switches to the correct values
 *
 * This helper is designed to be called:
 *   - After login (in the auth fixture) to ensure correct context
 *   - Before any test that depends on a specific branch/location
 *   - As a standalone action for switching contexts mid-test
 *
 * @see config/config.json — headerContext section
 */

import { type Page } from '@playwright/test';
import { HeaderPage } from '../pages/header.page';
import config from '../../config/config.json';

// =========================================================================
// Types
// =========================================================================

export interface HeaderContextConfig {
  /** Target branch name (e.g., "Main Branch", "Jeddah") */
  targetBranch: string;
  /** Target location/system name (e.g., "In Center", "Home Hemodialysis") */
  targetLocation: string;
}

export interface HeaderContextResult {
  /** Whether the branch matched or was successfully switched */
  branchOk: boolean;
  /** Whether the location matched or was successfully switched */
  locationOk: boolean;
  /** Whether a branch switch was needed and attempted */
  branchSwitched: boolean;
  /** Whether a location switch was needed and attempted */
  locationSwitched: boolean;
  /** The branch value read before any switch */
  previousBranch: string;
  /** The location value read before any switch */
  previousLocation: string;
  /** The config that was used */
  config: HeaderContextConfig;
}

// =========================================================================
// Public Helpers
// =========================================================================

/**
 * Load the header context targets from config.json.
 *
 * @returns The configured branch and location targets
 * @throws If headerContext section is missing or targets are not defined
 */
export function getHeaderConfig(): HeaderContextConfig {
  const ctx = config.headerContext;
  if (!ctx) {
    throw new Error(
      '[HeaderContext] Missing "headerContext" section in config/config.json. ' +
      'Add targetBranch and targetLocation properties.',
    );
  }
  if (!ctx.targetBranch) {
    throw new Error(
      '[HeaderContext] Missing "targetBranch" in config/config.json headerContext section.',
    );
  }
  if (!ctx.targetLocation) {
    throw new Error(
      '[HeaderContext] Missing "targetLocation" in config/config.json headerContext section.',
    );
  }
  return {
    targetBranch: ctx.targetBranch,
    targetLocation: ctx.targetLocation,
  };
}

/**
 * Ensure the header context (Branch + Location) matches the config.json targets.
 *
 * This is the primary integrated helper:
 *   1. Reads targets from config.json
 *   2. Checks current header values
 *   3. Switches any that don't match
 *
 * @param page - Playwright Page instance
 * @param overrides - Optional override targets (takes precedence over config.json)
 * @returns Result object indicating what was checked and what was switched
 *
 * @example
 *   // After login, ensure correct context from config:
 *   const result = await ensureHeaderContext(page);
 *   console.log(`Branch switched: ${result.branchSwitched}`);
 *
 * @example
 *   // Override targets for a specific test:
 *   await ensureHeaderContext(page, {
 *     targetBranch: 'Jeddah',
 *     targetLocation: 'Home Hemodialysis',
 *   });
 */
export async function ensureHeaderContext(
  page: Page,
  overrides?: Partial<HeaderContextConfig>,
): Promise<HeaderContextResult> {
  const configTargets = getHeaderConfig();
  const targets: HeaderContextConfig = {
    targetBranch: overrides?.targetBranch ?? configTargets.targetBranch,
    targetLocation: overrides?.targetLocation ?? configTargets.targetLocation,
  };

  console.log('═══════════════════════════════════════════════');
  console.log('  HEADER CONTEXT — ensure header context');
  console.log(`  Target Branch:    "${targets.targetBranch}"`);
  console.log(`  Target Location:  "${targets.targetLocation}"`);
  console.log('═══════════════════════════════════════════════');

  const headerPage = new HeaderPage(page);
  const [previousBranch, previousLocation] = await Promise.all([
    headerPage.getSelectedBranch(),
    headerPage.getSelectedLocation(),
  ]);

  console.log(`  Current Branch:   "${previousBranch}"`);
  console.log(`  Current Location: "${previousLocation}"`);

  const result = await headerPage.ensureContext(
    targets.targetBranch,
    targets.targetLocation,
  );

  const fullResult: HeaderContextResult = {
    ...result,
    previousBranch,
    previousLocation,
    config: targets,
  };

  // Summary
  if (fullResult.branchOk && fullResult.locationOk) {
    console.log('✅ Header context ensured successfully');
  } else {
    const issues: string[] = [];
    if (!fullResult.branchOk) issues.push('Branch');
    if (!fullResult.locationOk) issues.push('Location');
    console.warn(`⚠️  Header context issues: ${issues.join(', ')}`);
  }

  return fullResult;
}

/**
 * Quick check — verify the current header context matches config without switching.
 *
 * @param page - Playwright Page instance
 * @returns true if both branch and location match their targets
 */
export async function verifyHeaderContext(page: Page): Promise<boolean> {
  const headerPage = new HeaderPage(page);
  const targets = getHeaderConfig();
  return headerPage.verifyHeaderContext(targets.targetBranch, targets.targetLocation);
}

/**
 * Get the currently selected branch and location from the header.
 *
 * @param page - Playwright Page instance
 * @returns Object with currentBranch and currentLocation strings
 */
export async function getCurrentHeaderContext(page: Page): Promise<{
  currentBranch: string;
  currentLocation: string;
}> {
  const headerPage = new HeaderPage(page);
  const [currentBranch, currentLocation] = await Promise.all([
    headerPage.getSelectedBranch(),
    headerPage.getSelectedLocation(),
  ]);
  return { currentBranch, currentLocation };
}
