import { test as base, Browser } from '@playwright/test';
import { chromium } from 'playwright-core';
import { v4 as uuidv4 } from 'uuid';
import { IPackmindApi } from '../domain/api/IPackmindApi';
import { PackmindApi } from '../infra/api/PackmindApi';
import { SignUpWithOrganizationCommand } from '@packmind/types';
import { IDashboardPage, IPageFactory } from '../domain/pages';
import { PageFactory } from '../infra/PageFactory';

// Override the built-in browser fixture to support Lightpanda via CDP
const testBase = base.extend<Record<string, never>, { browser: Browser }>({
  browser: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const wsEndpoint = process.env['LIGHTPANDA_WS_ENDPOINT'];
      if (wsEndpoint) {
        const browser = await chromium.connectOverCDP({
          endpointURL: wsEndpoint,
        });
        await use(browser as unknown as Browser);
        // Browser.disconnect() does not exist on CDP-connected browsers in playwright-core.
        // The connection closes naturally when the worker process exits; Lightpanda keeps running.
      } else {
        const browser = await chromium.launch();
        await use(browser);
        await browser.close();
      }
    },
    { scope: 'worker' },
  ],
});

export const testWithUserData = testBase.extend<{
  userData: SignUpWithOrganizationCommand;
}>({
  // eslint-disable-next-line no-empty-pattern
  userData: ({}, use) => {
    use({
      email: `someone-${uuidv4()}@example.com`,
      password: `${uuidv4()}!!`,
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
