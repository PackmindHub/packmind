import {
  IActivateAccountPage,
  IDashboardPage,
  IGitSettingsPage,
  IInvitationPage,
  IPackagePage,
  IPackagesPage,
  IPackmindPage,
  IPageFactory,
  ISettingsPage,
  ISignUpPage,
  IStartTrialAgentPage,
  IStartTrialPage,
  IUserSettingsPage,
  IUsersSettingsPage,
} from '../domain/pages';
import { Page } from '@playwright/test';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserSettingsPage } from './pages/UserSettingsPage';
import { UsersSettingsPage } from './pages/UsersSettingsPage';
import { PackagesPage } from './pages/PackagesPage';
import { PackagePage } from './pages/PackagePage';
import { SettingsPage } from './pages/SettingsPage';
import { GitSettings } from './pages/GitSettingsPage';
import { InvitationPage } from './pages/InvitationPage';
import { StartTrialPage } from './pages/StartTrialPage';
import { ClaudeStartTrialAgentPage } from './pages/ClaudeStartTrialAgentPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';

export type Constructor<T> = new (page: Page, pageFactory: IPageFactory) => T;

export class PageFactory implements IPageFactory {
  constructor(private readonly page: Page) {}

  async getSignupPage(): Promise<ISignUpPage> {
    await this.page.goto('/sign-up');
    return this.getPageInstance(SignupPage);
  }

  async getDashboardPage(): Promise<IDashboardPage> {
    return this.getPageInstance(DashboardPage);
  }

  async getUserSettingsPage(): Promise<IUserSettingsPage> {
    return this.getPageInstance(UserSettingsPage);
  }

  async getUsersSettingsPage(): Promise<IUsersSettingsPage> {
    return this.getPageInstance(UsersSettingsPage);
  }

  getPackagesPage(): Promise<IPackagesPage> {
    return this.getPageInstance(PackagesPage);
  }

  getPackagePage(): Promise<IPackagePage> {
    return this.getPageInstance(PackagePage);
  }

  getSettingsPage(): Promise<ISettingsPage> {
    return this.getPageInstance(SettingsPage);
  }

  getGitSettingsPage(): Promise<IGitSettingsPage> {
    return this.getPageInstance(GitSettings);
  }

  async getInvitationPage(token: string): Promise<IInvitationPage> {
    await this.page.goto(`/activate?token=${token}`);
    return this.getPageInstance(InvitationPage);
  }

  async getStartTrialPage(): Promise<IStartTrialPage> {
    await this.page.goto('/start-trial');
    return this.getPageInstance(StartTrialPage);
  }

  async getStartTrialAgentPage(agent: string): Promise<IStartTrialAgentPage> {
    switch (agent) {
      case 'claude':
        return this.getPageInstance(ClaudeStartTrialAgentPage);
      default:
        throw new Error(`Unsupported agent: ${agent}`);
    }
  }

  async getActivateAccountPage(): Promise<IActivateAccountPage> {
    return this.getPageInstance(ActivateAccountPage);
  }

  private async getPageInstance<T extends IPackmindPage>(
    constructor: Constructor<T>,
  ): Promise<T> {
    const page = new constructor(this.page, this);
    await page.waitForLoaded();
    return page;
  }
}
