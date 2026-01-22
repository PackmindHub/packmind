import { AbstractPackmindPage } from './AbstractPackmindPage';
import {
  IStartTrialAgentSelectorPage,
  IStartTrialAgentPage,
} from '../../domain/pages';
import { StartTrialAgentSelectorDataTestIds } from '@packmind/frontend';

export class StartTrialAgentSelectorPage
  extends AbstractPackmindPage
  implements IStartTrialAgentSelectorPage
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
    return /\/quick-start\/select-agent$/;
  }
}
