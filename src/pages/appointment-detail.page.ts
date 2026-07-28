import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * AppointmentDetailPage — Page Object Model for the Appointment Detail modal/view
 * that appears after clicking the View (eye icon) button on an appointment row.
 *
 * This modal contains:
 * - A **Care Team** section listing assigned staff/providers
 *   - Each row may show a **Confirm** button (individual confirmation)
 *   - After confirmation, rows display a **Confirmed** status badge
 * - A bottom action bar with **Check-In**, **Edit Appointment**, **Log**, etc.
 *
 * Care Team Confirmation Workflow:
 *   New appointments have NOT yet been confirmed. To confirm, the modal may
 *   show either:
 *     a) A bulk **Confirm Appointment** button at the bottom of the modal
 *     b) Individual **Confirm** buttons next to each staff member
 *   After clicking either, the status updates to "Confirmed" badges.
 *
 * @example
 *   const appointmentModal = new AppointmentDetailPage(page);
 *   await appointmentModal.verifyCareTeamConfirmed();
 *   await appointmentModal.performCheckIn();
 */
export class AppointmentDetailPage extends BasePage {
  // =========================================================================
  // Locators
  // =========================================================================

  /** The main appointment detail modal/drawer container */
  readonly modalContainer: Locator;

  /** Care Team section heading or container within the modal */
  readonly careTeamSection: Locator;

  /** All visible "Confirmed" status badges within the Care Team section */
  readonly confirmedBadges: Locator;

  /** Bulk "Confirm Appointment" button at the bottom of the modal */
  readonly confirmAppointmentButton: Locator;

  /** All visible individual "Confirm" buttons within the Care Team section */
  readonly individualConfirmButtons: Locator;

  /** The "Check-In" button in the modal's bottom action bar */
  readonly checkInButton: Locator;

  /** Success toast that appears after a successful action (check-in, etc.) */
  readonly successToast: Locator;

  constructor(page: Page) {
    super(page);

    // The appointment detail modal — could be a Bootstrap modal, offcanvas,
    // a native HTML <dialog>, or a custom overlay panel.
    this.modalContainer = page.locator(
      '.modal.show, .modal.fade.show, .offcanvas.show, ' +
      'div[class*=\"drawer\"].show, div[role=\"dialog\"][aria-modal=\"true\"], ' +
      'dialog, .appointment-detail-modal, [class*=\"appointment-detail\"]',
    ).last();

    // Care Team section — heading or wrapper that contains staff rows
    this.careTeamSection = this.modalContainer.locator(
      'div:has-text(\"Care Team\"), .care-team, [class*=\"care-team\"], ' +
      'section:has-text(\"Care Team\"), fieldset:has-text(\"Care Team\")',
    ).first();

    // All "Confirmed" status badges within the Care Team section
    // Appear after a staff member is confirmed (replaces the Confirm button).
    this.confirmedBadges = this.modalContainer.locator(
      '.badge:has-text("Confirmed"), span:has-text("Confirmed"), [class*="confirmed"]:has-text("Confirmed")',
    );

    // Bulk "Confirm Appointment" button at the bottom of the modal.
    // When present, clicking it confirms all assigned staff at once.
    this.confirmAppointmentButton = this.modalContainer.locator(
      'button:has-text("Confirm Appointment"), button:has-text("Confirm All"), .btn-confirm-appointment',
    ).first();

    // Individual "Confirm" buttons within the Care Team section.
    // When no bulk button exists, each staff member row has its own button.
    this.individualConfirmButtons = this.modalContainer.locator(
      'button:has-text("Confirm"):visible, .btn-confirm:visible, [class*="confirm"]:visible',
    );

    // Check-In link in the bottom action bar of the modal
    // Based on DOM inspection: Check-In is an <a> link (not a <button>)
    // with href pointing to visits/start/{id}. We match by text and href.
    this.checkInButton = this.modalContainer.locator(
      'a:has-text("Check-In"), a:has-text("Check In"), ' +
      'a[href*="visits/start"], button:has-text("Check-In"), ' +
      'button:has-text("Check In"), .btn-check-in, [class*="check-in"]',
    ).first();

    // Success notification toast/alert
    this.successToast = page.locator(
      '.alert-success, .toast-success, .success-message, ' +
      '.swal2-popup:has-text(\"success\"), .swal2-popup:has-text(\"Success\"), ' +
      '[class*=\"success\"]',
    ).first();
  }

  // =========================================================================
  // Care Team — Conditionally Confirm Members & Verify Status
  // =========================================================================

  /**
   * Confirm all care team members and verify their "Confirmed" status badges.
   *
   * New appointments with status "New" have NOT yet been confirmed. The modal
   * may offer one of two confirmation mechanisms:
   *   a) **Bulk Confirm** — A "Confirm Appointment" button at the bottom of
   *      the modal that confirms all assigned staff at once.
   *   b) **Individual Confirm** — A "Confirm" button next to each staff
   *      member in the Care Team section.
   *
   * For already-confirmed appointments (status already updated), the method
   * skips clicking and directly asserts the "Confirmed" badges.
   *
   * Workflow:
   *   1. Wait for the modal to be fully visible
   *   2. Check if "Confirmed" badges already exist (quick check) — if so, skip
   *   3. Look for a bulk "Confirm Appointment" button → click it if present
   *   4. Otherwise, look for individual "Confirm" buttons → click each one
   *   5. Wait for all buttons to be replaced by "Confirmed" status badges
   *   6. Assert at least one badge is visible and return the count
   *
   * @returns The number of "Confirmed" status badges found after confirmation
   */
  async verifyCareTeamConfirmed(): Promise<number> {
    console.log('[AppointmentModal] Verifying care team confirmation status...');

    // -----------------------------------------------------------------------
    // 1. Wait for the modal to be fully visible
    // -----------------------------------------------------------------------
    await this.modalContainer.waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForAnimation(500);

    // -----------------------------------------------------------------------
    // 2. Quick check: are "Confirmed" badges already present?
    //    If the appointment was previously confirmed, we skip clicking.
    // -----------------------------------------------------------------------
    const alreadyConfirmed = await this.confirmedBadges.first().isVisible({ timeout: 1000 }).catch(() => false);

    if (alreadyConfirmed) {
      const count = await this.confirmedBadges.count();
      console.log(`[AppointmentModal] Already confirmed — found ${count} confirmed badge(s)`);
      return count;
    }

    // -----------------------------------------------------------------------
    // 3. Not yet confirmed — look for a bulk "Confirm Appointment" button
    // -----------------------------------------------------------------------
    const bulkButtonVisible = await this.confirmAppointmentButton.isVisible({ timeout: 1500 }).catch(() => false);

    if (bulkButtonVisible) {
      console.log('[AppointmentModal] Bulk "Confirm Appointment" button detected — clicking...');
      await this.confirmAppointmentButton.click();

      // Wait for Livewire to process the confirmation and update the DOM
      await this.waitForAnimation(2000);
    } else {
      // ---------------------------------------------------------------------
      // 4. No bulk button — try clicking individual "Confirm" buttons
      // ---------------------------------------------------------------------
      const individualCount = await this.individualConfirmButtons.count().catch(() => 0);
      console.log(`[AppointmentModal] Found ${individualCount} individual Confirm button(s)`);

      if (individualCount === 0) {
        console.log('[AppointmentModal] No confirm action needed — care team may be empty');
        return 0;
      }

      // Click each visible Confirm button sequentially
      for (let i = 0; i < individualCount; i++) {
        // Re-query fresh each iteration to handle DOM mutations (button → badge)
        const btn = this.individualConfirmButtons.first();
        const btnVisible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
        if (!btnVisible) break;

        const btnText = (await btn.textContent())?.trim() || '';
        console.log(`[AppointmentModal] Clicking Confirm button #${i + 1}: "${btnText}"`);

        await btn.click();
        await this.waitForAnimation(800);
      }
    }

    // -----------------------------------------------------------------------
    // 5. Wait for "Confirmed" badges to appear after our click action
    // -----------------------------------------------------------------------
    await expect(this.confirmedBadges.first()).toBeVisible({ timeout: 8000 });
    await this.waitForAnimation(500);

    // -----------------------------------------------------------------------
    // 6. Return final count of confirmed badges
    // -----------------------------------------------------------------------
    const finalCount = await this.confirmedBadges.count();
    console.log(`[AppointmentModal] Successfully confirmed — ${finalCount} confirmed badge(s) now visible`);

    return finalCount;
  }

  // =========================================================================
  // Check-In
  // =========================================================================

  /**
   * Click the "Check-In" button at the bottom of the appointment modal
   * and wait for the action to complete.
   *
   * After clicking Check-In, the system typically:
   * - Shows a success toast/notification
   * - Redirects to the Visit Details page (/visits/{id}/edit)
   *
   * The method uses a web-first assertion (`expect().toBeVisible()`) with
   * an extended timeout to handle Livewire re-renders that may temporarily
   * detach the button from the DOM after care team confirmation.
   *
   * @returns The success message text if a toast appears, or empty string
   */
  async performCheckIn(): Promise<string> {
    console.log('[AppointmentModal] Performing check-in...');

    // Wait for the modal container to be fully visible after any re-render
    await expect(this.modalContainer).toBeVisible({ timeout: 10000 });

    // Web-first assertion with extended timeout: this handles Livewire/AJAX
    // re-renders that may transiently detach the button from the DOM after
    // care team confirmation. The assertion auto-retries for up to 15s.
    await expect(this.checkInButton).toBeVisible({ timeout: 15000 });

    // Scroll the modal content to bring the button into view if needed
    await this.modalContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    }).catch(() => {});
    await this.waitForAnimation(500);

    // Click the Check-In button
    console.log('[AppointmentModal] Clicking Check-In button...');
    await this.checkInButton.click();

    // Wait for the UI to process the check-in action
    await this.waitForAnimation(2000);

    // Check for a SweetAlert2 success popup first
    const swalPopup = this.page.locator('.swal2-popup').first();
    if (await swalPopup.isVisible({ timeout: 3000 }).catch(() => false)) {
      const popupText = await this.page.evaluate(() => {
        const containers = [
          document.querySelector('.swal2-html-container'),
          document.querySelector('.swal2-content'),
          document.querySelector('.swal2-title'),
        ];
        for (const el of containers) {
          if (el?.textContent?.trim()) return el.textContent.trim().slice(0, 500);
        }
        return '';
      }).catch(() => '');

      console.log(`[AppointmentModal] SweetAlert2 popup: \"${popupText}\"`);

      // Dismiss the popup
      const okBtn = swalPopup.locator('button:has-text(\"OK\"), .swal2-confirm, button:has-text(\"ok\")').first();
      if (await okBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await okBtn.click();
        await this.waitForAnimation(500);
      }

      return popupText;
    }

    // Otherwise check for a standard success toast
    const toastVisible = await this.successToast.isVisible({ timeout: 5000 }).catch(() => false);
    if (toastVisible) {
      const message = await this.getText(this.successToast);
      console.log(`[AppointmentModal] Success toast: \"${message}\"`);
      return message;
    }

    // If no popup or toast, check if redirected to visits page
    const currentUrl = this.getCurrentUrl();
    if (/\/visits\/\d+\/edit/.test(currentUrl)) {
      console.log('[AppointmentModal] Check-in completed — redirected to Visit page');
      return 'Checked-In';
    }

    console.warn('[AppointmentModal] Check-in completed but no confirmation message detected');
    return '';
  }

  // =========================================================================
  // Utility
  // =========================================================================

  /**
   * Check if the appointment detail modal is currently visible.
   *
   * Uses a web-first assertion with auto-retry to handle Livewire rendering
   * and Bootstrap animation timing. Throws if the modal does not become
   * visible within the default timeout.
   *
   * @param timeout - Optional timeout in ms (default: 10000)
   */
  async waitForModalVisible(timeout: number = 10000): Promise<void> {
    await expect(this.modalContainer).toBeVisible({ timeout });
  }

  /**
   * Quickly check if the appointment detail modal is currently visible.
   *
   * Uses a short timeout to avoid long waits when the modal is absent.
   * For most scenarios, prefer `waitForModalVisible()` which uses web-first
   * auto-retry assertions.
   *
   * @param timeout - Optional timeout in ms (default: 1000)
   */
  async isModalVisible(timeout: number = 1000): Promise<boolean> {
    try {
      await expect(this.modalContainer).toBeVisible({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close/dismiss the appointment detail modal.
   */
  async closeModal(): Promise<void> {
    const closeButton = this.modalContainer.locator(
      'button.close, .btn-close, button:has-text(\"Close\"), button:has-text(\"close\")',
    ).first();

    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }

    await this.waitForAnimation(500);
  }
}
