import { SignUpWithOrganizationCommand } from '@packmind/types';

export interface IPackmindPage {
  waitForLoaded(): Promise<void>;
  reload(): Promise<void>;
}

export interface IPackmindAppPage extends IPackmindPage {
  openStandards(): Promise<IStandardsPage>;
  openCommands(): Promise<ICommandsPage>;
  openPackages(): Promise<IPackagesPage>;
  openSettings(): Promise<ISettingsPage>;
  openUserSettings(): Promise<IUserSettingsPage>;
  signOut(): Promise<void>;
}

export interface ISignUpOptionsPage extends IPackmindPage {
  clickCreateAccount(): Promise<ISignUpPage>;
}

export interface ISignUpPage extends IPackmindPage {
  signup(
    email: string,
    password: string,
    organizationName: string,
  ): Promise<IDashboardPage>;
}

export interface IDashboardPage extends IPackmindAppPage {
  expectWelcomeMessage(): Promise<void>;
}

export interface IStandardsPage extends IPackmindAppPage {
  listStandards(): Promise<{ name: string }[]>;
  openCreateStandards(): Promise<ICreateStandardPage>;
  openStandard(name: string): Promise<IStandardPage>;
}

export interface IStandardPage extends IPackmindAppPage {
  readStandard(): Promise<{ name: string; description: string; scope: string }>;
}

export interface IPackagesPage extends IPackmindAppPage {
  openPackage(packageName: string): Promise<IPackagePage>;
}

export interface IPackagePage extends IPackmindAppPage {
  openDistributionsTab(): Promise<void>;
  listDistributions(): Promise<{ target: string; author: string }[]>;
}

export interface ICreateStandardPage extends IPackmindAppPage {
  createStandard(
    name: string,
    description: string,
    scope: string,
  ): Promise<IStandardsPage>;
}

export interface ICommandsPage extends IPackmindAppPage {
  listCommands(): Promise<{ commandName: string }[]>;
}

export interface ISettingsPage extends IPackmindAppPage {
  openGitSettings(): Promise<IGitSettingsPage>;
  openUsersSettings(): Promise<IUsersSettingsPage>;
}

export interface IUsersSettingsPage extends IPackmindAppPage {
  inviteUser(email: string): Promise<void>;
  getInvitationToken(): Promise<string>;
}

export interface IGitSettingsPage extends IPackmindAppPage {
  listGitProviders(): Promise<
    { provider: string; repositoriesCount: number; tokenLess: boolean }[]
  >;
}

export interface IUserSettingsPage extends IPackmindAppPage {
  getMcpToken(): Promise<string>;
  getApiKey(): Promise<string>;
}

export interface IInvitationPage extends IPackmindPage {
  activateAccount(password: string): Promise<IDashboardPage>;
}

export interface IStartTrialPage extends IPackmindPage {
  continueToAgentSelection(): Promise<IStartTrialAgentSelectorPage>;
}

export interface IStartTrialAgentSelectorPage extends IPackmindPage {
  selectAgent(agentValue: string): Promise<IStartTrialAgentPage>;
}

export interface IMcpConfig {
  url: string;
  token: string;
}

export interface IStartTrialAgentPage extends IPackmindPage {
  getMcpConfig(): Promise<IMcpConfig>;
  createAccount(): Promise<IActivateAccountPage>;
}

export interface IActivateAccountPage extends IPackmindPage {
  activateAccount(
    userData: Pick<
      SignUpWithOrganizationCommand,
      'organizationName' | 'email' | 'password'
    >,
  ): Promise<IDashboardPage>;
}

export interface IPageFactory {
  getSignupPage(): Promise<ISignUpPage>;
  getSignupOptionsPage(): Promise<ISignUpOptionsPage>;
  getSignupFormPage(): Promise<ISignUpPage>;
  getDashboardPage(): Promise<IDashboardPage>;
  getUserSettingsPage(): Promise<IUserSettingsPage>;
  getUsersSettingsPage(): Promise<IUsersSettingsPage>;
  getPackagesPage(): Promise<IPackagesPage>;
  getPackagePage(): Promise<IPackagePage>;
  getSettingsPage(): Promise<ISettingsPage>;
  getGitSettingsPage(): Promise<IGitSettingsPage>;
  getInvitationPage(token: string): Promise<IInvitationPage>;
  getStartTrialPage(): Promise<IStartTrialPage>;
  getStartTrialAgentSelectorPage(): Promise<IStartTrialAgentSelectorPage>;
  getStartTrialAgentPage(agent: string): Promise<IStartTrialAgentPage>;
  getActivateAccountPage(): Promise<IActivateAccountPage>;
}
