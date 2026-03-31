import {
  IActivateAccountPage,
  ICliSetupPage,
  IDashboardPage,
  IGitSettingsPage,
  IInvitationPage,
  IPackagePage,
  IPackagesPage,
  IPackmindPage,
  IPageFactory,
  ISettingsPage,
  ISignUpPage,
  ISkillsPage,
  IStandardsPage,
  IStartTrialAgentPage,
  IStartTrialAgentSelectorPage,
  IStartTrialPage,
  IUsersSettingsPage,
} from '../domain/pages';
import { Page } from '@playwright/test';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { CliSetupPage } from './pages/CliSetupPage';
import { UsersSettingsPage } from './pages/UsersSettingsPage';
import { SkillsPage } from './pages/SkillsPage';
import { StandardsPage } from './pages/StandardsPage';
import { PackagesPage } from './pages/PackagesPage';
import { PackagePage } from './pages/PackagePage';
import { SettingsPage } from './pages/SettingsPage';
import { GitSettings } from './pages/GitSettingsPage';
import { InvitationPage } from './pages/InvitationPage';
import { StartTrialPage } from './pages/StartTrialPage';
import { StartTrialAgentSelectorPage } from './pages/StartTrialAgentSelectorPage';
import { ClaudeStartTrialAgentPage } from './pages/ClaudeStartTrialAgentPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';

export type Constructor<T> = new (page: Page, pageFactory: IPageFactory) => T;

export class PageFactory implements IPageFactory {
  constructor(private readonly page: Page) {}

  async getSignupPage(): Promise<ISignUpPage> {
    await this.page.goto('/sign-up/create-account');
    return this.getPageInstance(SignupPage);
  }

  async getSignupFormPage(): Promise<ISignUpPage> {
    return this.getPageInstance(SignupPage);
  }

  async getDashboardPage(): Promise<IDashboardPage> {
    return this.getPageInstance(DashboardPage);
  }

  async getCliSetupPage(): Promise<ICliSetupPage> {
    return this.getPageInstance(CliSetupPage);
  }

  async getUsersSettingsPage(): Promise<IUsersSettingsPage> {
    return this.getPageInstance(UsersSettingsPage);
  }

  getSkillsPage(): Promise<ISkillsPage> {
    return this.getPageInstance(SkillsPage);
  }

  getStandardsPage(): Promise<IStandardsPage> {
    return this.getPageInstance(StandardsPage);
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
    await this.page.goto('/quick-start');
    return this.getPageInstance(StartTrialPage);
  }

  async getStartTrialAgentSelectorPage(): Promise<IStartTrialAgentSelectorPage> {
    await this.page.goto('/quick-start/select-agent');
    return this.getPageInstance(StartTrialAgentSelectorPage);
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
