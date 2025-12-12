import {
  IPackmindAppPage,
  IRecipesPage,
  IStandardsPage,
} from '../../domain/pages';
import { AbstractPackmindPage } from './AbstractPackmindPage';
import { SidebarAccountsMenuDataTestIds } from '@packmind/frontend';

export abstract class AbstractPackmindAppPage
  extends AbstractPackmindPage
  implements IPackmindAppPage
{
  openRecipes(): Promise<IRecipesPage> {
    throw new Error('Not implemented yet');
  }

  openStandards(): Promise<IStandardsPage> {
    throw new Error('Not implemented yet');
  }

  async openUserSettings() {
    await this.page
      .getByTestId(SidebarAccountsMenuDataTestIds.OpenSubMenuCTA)
      .click();

    await this.page
      .getByTestId(SidebarAccountsMenuDataTestIds.OpenUserSettingsCTA)
      .click();

    return this.pageFactory.getUserSettingsPage();
  }
}
