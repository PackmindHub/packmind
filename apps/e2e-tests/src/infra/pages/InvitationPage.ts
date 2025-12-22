import { AbstractPackmindPage } from './AbstractPackmindPage';
import { IDashboardPage, IInvitationPage } from '../../domain/pages';
import { ActivationFormDataTestIds } from '@packmind/frontend';

export class InvitationPage
  extends AbstractPackmindPage
  implements IInvitationPage
{
  async activateAccount(password: string): Promise<IDashboardPage> {
    // Wait for the validation to complete
    await this.page.waitForSelector('text=Activate Your Account');

    await this.page
      .getByTestId(ActivationFormDataTestIds.PasswordInput)
      .fill(password);

    await this.page
      .getByTestId(ActivationFormDataTestIds.ConfirmPasswordInput)
      .fill(password);

    await this.page.getByTestId(ActivationFormDataTestIds.SubmitCTA).click();

    return this.pageFactory.getDashboardPage();
  }

  expectedUrl(): string | RegExp {
    return /\/activate\?token=/;
  }
}
