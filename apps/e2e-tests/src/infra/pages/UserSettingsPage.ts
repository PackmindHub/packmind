import { IUserSettingsPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import {
  CliAuthenticationDataTestIds,
  SettingsPageDataTestId,
} from '@packmind/frontend';

export class UserSettingsPage
  extends AbstractPackmindAppPage
  implements IUserSettingsPage
{
  expectedUrl(): string {
    return '/org/**/account-settings';
  }

  getMcpToken(): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async getApiKey(): Promise<string> {
    await this.page
      .getByTestId(SettingsPageDataTestId.CliAccordionHeader)
      .click();
    await this.page.getByRole('tab', { name: 'Environment Variable' }).click();
    await this.page
      .getByTestId(CliAuthenticationDataTestIds.GenerateApiKeyCTA)
      .click();

    return this.page
      .getByTestId(CliAuthenticationDataTestIds.ApiKeyInput)
      .inputValue();
  }
}
