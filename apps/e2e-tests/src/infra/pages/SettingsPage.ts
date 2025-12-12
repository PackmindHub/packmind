import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { IGitSettingsPage, ISettingsPage } from '../../domain/pages';
import { SettingsRouteDataTestIds } from '@packmind/frontend';

export class SettingsPage
  extends AbstractPackmindAppPage
  implements ISettingsPage
{
  async openGitSettings(): Promise<IGitSettingsPage> {
    await this.page.getByTestId(SettingsRouteDataTestIds.GitLink).click();

    return this.pageFactory.getGitSettingsPage();
  }

  expectedUrl(): string | RegExp {
    return /\/settings(\/[a-z]+)?/;
  }
}
