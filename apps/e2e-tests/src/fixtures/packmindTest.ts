import { test as base } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { IPackmindApi } from '../domain/api/IPackmindApi';
import { PackmindApi } from '../infra/api/PackmindApi';
import { SignUpWithOrganizationCommand } from '@packmind/types';
import { IDashboardPage, IPageFactory } from '../domain/pages';
import { PageFactory } from '../infra/PageFactory';

export const testWithUserData = base.extend<{
  underFeatureFlag: boolean;
  userData: SignUpWithOrganizationCommand & { password: string };
}>({
  underFeatureFlag: [false, { option: true }],
  userData: async ({ underFeatureFlag }, use) => {
    await use({
      email: `test-${uuidv4()}@${underFeatureFlag ? 'packmind' : 'example'}.com`,
      password: `${uuidv4()}!!`,
      method: 'password',
    });
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
    );

    await dashboardPage.expectWelcomeMessage();
    await use(dashboardPage);
  },
});

export const testWithApi = testWithUserSignedUp.extend<{
  packmindApi: IPackmindApi;
}>({
  packmindApi: async ({ dashboardPage, request }, use) => {
    const cliSetupPage = await dashboardPage.openIntegrations();
    const apiKey = await cliSetupPage.getApiKey();
    const publicApi = new PackmindApi(request, apiKey);

    await use(publicApi);
  },
});
