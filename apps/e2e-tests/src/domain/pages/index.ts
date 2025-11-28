export interface IPackmindPage {
  waitForLoaded(): Promise<void>;
}

export interface IPackmindAppPage extends IPackmindPage {
  openStandards(): Promise<IStandardsPage>;
  openRecipes(): Promise<IRecipesPage>;
}

export interface ISignupPage extends IPackmindPage {
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

export interface IPageFactory {
  getSignupPage(): Promise<ISignupPage>;
  getDashboardPage(): Promise<IDashboardPage>;
}
