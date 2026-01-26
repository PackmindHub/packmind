import { IUserSettingsPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';

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
    // Navigate to Authenticate tab
    await this.page.getByRole('tab', { name: '2. Authenticate' }).click();
    // Select API key auth method
    await this.page
      .getByTestId(CliAuthenticationDataTestIds.AuthMethodApiKey)
      .click();
    // Generate API key
    await this.page
      .getByTestId(CliAuthenticationDataTestIds.GenerateApiKeyCTA)
      .click();

    return this.page
      .getByTestId(CliAuthenticationDataTestIds.ApiKeyInput)
      .inputValue();
  }
}
