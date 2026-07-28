/**
 * =============================================================================
 * E2E Test: Header Context Verification & Selection
 * =============================================================================
 *
 * Verifies the top navigation header Branch and Location (System) context:
 *   - Reading the currently selected values
 *   - Selecting / switching to a different branch or location
 *   - Ensuring the header context matches config.json targets
 *
 * The `ensureHeaderContext()` helper is the integrated, reusable method that:
 *   1. Reads targets from config.json
 *   2. Checks current header values
 *   3. Switches any that don't match
 *
 * Pre-test Header Context Verification:
 *   Every test in this suite explicitly verifies and ensures the Branch and
 *   Location match config.json headerContext targets before executing any
 *   test steps. If the current UI state does not match, the test automatically
 *   switches before proceeding.
 *
 * Available Branch options (from staging app):
 *   - Main Branch  ← default
 *   - Jeddah
 *   - Branch 3
 *   - Branch 4
 *   - Branch 5
 *   - Branch 6
 *   - Branch 7
 *
 * Available Location / System options:
 *   - In Center           ← default
 *   - Home Hemodialysis
 *
 * @see config/config.json — headerContext section
 * @see src/helpers/header-context.helper.ts — integrated helper
 * @see src/pages/header.page.ts — page object
 */

import { test, expect } from '../src/fixtures/auth.fixture';
import config from '../config/config.json';
import { ensureHeaderContext, getCurrentHeaderContext } from '../src/helpers/header-context.helper';

// ---------------------------------------------------------------------------
// Helper: pick a branch option different from the default
// ---------------------------------------------------------------------------
function getAlternativeBranch(): string {
  const defaultBranch = config.headerContext.targetBranch;
  const allBranches: string[] = [
    'Main Branch',
    'Jeddah',
    'Branch 3',
    'Branch 4',
    'Branch 5',
    'Branch 6',
    'Branch 7',
  ];
  const alt = allBranches.find(b => b !== defaultBranch);
  return alt ?? 'Jeddah';
}

// ---------------------------------------------------------------------------
// Helper: pick a location option different from the default
// ---------------------------------------------------------------------------
function getAlternativeLocation(): string {
  const defaultLocation = config.headerContext.targetLocation;
  return defaultLocation === 'In Center' ? 'Home Hemodialysis' : 'In Center';
}

// ---------------------------------------------------------------------------
// Mandatory Pre-test: Verify & set header context before EVERY test in this file
// ---------------------------------------------------------------------------
test.beforeEach(async ({ page }) => {
  await ensureHeaderContext(page);
});

// test.describe('Header Context — Verification', () => {

//   test('should display the correct Branch in the top navigation header', async ({ headerPage }) => {
//     const expectedBranch = config.headerContext.targetBranch;

//     console.log('═══════════════════════════════════════════════');
//     console.log('  HEADER BRANCH VERIFICATION');
//     console.log(`  Expected Branch:  "${expectedBranch}"`);
//     console.log('═══════════════════════════════════════════════');

//     const actualBranch = await headerPage.getSelectedBranch();
//     console.log(`  Actual Branch:    "${actualBranch}"`);

//     expect(actualBranch).toBe(expectedBranch);
//     console.log(`✅ Branch matches expected: "${expectedBranch}"`);
//   });

//   test('should display the correct Location / System in the top navigation header', async ({ headerPage }) => {
//     const expectedLocation = config.headerContext.targetLocation;

//     console.log('═══════════════════════════════════════════════');
//     console.log('  HEADER LOCATION VERIFICATION');
//     console.log(`  Expected Location:  "${expectedLocation}"`);
//     console.log('═══════════════════════════════════════════════');

//     const actualLocation = await headerPage.getSelectedLocation();
//     console.log(`  Actual Location:    "${actualLocation}"`);

//     expect(actualLocation).toBe(expectedLocation);
//     console.log(`✅ Location matches expected: "${expectedLocation}"`);
//   });

//   test('should display both Branch and Location context correctly in the header', async ({ headerPage }) => {
//     const expectedBranch = config.headerContext.targetBranch;
//     const expectedLocation = config.headerContext.targetLocation;

//     console.log('═══════════════════════════════════════════════');
//     console.log('  FULL HEADER CONTEXT VERIFICATION');
//     console.log(`  Expected Branch:    "${expectedBranch}"`);
//     console.log(`  Expected Location:  "${expectedLocation}"`);
//     console.log('═══════════════════════════════════════════════');

//     const contextOk = await headerPage.verifyHeaderContext(expectedBranch, expectedLocation);
//     expect(contextOk).toBe(true);
//     console.log('✅ Full header context verified successfully');
//   });

//   test('should list available Branch options from the header dropdown', async ({ headerPage }) => {
//     const branchOptions = await headerPage.getAvailableBranchOptions();

//     console.log('═══════════════════════════════════════════════');
//     console.log('  AVAILABLE BRANCH OPTIONS');
//     branchOptions.forEach((opt, i) => console.log(`    ${i + 1}. "${opt}"`));
//     console.log('═══════════════════════════════════════════════');

//     expect(branchOptions.length).toBeGreaterThanOrEqual(1);
//     expect(branchOptions).toContain(config.headerContext.targetBranch);
//   });

//   test('should list available Location options from the header dropdown', async ({ headerPage }) => {
//     const locationOptions = await headerPage.getAvailableLocationOptions();

//     console.log('═══════════════════════════════════════════════');
//     console.log('  AVAILABLE LOCATION OPTIONS');
//     locationOptions.forEach((opt, i) => console.log(`    ${i + 1}. "${opt}"`));
//     console.log('═══════════════════════════════════════════════');

//     expect(locationOptions.length).toBeGreaterThanOrEqual(1);
//     expect(locationOptions).toContain(config.headerContext.targetLocation);
//   });
// });

// test.describe('Header Context — Selection / Switching', () => {

//   test('should select a different Branch and switch back', async ({ page }) => {
//     const alternativeBranch = getAlternativeBranch();
//     const defaultBranch = config.headerContext.targetBranch;

//     console.log('═══════════════════════════════════════════════');
//     console.log('  BRANCH SWITCH TEST');
//     console.log(`  Default:     "${defaultBranch}"`);
//     console.log(`  Alternative: "${alternativeBranch}"`);
//     console.log('═══════════════════════════════════════════════');

//     // 1. Check current branch (should be default after beforeEach ensured context)
//     let current = await getCurrentHeaderContext(page);
//     console.log(`  Step 1 — Current: "${current.currentBranch}"`);
//     expect(current.currentBranch).toBe(defaultBranch);

//     // 2. Switch to alternative branch
//     const altResult = await ensureHeaderContext(page, {
//       targetBranch: alternativeBranch,
//     });
//     console.log(`  Step 2 — Switched: ${altResult.branchSwitched}`);
//     expect(altResult.branchSwitched).toBe(true);
//     expect(altResult.branchOk).toBe(true);

//     // 3. Verify the header now shows the alternative
//     current = await getCurrentHeaderContext(page);
//     console.log(`  Step 3 — After switch: "${current.currentBranch}"`);
//     expect(current.currentBranch).toBe(alternativeBranch);

//     // 4. Switch back to default
//     const backResult = await ensureHeaderContext(page, {
//       targetBranch: defaultBranch,
//     });
//     console.log(`  Step 4 — Switched back: ${backResult.branchSwitched}`);
//     expect(backResult.branchSwitched).toBe(true);
//     expect(backResult.branchOk).toBe(true);

//     // 5. Verify it's back to default
//     current = await getCurrentHeaderContext(page);
//     console.log(`  Step 5 — Final: "${current.currentBranch}"`);
//     expect(current.currentBranch).toBe(defaultBranch);

//     console.log('✅ Branch switch and revert completed successfully');
//   });

//   test('should select a different Location and switch back', async ({ page }) => {
//     const alternativeLocation = getAlternativeLocation();
//     const defaultLocation = config.headerContext.targetLocation;

//     console.log('═══════════════════════════════════════════════');
//     console.log('  LOCATION SWITCH TEST');
//     console.log(`  Default:     "${defaultLocation}"`);
//     console.log(`  Alternative: "${alternativeLocation}"`);
//     console.log('═══════════════════════════════════════════════');

//     // 1. Check current location (should be default after beforeEach ensured context)
//     let current = await getCurrentHeaderContext(page);
//     console.log(`  Step 1 — Current: "${current.currentLocation}"`);
//     expect(current.currentLocation).toBe(defaultLocation);

//     // 2. Switch to alternative location
//     const altResult = await ensureHeaderContext(page, {
//       targetLocation: alternativeLocation,
//     });
//     console.log(`  Step 2 — Switched: ${altResult.locationSwitched}`);
//     expect(altResult.locationSwitched).toBe(true);
//     expect(altResult.locationOk).toBe(true);

//     // 3. Verify the header now shows the alternative
//     current = await getCurrentHeaderContext(page);
//     console.log(`  Step 3 — After switch: "${current.currentLocation}"`);
//     expect(current.currentLocation).toBe(alternativeLocation);

//     // 4. Switch back to default
//     const backResult = await ensureHeaderContext(page, {
//       targetLocation: defaultLocation,
//     });
//     console.log(`  Step 4 — Switched back: ${backResult.locationSwitched}`);
//     expect(backResult.locationSwitched).toBe(true);
//     expect(backResult.locationOk).toBe(true);

//     // 5. Verify it's back to default
//     current = await getCurrentHeaderContext(page);
//     console.log(`  Step 5 — Final: "${current.currentLocation}"`);
//     expect(current.currentLocation).toBe(defaultLocation);

//     console.log('✅ Location switch and revert completed successfully');
//   });

//   test('should switch both Branch and Location together', async ({ page }) => {
//     const altBranch = getAlternativeBranch();
//     const altLocation = getAlternativeLocation();
//     const defaultBranch = config.headerContext.targetBranch;
//     const defaultLocation = config.headerContext.targetLocation;

//     console.log('═══════════════════════════════════════════════');
//     console.log('  DUAL CONTEXT SWITCH TEST');
//     console.log(`  Default:  Branch="${defaultBranch}"  Location="${defaultLocation}"`);
//     console.log(`  Target:   Branch="${altBranch}"  Location="${altLocation}"`);
//     console.log('═══════════════════════════════════════════════');

//     // 1. Switch both to alternative
//     const altResult = await ensureHeaderContext(page, {
//       targetBranch: altBranch,
//       targetLocation: altLocation,
//     });
//     console.log(`  Switch both: branch=${altResult.branchSwitched}, location=${altResult.locationSwitched}`);
//     expect(altResult.branchSwitched).toBe(true);
//     expect(altResult.locationSwitched).toBe(true);

//     // 2. Verify both changed
//     const current = await getCurrentHeaderContext(page);
//     expect(current.currentBranch).toBe(altBranch);
//     expect(current.currentLocation).toBe(altLocation);

//     // 3. Switch both back to default
//     const backResult = await ensureHeaderContext(page, {
//       targetBranch: defaultBranch,
//       targetLocation: defaultLocation,
//     });
//     expect(backResult.branchSwitched).toBe(true);
//     expect(backResult.locationSwitched).toBe(true);

//     // 4. Verify both restored
//     const restored = await getCurrentHeaderContext(page);
//     expect(restored.currentBranch).toBe(defaultBranch);
//     expect(restored.currentLocation).toBe(defaultLocation);

//     console.log('✅ Dual context switch and revert completed successfully');
//   });

//   test('should be idempotent — ensuring already-correct context does nothing', async ({ page }) => {
//     const defaultBranch = config.headerContext.targetBranch;
//     const defaultLocation = config.headerContext.targetLocation;

//     console.log('═══════════════════════════════════════════════');
//     console.log('  IDEMPOTENCY TEST');
//     console.log(`  Target:  Branch="${defaultBranch}"  Location="${defaultLocation}"`);
//     console.log('═══════════════════════════════════════════════');

//     // 1. First call — should be no-op since beforeEach already ensured context
//     const result1 = await ensureHeaderContext(page);
//     console.log(`  Call 1 — no switch needed: branch=${!result1.branchSwitched}, location=${!result1.locationSwitched}`);

//     // 2. Second call — should also be no-op
//     const result2 = await ensureHeaderContext(page);
//     console.log(`  Call 2 — no switch needed: branch=${!result2.branchSwitched}, location=${!result2.locationSwitched}`);

//     // Neither call should have needed to switch
//     expect(result1.branchSwitched).toBe(false);
//     expect(result1.locationSwitched).toBe(false);
//     expect(result2.branchSwitched).toBe(false);
//     expect(result2.locationSwitched).toBe(false);

//     // Context should still be correct
//     const current = await getCurrentHeaderContext(page);
//     expect(current.currentBranch).toBe(defaultBranch);
//     expect(current.currentLocation).toBe(defaultLocation);

//     console.log('✅ Idempotency confirmed — ensureHeaderContext is safe to call repeatedly');
//   });
// });
