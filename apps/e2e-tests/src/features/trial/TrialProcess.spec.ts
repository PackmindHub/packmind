import { IPageFactory } from '../../domain/pages';
import { PageFactory } from '../../infra/PageFactory';
import { testWithUserData } from '../../fixtures/packmindTest';
import { expect } from '@playwright/test';

testWithUserData.describe('Trial Process', () => {
  testWithUserData.skip(
    'User completes the full trial process from agent selection to account activation',
    async ({ page, userData, effectiveBaseUrl }) => {
      const pageFactory: IPageFactory = new PageFactory(page);

      const startTrialPage = await pageFactory.getStartTrialPage();
      const startTrialAgentPage = await startTrialPage.selectAgent('claude');

      const mcpConfig = await startTrialAgentPage.getMcpConfig();
      // eslint-disable-next-line playwright/no-standalone-expect
      expect(mcpConfig.url).toEqual(`${effectiveBaseUrl}/mcp`);

      const activateAccountPage = await startTrialAgentPage.createAccount();
      const dashboardPage = await activateAccountPage.activateAccount(userData);

      await dashboardPage.expectWelcomeMessage();
    },
  );
});
