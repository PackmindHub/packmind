import {
  IDashboardPage,
  IPackmindPage,
  IPageFactory,
  ISignupPage,
} from '../domain/pages';
import { Page } from '@playwright/test';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';

export type Constructor<T> = new (page: Page, pageFactory: IPageFactory) => T;

export class PageFactory implements IPageFactory {
  constructor(private readonly page: Page) {}

  async getSignupPage(): Promise<ISignupPage> {
    await this.page.goto('/sign-up');
    return this.getPageInstance(SignupPage);
  }

  async getDashboardPage(): Promise<IDashboardPage> {
    return this.getPageInstance(DashboardPage);
  }

  private async getPageInstance<T extends IPackmindPage>(
    constructor: Constructor<T>,
  ): Promise<T> {
    const page = new constructor(this.page, this);
    await page.waitForLoaded();
    return page;
  }
}
