export interface IPackmindPage {
  waitForLoaded(): Promise<void>;
  reload(): Promise<void>;
}

export interface IPackmindAppPage extends IPackmindPage {
  openStandards(): Promise<IStandardsPage>;
  openRecipes(): Promise<IRecipesPage>;
  openPackages(): Promise<IPackagesPage>;
  openSettings(): Promise<ISettingsPage>;
  openUserSettings(): Promise<IUserSettingsPage>;
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

export interface IRecipesPage extends IPackmindAppPage {
  listRecipes(): Promise<{ IRecipesPagename: string }[]>;
}

export interface ISettingsPage extends IPackmindAppPage {
  openGitSettings(): Promise<IGitSettingsPage>;
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

export interface IPageFactory {
  getSignupPage(): Promise<ISignUpPage>;
  getDashboardPage(): Promise<IDashboardPage>;
  getUserSettingsPage(): Promise<IUserSettingsPage>;
  getPackagesPage(): Promise<IPackagesPage>;
  getPackagePage(): Promise<IPackagePage>;
  getSettingsPage(): Promise<ISettingsPage>;
  getGitSettingsPage(): Promise<IGitSettingsPage>;
}
