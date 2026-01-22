import { PreInstallationInfoDataTestIds } from '@packmind/frontend';
import { AbstractPackmindPage } from './AbstractPackmindPage';
import {
  IStartTrialPage,
  IStartTrialAgentSelectorPage,
} from '../../domain/pages';

export class StartTrialPage
  extends AbstractPackmindPage
  implements IStartTrialPage
{
  async continueToAgentSelection(): Promise<IStartTrialAgentSelectorPage> {
    await this.page
      .getByTestId(PreInstallationInfoDataTestIds.ContinueButton)
      .click();

    return this.pageFactory.getStartTrialAgentSelectorPage();
  }

  expectedUrl(): RegExp {
    return /\/quick-start$/;
  }
}
