import { type Locator, type Page } from '@playwright/test';

/**
 * Base page class providing shared functionality for all page objects.
 * Every page object should extend this class.
 */
export abstract class BasePage {
  protected readonly page: Page;

  /** Default navigation timeout (ms) */
  protected readonly navigationTimeout: number;

  /** Default element wait timeout (ms) */
  protected readonly elementTimeout: number;

  constructor(page: Page) {
    this.page = page;
    this.navigationTimeout = 30_000;
    this.elementTimeout = 10_000;
  }

  // =========================================================================
  // Navigation
  // =========================================================================

  /**
   * Navigate to a relative or absolute URL.
   * If a relative path is given, it's resolved relative to baseURL from config.
   */
  async goto(url: string = '/'): Promise<void> {
    await this.page.goto(url, {
      waitUntil: 'networkidle',
      timeout: this.navigationTimeout,
    });
  }

  /**
   * Reload the current page and wait for it to settle.
   */
  async reload(): Promise<void> {
    await this.page.reload({
      waitUntil: 'networkidle',
      timeout: this.navigationTimeout,
    });
  }

  /**
   * Get the current page URL.
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  // =========================================================================
  // Waiting & Assertions
  // =========================================================================

  /**
   * Wait for an element to be visible on the page.
   */
  async waitForElementVisible(
    locator: Locator,
    timeout?: number,
  ): Promise<void> {
    await locator.waitFor({
      state: 'visible',
      timeout: timeout ?? this.elementTimeout,
    });
  }

  /**
   * Wait for an element to be hidden/removed from the page.
   */
  async waitForElementHidden(
    locator: Locator,
    timeout?: number,
  ): Promise<void> {
    await locator.waitFor({
      state: 'hidden',
      timeout: timeout ?? this.elementTimeout,
    });
  }

  /**
   * Wait for page to reach a "loaded" state.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle', {
      timeout: this.navigationTimeout,
    });
  }

  /**
   * Pause briefly for UI animations to complete. Use sparingly.
   */
  async waitForAnimation(ms: number = 500): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  // =========================================================================
  // Interactions
  // =========================================================================

  /**
   * Click an element after ensuring it's visible.
   */
  async click(locator: Locator): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.click();
  }

  /**
   * Fill an input field after ensuring it's visible and enabled.
   */
  async fill(locator: Locator, value: string | number): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.click();
    await locator.fill(String(value));
  }

  /**
   * Select an option from a <select> element by label.
   */
  async selectByLabel(locator: Locator, label: string): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.selectOption({ label });
  }

  /**
   * Select an option from a <select> element by value.
   */
  async selectByValue(locator: Locator, value: string): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.selectOption({ value });
  }

  /**
   * Get the text content of an element.
   */
  async getText(locator: Locator): Promise<string> {
    await this.waitForElementVisible(locator);
    const text = await locator.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Check if an element is visible on the page.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Take a screenshot of the current page state.
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/artifacts/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  // =========================================================================
  // Alerts / Dialogs
  // =========================================================================

  /**
   * Accept a browser dialog (alert, confirm, prompt) if one appears.
   */
  async acceptDialog(): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
  }

  /**
   * Dismiss a browser dialog (cancel confirm, etc.) if one appears.
   */
  async dismissDialog(): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Get a locator by its test ID (data-testid attribute).
   */
  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get a locator by its role and name.
   */
  protected getByRole(role: string, name?: string): Locator {
    const options = name ? { name } : undefined;
    return this.page.getByRole(role as any, options);
  }

  /**
   * Get a locator by its label text (for form fields).
   */
  protected getByLabel(label: string): Locator {
    return this.page.getByLabel(label);
  }

  /**
   * Get a locator by placeholder text.
   */
  protected getByPlaceholder(placeholder: string): Locator {
    return this.page.getByPlaceholder(placeholder);
  }

  /**
   * Get a locator by its text content.
   */
  protected getByText(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
