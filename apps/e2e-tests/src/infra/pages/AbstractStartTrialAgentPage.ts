import { AbstractPackmindPage } from './AbstractPackmindPage';
import {
  IStartTrialAgentPage,
  IActivateAccountPage,
  IMcpConfig,
} from '../../domain/pages';
import { StartTrialAgentPageDataTestIds } from '@packmind/frontend';

export abstract class AbstractStartTrialAgentPage
  extends AbstractPackmindPage
  implements IStartTrialAgentPage
{
  abstract getMcpConfig(): Promise<IMcpConfig>;

  async createAccount(): Promise<IActivateAccountPage> {
    // Wait for and click the Setup Completed button (using flexible text locator)
    await this.page
      .getByText(/setup.*completed/i)
      .waitFor({ state: 'visible', timeout: 30000 });

    await this.page.getByText(/setup.*completed/i).click();

    // Wait for and click the Analysis Completed button (using flexible text locator)
    await this.page
      .getByText(/analysis.*completed/i)
      .waitFor({ state: 'visible', timeout: 30000 });

    await this.page.getByText(/analysis.*completed/i).click();

    // Wait for the CreateAccount button to be available
    // This happens after MCP is connected and playbook is generated
    await this.page
      .getByTestId(StartTrialAgentPageDataTestIds.CreateAccountButton)
      .waitFor({ state: 'visible', timeout: 30000 });

    await this.page
      .getByTestId(StartTrialAgentPageDataTestIds.CreateAccountButton)
      .click();

    return this.pageFactory.getActivateAccountPage();
  }
}
