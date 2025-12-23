import { AbstractPackmindPage } from './AbstractPackmindPage';
import { IStartTrialPage, IStartTrialAgentPage } from '../../domain/pages';
import { StartTrialAgentSelectorDataTestIds } from '@packmind/frontend';

export class StartTrialPage
  extends AbstractPackmindPage
  implements IStartTrialPage
{
  async selectAgent(agentValue: string): Promise<IStartTrialAgentPage> {
    await this.page
      .getByTestId(
        `${StartTrialAgentSelectorDataTestIds.AgentOption}.${agentValue}`,
      )
      .click();
    await this.page
      .getByTestId(StartTrialAgentSelectorDataTestIds.ContinueButton)
      .click();

    return this.pageFactory.getStartTrialAgentPage(agentValue);
  }

  expectedUrl(): RegExp {
    return /\/start-trial$/;
  }
}
