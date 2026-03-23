import { ICliSetupPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';

export class CliSetupPage
  extends AbstractPackmindAppPage
  implements ICliSetupPage
{
  expectedUrl(): RegExp {
    return /\/org\/.*\/setup\/cli/;
  }

  async getApiKey(): Promise<string> {
    // Select API key auth method
    await this.page.getByText('API key', { exact: true }).click();
    // Generate API key
    await this.page
      .getByTestId(CliAuthenticationDataTestIds.GenerateApiKeyCTA)
      .click();

    return this.page
      .getByTestId(CliAuthenticationDataTestIds.ApiKeyInput)
      .inputValue();
  }
}
