import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface EmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role?: string;
  department?: string;
  employeeId?: string;
  dateOfJoining?: string;
  salary?: number;
}

export class EmployeesPage extends BasePage {
  // =========================================================================
  // Locators
  // =========================================================================

  // Navigation
  readonly employeesSidebarLink: Locator;
  readonly addEmployeeButton: Locator;

  // Form Fields
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly roleSelect: Locator;
  readonly departmentSelect: Locator;
  readonly employeeIdInput: Locator;
  readonly dateOfJoiningInput: Locator;
  readonly salaryInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Search & Table
  readonly searchInput: Locator;
  readonly employeeTable: Locator;
  readonly employeeTableRows: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation
    this.employeesSidebarLink = page.locator(
      'a:has-text("Employees"), a:has-text("employees"), a[href*="employee"], [data-testid="employees-link"], .nav-item:has-text("Employees")',
    ).first();
    this.addEmployeeButton = page.locator(
      'button:has-text("Add Employee"), a:has-text("Add Employee"), [data-testid="add-employee"]',
    ).first();

    // Form Fields
    this.firstNameInput = page.locator(
      'input[name="first_name"], input[name="firstName"], input[id="first_name"], input[id="firstName"], [data-testid="emp-first-name"]',
    ).first();
    this.lastNameInput = page.locator(
      'input[name="last_name"], input[name="lastName"], input[id="last_name"], input[id="lastName"], [data-testid="emp-last-name"]',
    ).first();
    this.emailInput = page.locator(
      'input[name="email"], input[id="email"], [data-testid="emp-email"]',
    ).first();
    this.phoneInput = page.locator(
      'input[name="phone"], input[name="mobile"], input[id="phone"], [data-testid="emp-phone"]',
    ).first();
    this.roleSelect = page.locator(
      'select[name="role"], select[id="role"], [data-testid="role"]',
    ).first();
    this.departmentSelect = page.locator(
      'select[name="department"], select[id="department"], [data-testid="department"]',
    ).first();
    this.employeeIdInput = page.locator(
      'input[name="employee_id"], input[name="emp_id"], input[id="employee_id"], [data-testid="employee-id"]',
    ).first();
    this.dateOfJoiningInput = page.locator(
      'input[name="date_of_joining"], input[name="joining_date"], input[type="date"]',
    ).first();
    this.salaryInput = page.locator(
      'input[name="salary"], input[name="sal"], input[id="salary"], [data-testid="salary"]',
    ).first();
    this.saveButton = page.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), [data-testid="save-employee"]',
    ).first();
    this.cancelButton = page.locator(
      'button:has-text("Cancel"), a:has-text("Cancel")',
    ).first();

    // Search & Table
    this.searchInput = page.locator(
      'input[type="search"], input[name="search"], input[placeholder*="Search"]',
    ).first();
    this.employeeTable = page.locator('table').first();
    this.employeeTableRows = page.locator('table tbody tr, table tr[data-employee-id]');
    this.successMessage = page.locator(
      '.alert-success, .toast-success, [class*="success"]',
    ).first();
  }

  // =========================================================================
  // Actions
  // =========================================================================

  /**
   * Navigate to the Employees list page via the sidebar.
   */
  async navigateToEmployees(): Promise<void> {
    await this.click(this.employeesSidebarLink);
    await this.waitForPageLoad();
  }

  /**
   * Open the Add Employee form.
   */
  async openAddEmployeeForm(): Promise<void> {
    await this.click(this.addEmployeeButton);
    await this.waitForAnimation(500);
  }

  /**
   * Fill the employee creation form.
   */
  async fillEmployeeForm(employee: EmployeeData): Promise<void> {
    if (employee.firstName) await this.fill(this.firstNameInput, employee.firstName);
    if (employee.lastName) await this.fill(this.lastNameInput, employee.lastName);
    if (employee.email) await this.fill(this.emailInput, employee.email);
    if (employee.phone) await this.fill(this.phoneInput, employee.phone);
    if (employee.role) await this.selectByLabel(this.roleSelect, employee.role);
    if (employee.department) await this.selectByLabel(this.departmentSelect, employee.department);
    if (employee.employeeId) await this.fill(this.employeeIdInput, employee.employeeId);
    if (employee.dateOfJoining) await this.fill(this.dateOfJoiningInput, employee.dateOfJoining);
    if (employee.salary) await this.fill(this.salaryInput, String(employee.salary));
  }

  /**
   * Save the employee form.
   */
  async saveEmployee(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForPageLoad();
    await this.waitForAnimation(1000);
  }

  /**
   * Complete end-to-end flow: navigate, open form, fill, and save.
   */
  async addEmployee(employee: EmployeeData): Promise<void> {
    await this.openAddEmployeeForm();
    await this.fillEmployeeForm(employee);
    await this.saveEmployee();
  }

  /**
   * Search for an employee.
   */
  async searchEmployee(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.waitForAnimation(500);
  }

  /**
   * Get all employee entries from the table.
   */
  async getEmployeeList(): Promise<string[]> {
    await this.waitForElementVisible(this.employeeTableRows);
    return this.employeeTableRows.evaluateAll((rows) =>
      rows.map((row) => row.textContent?.trim() ?? ''),
    );
  }

  /**
   * Verify success indicator after creating an employee.
   */
  async isSuccessMessageVisible(): Promise<boolean> {
    try {
      await this.waitForElementVisible(this.successMessage, 5000);
      return true;
    } catch {
      return false;
    }
  }
}
