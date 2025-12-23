import { test as base } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { IPackmindApi } from '../domain/api/IPackmindApi';
import { PackmindApi } from '../infra/api/PackmindApi';
import { SignUpWithOrganizationCommand } from '@packmind/types';
import { IDashboardPage, IPageFactory } from '../domain/pages';
import { PageFactory } from '../infra/PageFactory';

export const testWithUserData = base.extend<{
  userData: SignUpWithOrganizationCommand;
  effectiveBaseUrl: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  userData: ({}, use) => {
    use({
      email: `someone-${uuidv4()}@example.com`,
      password: uuidv4(),
      organizationName: `my-organization-${uuidv4()}`,
    });
  },
  // For tests running inside docker - we connect to the app via frontend:4200, but the app consider it serves on localhost.
  effectiveBaseUrl: ({ baseURL }, use) => {
    use(baseURL?.replace('frontend', 'localhost') ?? '');
  },
});

export const testWithUserSignedUp = testWithUserData.extend<{
  dashboardPage: IDashboardPage;
}>({
  dashboardPage: async ({ userData, page }, use) => {
    const pageFactory: IPageFactory = new PageFactory(page);

    const signupPage = await pageFactory.getSignupPage();
    const dashboardPage = await signupPage.signup(
      userData.email,
      userData.password,
      userData.organizationName,
    );

    await dashboardPage.expectWelcomeMessage();
    await use(dashboardPage);
  },
});

export const testWithApi = testWithUserSignedUp.extend<{
  packmindApi: IPackmindApi;
}>({
  packmindApi: async ({ dashboardPage, request }, use) => {
    const userSettingsPage = await dashboardPage.openUserSettings();
    const apiKey = await userSettingsPage.getApiKey();
    const publicApi = new PackmindApi(request, apiKey);

    await use(publicApi);
  },
});
