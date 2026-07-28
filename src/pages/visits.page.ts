import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * VisitsPage — Page Object Model for the Visit Edit/Update screen.
 *
 * This page is reached after clicking **Check-In** from the appointment
 * detail modal. The system automatically redirects to `/visits/{id}/edit`.
 *
 * Key elements on this page:
 * - A **Visit Status** indicator showing "in progress" or "Checked-In"
 * - Action bar buttons: **Start Procedure**, **Check-Out**, **Check-Out Without SAP Order**
 * - Optional **Patient Alerts & Instructions** banners/modals (allergies, etc.)
 *
 * @example
 *   // After check-in redirect:
 *   await page.waitForURL(/\/visits\/\d+\/edit/);
 *   const visitsPage = new VisitsPage(page);
 *   const status = await visitsPage.verifyVisitPageLoaded();
 *   expect(status.urlOk).toBeTruthy();
 *   expect(status.startProcedureVisible).toBeTruthy();
 */

export interface VisitPageStatus {
  /** Whether the URL matches /visits/{id}/edit pattern */
  urlOk: boolean;
  /** Whether the Start Procedure button is visible */
  startProcedureVisible: boolean;
  /** Whether the Check-Out button is visible */
  checkOutVisible: boolean;
  /** Whether the Check-Out Without SAP button is visible */
  checkOutWithoutSapVisible: boolean;
  /** Whether the visit status indicator is visible */
  statusVisible: boolean;
  /** The visit status text content, if found */
  statusText: string;
  /** The current page URL */
  currentUrl: string;
}

export class VisitsPage extends BasePage {
  // =========================================================================
  // Locators
  // =========================================================================

  /** The main visit form/container */
  readonly visitForm: Locator;

  /** Visit status badge or indicator (e.g., "in progress", "Checked-In") */
  readonly visitStatus: Locator;

  /** "Start Procedure" action button */
  readonly startProcedureButton: Locator;

  /** "Check-Out" action button */
  readonly checkOutButton: Locator;

  /** "Check-Out Without SAP Order" action button */
  readonly checkOutWithoutSapButton: Locator;

  /** Patient Alerts modal/panel (allergies, contamination, etc.) */
  readonly patientAlertsModal: Locator;

  /** Button to dismiss/close patient alerts */
  readonly dismissAlertsButton: Locator;

  /** Success notification toast */
  readonly successToast: Locator;

  constructor(page: Page) {
    super(page);

    // Main visit form — wide container since this is the primary page content
    this.visitForm = page.locator(
      'form[action*="visits"], form[action*="visit"], ' +
      '[class*="visit-form"], [class*="visit-details"], ' +
      '#visit-form, .edit-visit',
    ).first();

    // Visit status — a badge or label showing the current visit status
    this.visitStatus = page.locator(
      'span.badge:has-text("in progress"), .badge:has-text("progress"), ' +
      'span.badge:has-text("Checked-In"), .badge:has-text("Checked"), ' +
      '[class*="visit-status"], [class*="status-badge"]',
    ).first();

    // Action bar buttons in the visit edit page
    this.startProcedureButton = page.locator(
      'button:has-text("Start Procedure"), a:has-text("Start Procedure"), ' +
      '[class*="start-procedure"]',
    ).first();

    this.checkOutButton = page.locator(
      'button:has-text("Check-Out"), button:has-text("Check Out"), ' +
      'a:has-text("Check-Out"), [class*="check-out"]',
    ).first();

    this.checkOutWithoutSapButton = page.locator(
      'button:has-text("Check-Out Without SAP"), ' +
      'button:has-text("Check-Out Without SAP Order"), ' +
      'a:has-text("Check-Out Without SAP"), [class*="check-out-without-sap"]',
    ).first();

    // Patient Alerts & Instructions — could be a modal, banner, or callout
    this.patientAlertsModal = page.locator(
      '#allergiesModal, #alertsModal, #patientAlerts, ' +
      '.modal:has-text("Allergies"), .modal:has-text("Alerts"), ' +
      '.modal:has-text("allergies"), .modal:has-text("alerts"), ' +
      '.alert-warning:has-text("Allergy"), .alert-warning:has-text("Contamination"), ' +
      '[class*="patient-alert"], [class*="allergy-banner"]',
    ).first();

    // Dismiss/close button for alerts
    this.dismissAlertsButton = this.patientAlertsModal.locator(
      'button:has-text("Close"), button:has-text("close"), ' +
      '.close, .btn-close, button:has-text("Dismiss"), ' +
      'button:has-text("OK"), .swal2-confirm',
    ).first();

    // Success toast
    this.successToast = page.locator(
      '.alert-success, .toast-success, .success-message, [class*="success"]',
    ).first();
  }

  // =========================================================================
  // Page Verification
  // =========================================================================

  /**
   * Verify that the Visit Details page has loaded correctly by checking:
   * - The URL matches the pattern `/visits/{id}/edit`
   * - The action bar buttons are visible
   * - The visit status indicator is present
   *
   * Returns a result object so the test can make assertions — keeps the
   * page object decoupled from the test runner (no `expect` calls here).
   *
   * @returns A {@link VisitPageStatus} object with check results
   */
  async verifyVisitPageLoaded(): Promise<VisitPageStatus> {
    console.log('[VisitsPage] Verifying Visit page loaded...');

    // 1. Wait for the page to fully load
    await this.waitForPageLoad();
    await this.waitForAnimation(1000);

    // 2. Check URL pattern
    const currentUrl = this.getCurrentUrl();
    const urlOk = /\/visits\/\d+\/edit/.test(currentUrl);
    console.log(`[VisitsPage] URL: ${currentUrl} — ${urlOk ? 'yes' : 'no'}`);

    // 3. Check visit status indicator
    const statusVisible = await this.visitStatus.isVisible({ timeout: 5000 }).catch(() => false);
    const statusText = statusVisible ? await this.getText(this.visitStatus) : '';
    console.log(`[VisitsPage] Visit status: "${statusText}" — ${statusVisible ? 'visible' : 'hidden'}`);

    // 4. Verify action bar buttons
    const startProcedureVisible = await this.startProcedureButton.isVisible({ timeout: 3000 }).catch(() => false);
    const checkOutVisible = await this.checkOutButton.isVisible({ timeout: 3000 }).catch(() => false);
    const checkOutWithoutSapVisible = await this.checkOutWithoutSapButton.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('[VisitsPage] Action buttons:');
    console.log(`  - Start Procedure:           ${startProcedureVisible ? 'yes' : 'no'}`);
    console.log(`  - Check-Out:                 ${checkOutVisible ? 'yes' : 'no'}`);
    console.log(`  - Check-Out Without SAP:     ${checkOutWithoutSapVisible ? 'yes' : 'no'}`);

    return {
      urlOk,
      startProcedureVisible,
      checkOutVisible,
      checkOutWithoutSapVisible,
      statusVisible,
      statusText,
      currentUrl,
    };
  }

  // =========================================================================
  // Patient Alerts Handling
  // =========================================================================

  /**
   * Safely dismiss any Patient Alerts & Instructions modals or banners
   * (such as Allergies & Contamination alerts) that may appear.
   *
   * This method checks for alert modals/banners and dismisses them if
   * present, so subsequent interactions are not blocked.
   */
  async handleAlertsIfPresent(): Promise<boolean> {
    const alertVisible = await this.patientAlertsModal.isVisible({ timeout: 2000 }).catch(() => false);

    if (!alertVisible) {
      console.log('[VisitsPage] No patient alerts detected');
      return false;
    }

    console.log('[VisitsPage] Patient alerts detected — dismissing...');

    // Try clicking the dismiss/close button
    if (await this.dismissAlertsButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.dismissAlertsButton.click();
      await this.waitForAnimation(1000);
      console.log('[VisitsPage] Alerts dismissed via close button');
      return true;
    }

    // Fallback: press Escape to close the modal
    await this.page.keyboard.press('Escape');
    await this.waitForAnimation(500);
    console.log('[VisitsPage] Alerts dismissed via Escape key');
    return true;
  }

  // =========================================================================
  // Status & Information
  // =========================================================================

  /**
   * Get the current visit status text.
   *
   * @returns The status text (e.g., "in progress", "Checked-In"), or empty string
   */
  async getVisitStatus(): Promise<string> {
    const visible = await this.visitStatus.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      return this.getText(this.visitStatus);
    }
    return '';
  }

  /**
   * Get the success notification message if one is visible.
   *
   * @returns The success message text, or empty string
   */
  async getSuccessMessage(): Promise<string> {
    const visible = await this.successToast.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      return this.getText(this.successToast);
    }
    return '';
  }
}
