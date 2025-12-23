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
    await this.page
      .getByTestId(StartTrialAgentPageDataTestIds.CreateAccountButton)
      .click();

    return this.pageFactory.getActivateAccountPage();
  }
}
