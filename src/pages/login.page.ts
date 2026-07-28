import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // =========================================================================
  // Locators
  // =========================================================================
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly errorMessage: Locator;
  readonly loginForm: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);

    // Primary login form elements
    this.usernameInput = page.locator('input[name="username"], input[name="email"], input[id="username"], input[id="email"]');
    this.passwordInput = page.locator('input[name="password"], input[id="password"]');
    this.loginButton = page.locator('button[type="submit"], input[type="submit"]');
    this.rememberMeCheckbox = page.locator('input[name="remember"]');
    this.errorMessage = page.locator('.alert-danger, .error-message, [class*="error"], .invalid-feedback').first();
    this.loginForm = page.locator('form');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), a:has-text("نسيت")');
  }

  // =========================================================================
  // Actions
  // =========================================================================

  /**
   * Navigate to the login page.
   * Assumes the login page is at the root or /login.
   */
  async gotoLogin(): Promise<void> {
    // First try the base URL; the app may redirect to login automatically
    await this.goto('/');
    await this.waitForPageLoad();

    // Check if already redirected to login page
    const currentUrl = this.getCurrentUrl();
    if (!currentUrl.includes('login') && !currentUrl.includes('Login')) {
      // Explicitly navigate to /login if not already on a login page
      await this.goto('/login');
      await this.waitForPageLoad();
    }
  }

  /**
   * Perform login with the given credentials.
   *
   * @param username - Username or email address
   * @param password - Password
   */
  async login(username: string, password: string): Promise<void> {
    // Wait for the login form to be visible
    await this.waitForElementVisible(this.usernameInput);
    await this.waitForElementVisible(this.passwordInput);

    // Fill in credentials
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);

    // Submit the form
    await this.click(this.loginButton);

    // Wait for navigation to complete after login
    await this.waitForPageLoad();
    await this.waitForAnimation(1000); // Allow redirect/animation
  }

  /**
   * Check if the login was successful by verifying we've navigated away from the login page.
   */
  async isLoginSuccessful(): Promise<boolean> {
    await this.waitForAnimation(500);
    const currentUrl = this.getCurrentUrl();
    return !currentUrl.includes('login') && !currentUrl.includes('Login');
  }

  /**
   * Get the error message displayed after a failed login attempt.
   */
  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  /**
   * Check if there's a visible error message on the login form.
   */
  async hasError(): Promise<boolean> {
    try {
      await this.waitForElementVisible(this.errorMessage, 3000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if currently on the login page.
   */
  async isOnLoginPage(): Promise<boolean> {
    const url = this.getCurrentUrl();
    return (
      url.includes('login') ||
      url.includes('Login') ||
      (await this.usernameInput.isVisible())
    );
  }
}
